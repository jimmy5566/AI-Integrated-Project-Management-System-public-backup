from datetime import date, datetime
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status as http_status

from app import crud
from app.api.deps import SessionDep, get_current_active_superuser, get_current_user
from app.models import (
    AssignmentWithRole,
    MaterialPublic,
    MaterialCreate,
    MaterialUpdate,
    MonthlyCountResponse,
    MonthlyInvoiceResponse,
    ProjectDetailsResponse,
    ProjectDetailWithRoles,
    ProjectMilestonePublic,
    ProjectMilestoneTreeCreate,
    ProjectMilestoneUpdate,
    ProjectPublic,
    ProjectSummary,
    ProjectTaskManagementResponse,
    ProjectTaskPublic,
    ProjectTaskTreeCreate,
    ProjectTaskTreeUpdate,
    ProjectTasksPublic,
    ProjectUpdateRequest,
    ProjectsListResponse,
    ProjectCreateRequest,
    ProjectCreateResponse,
    ProjectDetail,
    Message,
    Role,
    Subcontractor,
    SubcontractorStatus
)

router = APIRouter(
    prefix="/projects",
    tags=["projects"],
    dependencies=[Depends(get_current_user)],
)

# --- PROJECT CREATION ----
@router.post("", response_model=ProjectCreateResponse)
def create_project(project: ProjectCreateRequest, session: SessionDep) -> ProjectCreateResponse:
    existing_project = crud.get_project_by_job_number(session=session, job_number=project.job_number)
    if existing_project:
        raise HTTPException(
            status_code=409,
            detail="A project with this job_number already exists",
        )
    
    created_project = crud.create_project(session=session, project_data=project)
    return ProjectCreateResponse(project_id=created_project.id, message="Project created successfully")


# ── Static GET routes — must all come before /{project_id} ──────────────────

@router.get("", response_model=ProjectDetailsResponse)
def list_projects(session: SessionDep, status: str | None = None) -> ProjectDetailsResponse:
    projects = crud.get_projects_by_status(session=session, status=status)
    details = crud.build_project_details(session=session, projects=projects)
    return ProjectDetailsResponse(data=details, count=len(details))

# For testing purposes, will likely be removed in production
# @router.get(
#     "",
#     response_model=ProjectDetailsResponse,
# )
# def get_all_projects(
#     session: SessionDep,
#     status: str | None = None,
#     tab: str | None = None,
# ) -> ProjectDetailsResponse:
#     if tab:
#         allowed_tabs = {
#             crud.PROJECT_TAB_IN_PROGRESS,
#             crud.PROJECT_TAB_TO_BE_INVOICED,
#             crud.PROJECT_TAB_COMPLETED,
#         }
#         if tab not in allowed_tabs:
#             raise HTTPException(
#                 status_code=http_status.HTTP_400_BAD_REQUEST,
#                 detail="Invalid project tab",
#             )
#         projects = crud.get_projects_by_tab(session=session, tab=tab)
#     else:
#         projects = crud.get_projects_by_status(session=session, status=status)
#     details = crud.build_project_details(session=session, projects=projects)
#     return ProjectDetailsResponse(data=details, count=len(details))

@router.get(
    "/due-date",
    response_model=ProjectDetailsResponse,
)
def get_projects_by_due_date(
    session: SessionDep,
    start: date,
    end: date,
) -> ProjectDetailsResponse:
    projects = crud.get_projects_by_due_date(session=session, start=start, end=end)
    details = crud.build_project_details(session=session, projects=projects)
    return ProjectDetailsResponse(data=details, count=len(details))


@router.get(
    "/tasks",
    response_model=ProjectTasksPublic,
)
def get_tasks(
    session: SessionDep,
    status: str | None = None,
    start: date | None = None,
    end: date | None = None,
) -> ProjectTasksPublic:
    tasks = crud.get_tasks(session=session, status=status, start=start, end=end)
    return ProjectTasksPublic(
        data=[ProjectTaskPublic.model_validate(task) for task in tasks],
        count=len(tasks),
    )


