# --------------------------------------------------------------------------- Igie
# API endpoint for assigning workforce and estimated hours to project subtasks

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.crud.workforce_allocate import get_user_employee_id
from app.models import (
    Project,
    ProjectAssignment,
    ProjectSubtask,
    ProjectSubtaskAssignmentUpdate,
    ProjectSubtaskPublic,
    ProjectTask,
    Role,
)

router = APIRouter(tags=["project subtasks"])

ALLOWED_WORKFORCE_ROLES = ["admin", "project_manager"]


def check_subtask_permission(
    session: SessionDep,
    project_id: uuid.UUID,
    current_user: CurrentUser,
) -> None:
    if current_user.is_superuser:
        return

    employee_id = get_user_employee_id(session, current_user.id)

    assignment = session.exec(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.employee_id == employee_id,
        )
    ).first()

    role = session.get(Role, assignment.role_id) if assignment else None

    if role and role.role_name in ALLOWED_WORKFORCE_ROLES:
        return

    raise HTTPException(
        status_code=403,
        detail="Only SUPERUSER, admin, or project_manager can assign subtasks",
    )


def get_assignment_role_name(
    session: SessionDep,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> str:
    employee_id = get_user_employee_id(session, user_id)

    assignment = session.exec(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.employee_id == employee_id,
        )
    ).first()

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assigned user is not part of this project",
        )

    role = session.get(Role, assignment.role_id)

    if not role:
        raise HTTPException(
            status_code=404,
            detail="Assigned user role not found",
        )

    return role.role_name


@router.patch(
    "/projects/{project_id}/tasks/{task_id}/subtasks/{subtask_id}",
    response_model=ProjectSubtaskPublic,
)
def assign_subtask_workforce(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    subtask_id: uuid.UUID,
    data: ProjectSubtaskAssignmentUpdate,
    session: SessionDep,
    current_user: CurrentUser,
):
    project = session.get(Project, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = session.get(ProjectTask, task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = session.get(ProjectSubtask, subtask_id)

    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    if subtask.project_id != project_id or subtask.task_id != task_id:
        raise HTTPException(
            status_code=400,
            detail="Subtask does not belong to this project/task",
        )

    check_subtask_permission(session, project_id, current_user)

    if data.project_manager:
        role_name = get_assignment_role_name(session, project_id, data.project_manager)

        if role_name not in ["admin", "project_manager"]:
            raise HTTPException(
                status_code=400,
                detail="project_manager must have admin or project_manager role",
            )

        subtask.project_manager_id = get_user_employee_id(session, data.project_manager)

    if data.project_manager_hours is not None:
        subtask.project_manager_hours = data.project_manager_hours

    if data.draft_engineer:
        role_name = get_assignment_role_name(session, project_id, data.draft_engineer)

        if role_name != "drafter":
            raise HTTPException(
                status_code=400,
                detail="draft_engineer must have drafter role",
            )

        subtask.draft_engineer_id = get_user_employee_id(session, data.draft_engineer)

    if data.draft_engineer_hours is not None:
        subtask.draft_engineer_hours = data.draft_engineer_hours

    if data.engineer:
        role_name = get_assignment_role_name(session, project_id, data.engineer)

        if role_name != "engineer":
            raise HTTPException(
                status_code=400,
                detail="engineer must have engineer role",
            )

        subtask.engineer_id = get_user_employee_id(session, data.engineer)

    if data.engineer_hours is not None:
        subtask.engineer_hours = data.engineer_hours

    subtask.updated_at = datetime.now(timezone.utc)

    session.add(subtask)
    session.commit()
    session.refresh(subtask)

    return subtask

# --------------------------------------------------------------------------- Igie