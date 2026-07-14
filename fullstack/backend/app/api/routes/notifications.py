from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlmodel import Session, select
from sqlalchemy import or_

from app.api.deps import get_current_active_superuser, get_db
from app.core.config import settings
from app.models import (
    Message, 
    Project, 
    ProjectMilestone, 
    ProjectTask, 
    ProjectStatus
)
# Ensure we are importing from the correct logic file
from app.utils import send_email, render_email_template, EmailData

router = APIRouter(prefix="/notifications", tags=["notifications"])

def generate_due_reminder_email(
    items_data: list, 
    reminder_type: str = "Deadline Alert"
) -> EmailData:
    """
    Generate an HTML email for due date reminders using a table structure.
    """
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - {reminder_type}"
    
    table_rows = "".join([
        f"<tr>"
        f"<td style='padding:8px; border:1px solid #ddd;'>{item['name']}</td>"
        f"<td style='padding:8px; border:1px solid #ddd;'>{item['category']}</td>"
        f"<td style='padding:8px; border:1px solid #ddd;'>{item['date']}</td>"
        f"<td style='padding:8px; border:1px solid #ddd;'>{item['days_left']} days</td>"
        f"</tr>" for item in items_data
    ])

    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2>{project_name} Due Date Reminders</h2>
            <p>The following items are approaching their deadlines (14, 7, 3, or 0 days remaining):</p>
            <table style='border-collapse: collapse; width: 100%; border: 1px solid #ddd;'>
                <thead>
                    <tr style='background-color: #f2f2f2;'>
                        <th style='padding:8px; border:1px solid #ddd; text-align:left;'>Name</th>
                        <th style='padding:8px; border:1px solid #ddd; text-align:left;'>Type</th>
                        <th style='padding:8px; border:1px solid #ddd; text-align:left;'>Due Date</th>
                        <th style='padding:8px; border:1px solid #ddd; text-align:left;'>Remaining</th>
                    </tr>
                </thead>
                <tbody>{table_rows}</tbody>
            </table>
        </body>
    </html>
    """
    return EmailData(html_content=html_content, subject=subject)

@router.post(
    "/trigger-reminders/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=202,
    response_model=Message
)
def trigger_due_reminders(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Message:
    """
    Detect upcoming deadlines and trigger notifications via background tasks.
    """
    try:
        today = date.today()
        target_dates = [today + timedelta(days=i) for i in [0, 3, 7, 14]]
        reminder_list = []

        # 1. Projects
        excluded_statuses = [ProjectStatus.completed_invoiced.value, ProjectStatus.hold.value]
        project_stmt = select(Project).where(
            Project.due_date.in_(target_dates),
            Project.is_active == True
        )
        for p in db.exec(project_stmt).all():
            if p.current_status and p.current_status.status_name not in excluded_statuses:
                reminder_list.append({
                    "name": p.project_name or p.job_number,
                    "category": "Project",
                    "date": str(p.due_date),
                    "days_left": (p.due_date - today).days
                })

        # 2. Milestones
        #ms_stmt = select(ProjectMilestone).where(
        #    ProjectMilestone.due_date.in_(target_dates),
        #    ProjectMilestone.is_complete == False
        #)
        #for m in db.exec(ms_stmt).all():
        #    reminder_list.append({
        #        "name": m.milestone_name, "category": "Milestone",
        #        "date": str(m.due_date), "days_left": (m.due_date - today).days
        #    })

        # 3. Tasks
        #task_stmt = select(ProjectTask).where(
        #    ProjectTask.due_date.in_(target_dates),
        #    ProjectTask.completion_date == None
        #)
        #for t in db.exec(task_stmt).all():
        #    reminder_list.append({
        #        "name": t.task_name, "category": "Task",
        #        "date": str(t.due_date), "days_left": (t.due_date - today).days
        #    })

        if not reminder_list:
            return Message(message="No items matching the scheduled intervals for today.")

        if settings.emails_enabled:
            email_data = generate_due_reminder_email(items_data=reminder_list)
            background_tasks.add_task(
                send_email,
                email_to=settings.FIRST_SUPERUSER,
                subject=email_data.subject,
                html_content=email_data.html_content
            )
            return Message(message=f"Success: {len(reminder_list)} reminders queued.")
        
        return Message(message=f"Found {len(reminder_list)} items, but email service is disabled.")

    except Exception as e:
        # Catch unexpected errors to prevent silent 500s
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")