@router.get(
    "/{project_id}/with-roles",
    response_model=ProjectDetailWithRoles,
)
def get_project_with_roles(session: SessionDep, project_id: uuid.UUID) -> ProjectDetailWithRoles:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    assignments: list[AssignmentWithRole] = []
    for assignment in project.assignments:
        if assignment.employee:
            full_name = (
                assignment.employee.full_name
                or f"{assignment.employee.first_name} {assignment.employee.last_name}".strip()
            )
            assignments.append(
                AssignmentWithRole(
                    employee_name=full_name,
                    role_name=assignment.role.role_name if assignment.role else None,
                    role_in_project=assignment.allocation_notes,
                )
            )

    return ProjectDetailWithRoles(
        project_id=project.id,
        job_number=project.job_number,
        project_name=project.project_name,
        contract_title=project.contract_title,
        agent=project.agent,
        job_title=project.job_title,
        address=project.full_address,
        company_name=project.client.company_name if project.client else None,
        company_address=project.client.billing_address if project.client else None,
        client_name=project.client.client_name if project.client else None,
        status=project.current_status.status_name if project.current_status else None,
        start_date=project.start_date,
        due_date=project.due_date,
        days_elapsed=(date.today() - project.created_at.date()).days if project.created_at else None,
        completion_percent=crud.calculate_project_completion_percent(session=session, project=project),
        is_invoiced=crud.is_project_invoiced(session=session, project=project),
        project_tab=crud.get_project_tab(session=session, project=project),
        assignments=assignments,
    )


@router.get(
    "/{project_id}/task-management",
    response_model=ProjectTaskManagementResponse,
)
def get_project_task_management(session: SessionDep, project_id: uuid.UUID) -> ProjectTaskManagementResponse:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestones = crud.get_project_task_management(session=session, project_id=project_id)
    return ProjectTaskManagementResponse(project_id=project_id, milestones=milestones)


@router.post(
    "/{project_id}/milestones",
    response_model=ProjectMilestonePublic,
    status_code=http_status.HTTP_201_CREATED,
)
def create_project_milestone(
    project_id: uuid.UUID,
    milestone: ProjectMilestoneTreeCreate,
    session: SessionDep,
) -> ProjectMilestonePublic:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    created = crud.create_project_milestone(
        session=session,
        project_id=project_id,
        milestone_data=milestone,
    )
    return ProjectMilestonePublic.model_validate(created)


@router.patch(
    "/{project_id}/milestones/{milestone_id}",
    response_model=ProjectMilestonePublic,
)
def update_project_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    milestone: ProjectMilestoneUpdate,
    session: SessionDep,
) -> ProjectMilestonePublic:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = crud.get_project_milestone(session=session, milestone_id=milestone_id)
    if not existing or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    updated = crud.update_project_milestone(
        session=session,
        milestone=existing,
        updates=milestone.model_dump(exclude_unset=True),
    )
    return ProjectMilestonePublic.model_validate(updated)


@router.delete(
    "/{project_id}/milestones/{milestone_id}",
    response_model=Message,
)
def delete_project_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    session: SessionDep,
) -> Message:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = crud.get_project_milestone(session=session, milestone_id=milestone_id)
    if not existing or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    crud.delete_project_milestone(session=session, milestone=existing)
    return Message(message="Milestone deleted successfully")


@router.post(
    "/{project_id}/milestones/{milestone_id}/tasks",
    response_model=ProjectTaskPublic,
    status_code=http_status.HTTP_201_CREATED,
)
def create_project_task(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    task: ProjectTaskTreeCreate,
    session: SessionDep,
) -> ProjectTaskPublic:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = crud.get_project_milestone(session=session, milestone_id=milestone_id)
    if not milestone or milestone.project_id != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    if task.parent_task_id:
        parent_task = crud.get_project_task(session=session, task_id=task.parent_task_id)
        if not parent_task or parent_task.milestone_id != milestone_id:
            raise HTTPException(status_code=400, detail="Parent task must belong to the same milestone")
    if task.assigned_role_id and not session.get(Role, task.assigned_role_id):
        raise HTTPException(status_code=404, detail="Assigned role not found")

    created = crud.create_project_task(
        session=session,
        milestone_id=milestone_id,
        task_data=task,
    )
    return ProjectTaskPublic.model_validate(created)


@router.delete(
    "/{project_id}/milestones/{milestone_id}/tasks/{task_id}",
    response_model=Message,
)
def delete_project_task(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    task_id: uuid.UUID,
    session: SessionDep,
) -> Message:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = crud.get_project_milestone(session=session, milestone_id=milestone_id)
    if not milestone or milestone.project_id != project_id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    existing = crud.get_project_task(session=session, task_id=task_id)
    if not existing or existing.milestone_id != milestone_id:
        raise HTTPException(status_code=404, detail="Task not found")

    crud.delete_project_task(session=session, task=existing)
    return Message(message="Task deleted successfully")


@router.patch(
    "/{project_id}/tasks/{task_id}",
    response_model=ProjectTaskPublic,
)
def update_project_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    task: ProjectTaskTreeUpdate,
    session: SessionDep,
) -> ProjectTaskPublic:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = crud.get_project_task(session=session, task_id=task_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")

    milestone = crud.get_project_milestone(session=session, milestone_id=existing.milestone_id)
    if not milestone or milestone.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.parent_task_id:
        parent_task = crud.get_project_task(session=session, task_id=task.parent_task_id)
        if not parent_task or parent_task.milestone_id != existing.milestone_id:
            raise HTTPException(status_code=400, detail="Parent task must belong to the same milestone")
        if parent_task.id == existing.id:
            raise HTTPException(status_code=400, detail="Task cannot be its own parent")
    if task.assigned_role_id and not session.get(Role, task.assigned_role_id):
        raise HTTPException(status_code=404, detail="Assigned role not found")

    updated = crud.update_project_task(
        session=session,
        task=existing,
        updates=task.model_dump(exclude_unset=True),
    )
    return ProjectTaskPublic.model_validate(updated)


@router.delete("/{project_id}")
def delete_project(project_id: uuid.UUID, session: SessionDep):
    if not crud.delete_project(session=session, project_id=project_id):
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found")
    return {"message": "Project deleted successfully"}

@router.delete("")
def delete_all_projects(session: SessionDep):
    count = crud.delete_all_projects(session=session)
    return {"message": f"Successfully deleted {count} projects"}



@router.patch("/{project_id}", response_model=ProjectPublic)
def update_project(
    project_id: uuid.UUID,
    project: ProjectUpdateRequest,
    session: SessionDep,
) -> ProjectPublic:
    existing = crud.get_project_by_id(session=session, project_id=project_id)
    if not existing:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    existing = crud.get_project_by_id(session=session, project_id=project_id)  # Assuming you add this
    updated = crud.update_project(session=session, project=existing, updates=project.model_dump(exclude_unset=True))
    return ProjectPublic.model_validate(updated)

    # try:
    #     crud.update_project(session=session, project_id=project_id, project_data=project)
    # except ValueError as exc:
    #     raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # return Message(message="Project updated successfully")


@router.get("/{project_id}/materials/{material_id}", response_model=MaterialPublic)
def get_material(
    project_id: uuid.UUID,
    material_id: uuid.UUID,
    session: SessionDep,
) -> MaterialPublic:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    material = crud.get_material(session=session, material_id=material_id)
    if not material or material.project_id != project_id:
        raise HTTPException(status_code=404, detail="Material not found")

    return MaterialPublic.model_validate(material)

@router.get("/{project_id}/materials", response_model=list[MaterialPublic], status_code=http_status.HTTP_200_OK)
def get_materials_from_project(project_id: uuid.UUID, session: SessionDep) -> list[MaterialPublic]:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    materials = crud.get_materials_by_project_id(session=session, project_id=project_id)
    return [MaterialPublic.model_validate(material) for material in materials]

@router.post("/{project_id}/materials", response_model=MaterialPublic, status_code=http_status.HTTP_201_CREATED)
def create_material_for_project(project_id: uuid.UUID, material: MaterialCreate, session: SessionDep) -> MaterialPublic:
    # Add validation for subcontractor_id if provided
    if material.subcontractor_id and not session.get(Subcontractor, material.subcontractor_id):
        raise HTTPException(status_code=404, detail="Subcontractor not found")
    created = crud.create_material(session=session, project_id=project_id, material_data=material)
    return MaterialPublic.model_validate(created)

@router.patch("/{project_id}/materials/{material_id}", response_model=MaterialPublic)
def update_material_for_project(project_id: uuid.UUID, material_id: uuid.UUID, material: MaterialUpdate, session: SessionDep) -> MaterialPublic:
    # Add validation for subcontractor_id if provided
    available_statuses = crud.get_material_statuses(session=session)
    if material.status and material.status not in available_statuses:
        raise HTTPException(status_code=400, detail="Please choose a valid material status: " + ", ".join(available_statuses))

    if material.subcontractor_id and not session.get(Subcontractor, material.subcontractor_id):
        raise HTTPException(status_code=404, detail="Subcontractor not found")
    
    existing = crud.get_material(session=session, material_id=material_id)  # Assuming you add this
    updated = crud.update_material(session=session, material=existing, updates=material.model_dump(exclude_unset=True))
    return MaterialPublic.model_validate(updated)


@router.delete("/{project_id}/materials/{material_id}", response_model=Message)
def delete_material_from_project(project_id: uuid.UUID, material_id: uuid.UUID, session: SessionDep) -> Message:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found") 
    material = crud.get_material(session=session, material_id=material_id)
    if not material or material.project_id != project_id:
        raise HTTPException(status_code=404, detail="Material not found")
    crud.delete_material(session=session, material=material)
    return Message(message="Material deleted successfully")

# --------------------------------


@router.get(
    "/all-project",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ProjectsListResponse,
)
def get_all_active_projects(session: SessionDep) -> Any:
    projects = crud.get_all_active_projects(session=session)
    summaries = crud.build_project_summaries(session=session, projects=projects)
    return ProjectsListResponse(data=summaries, count=len(summaries))


@router.get(
    "/delay-project",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=ProjectsListResponse,
)
def get_delayed_projects(session: SessionDep) -> Any:
    projects = crud.get_delayed_projects(session=session)
    summaries = crud.build_project_summaries(session=session, projects=projects)
    return ProjectsListResponse(data=summaries, count=len(summaries))


@router.get(
    "/current-project-num",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=MonthlyCountResponse,
)
def get_current_project_count(session: SessionDep) -> Any:
    today = date.today()
    cur_start, cur_end = crud.month_bounds(today.year, today.month)
    prev_start, prev_end = crud.month_bounds(*crud.prev_month(today.year, today.month))
    return MonthlyCountResponse(
        current_month=crud.count_active_projects(session=session, start=cur_start, end=cur_end),
        previous_month=crud.count_active_projects(session=session, start=prev_start, end=prev_end),
    )


@router.get(
    "/completed-project",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=MonthlyCountResponse,
)
def get_completed_project_count(session: SessionDep) -> Any:
    today = date.today()
    cur_start, cur_end = crud.month_bounds(today.year, today.month)
    prev_start, prev_end = crud.month_bounds(*crud.prev_month(today.year, today.month))
    return MonthlyCountResponse(
        current_month=crud.count_completed_projects(session=session, start=cur_start, end=cur_end),
        previous_month=crud.count_completed_projects(session=session, start=prev_start, end=prev_end),
    )


@router.get(
    "/invoice-bill",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=MonthlyInvoiceResponse,
)
def get_invoice_bill(session: SessionDep) -> Any:
    today = date.today()
    cur_start, cur_end = crud.month_bounds(today.year, today.month)
    prev_start, prev_end = crud.month_bounds(*crud.prev_month(today.year, today.month))
    return MonthlyInvoiceResponse(
        current_month_total=crud.sum_invoices(session=session, start=cur_start, end=cur_end),
        previous_month_total=crud.sum_invoices(session=session, start=prev_start, end=prev_end),
    )


@router.get("/overdue", response_model=ProjectDetailsResponse)
def get_overdue_projects(session: SessionDep) -> Any:
    projects = crud.get_overdue_projects(session=session)
    details = crud.build_project_details(session=session, projects=projects)
    return ProjectDetailsResponse(data=details, count=len(details))


@router.get("/expected-to-finish/{date_str}", response_model=ProjectDetailsResponse)
def get_projects_expected_to_finish(session: SessionDep, date_str: str) -> Any:
    try:
        due_by = datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use dd-mm-yyyy")
    projects = crud.get_projects_expected_by_date(session=session, due_by=due_by)
    details = crud.build_project_details(session=session, projects=projects)
    return ProjectDetailsResponse(data=details, count=len(details))


# ── Dynamic routes — /{project_id} must come after all static paths ──────────

@router.get("/{project_id}", response_model=ProjectDetail)
def get_project_by_id(session: SessionDep, project_id: uuid.UUID) -> ProjectDetail:
    project = crud.get_project_by_id(session=session, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectDetail(
        project_id=project.id,
        job_number=project.job_number,
        project_name=project.project_name,
        company_name=project.client.company_name if project.client else None,
        company_address=project.client.billing_address if project.client else None,
        client_name=project.client.client_name if project.client else None,
        status=project.current_status.status_name if project.current_status else None,
        start_date=project.start_date,
        due_date=project.due_date,
        days_elapsed=(date.today() - project.created_at.date()).days if project.created_at else None,
        fee_estimate=project.fee_final,
    )


@router.patch("/{project_id}", response_model=Message)
def update_project(
    project_id: uuid.UUID,
    project: ProjectUpdateRequest,
    session: SessionDep,
) -> Message:
    existing = crud.get_project_by_id(session=session, project_id=project_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    try:
        crud.update_project(session=session, project_id=project_id, project_data=project)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return Message(message="Project updated successfully")


@router.delete("/{project_id}")
def delete_project(project_id: uuid.UUID, session: SessionDep):
    if not crud.delete_project(session=session, project_id=project_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return {"message": "Project deleted successfully"}


@router.delete("")
def delete_all_projects(session: SessionDep):
    count = crud.delete_all_projects(session=session)
    return {"message": f"Successfully deleted {count} projects"}
