import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlmodel import Session, col, func, or_, select

from app.crud.project_statuses import get_status_type
from app.models import (
    Client,
    Employee,
    Invoice,
    Material,
    MaterialCreate,
    Project,
    ProjectAssignment,
    ProjectCreateRequest,
    ProjectDetail,
    ProjectMilestone,
    ProjectMilestoneNode,
    ProjectMilestoneTreeCreate,
    ProjectStatusType,
    ProjectSummary,
    ProjectTask,
    ProjectTaskNode,
    ProjectTaskTreeCreate,
    ProjectUpdateRequest,
)

DEFAULT_MAIN_TASKS = (
    "Preliminary Design & Documentation",
    "Design & Documentation",
)

DEFAULT_MATERIALS = (
    "Soil Testing",
    "Survey",
    "Timber Framing",
)

PROJECT_TAB_IN_PROGRESS = "in_progress"
PROJECT_TAB_TO_BE_INVOICED = "to_be_invoiced"
PROJECT_TAB_COMPLETED = "completed"

COMPLETED_TASK_STATUSES = {"complete", "completed", "done"}

def get_or_create_client(
    *, session: Session, client_name: str, company_name: str | None, contact_email: str | None, billing_address: str | None
) -> Client:
    client = session.exec(select(Client).where(Client.client_name == client_name and Client.company_name == company_name)).first()
    if client:
        return client

    client = Client(
        client_name=client_name,
        contact_email=contact_email,
        company_name=company_name,
        billing_address=billing_address,
    )

    session.add(client)
    session.commit()
    session.refresh(client)
    return client

def get_project_by_job_number(*, session: Session, job_number: str) -> Project | None:
    return session.exec(select(Project).where(Project.job_number == job_number)).first()

def get_project_by_id(*, session: Session, project_id: uuid.UUID) -> Project | None:
    return session.get(Project, project_id)

def get_all_projects(*, session: Session) -> list[Project]:
    return list(
        session.exec(
            select(Project)
            .order_by(col(Project.created_at).desc())
        ).all()
    )

def get_projects_by_due_date(*, session: Session, start: date, end: date) -> list[Project]:
    return list(
        session.exec(
            select(Project)
            .where(Project.due_date >= start)
            .where(Project.due_date <= end)
            .order_by(col(Project.due_date))
        ).all()
    )

def create_project(*, session: Session, project_data: ProjectCreateRequest) -> Project:
    client = get_or_create_client(
        session=session,
        client_name=project_data.client_name,
        company_name=project_data.client_company,
        contact_email=project_data.client_contact,
        billing_address=project_data.client_address,
    )

    status_type = get_status_type(session=session, status_name="prelim")

    project = Project(
        job_number=project_data.job_number,
        client_id=client.id,
        current_status_id=status_type.id,
        project_name=project_data.project_name,
        contract_title=project_data.contract_title,
        agent=project_data.agent,
        job_title=project_data.job_title,
        project_type=project_data.project_types,
        full_address=project_data.address or project_data.client_address,
        date_received=project_data.date_received,
        fee_final=project_data.fee_estimate,
        start_date=project_data.start_date,
        due_date=project_data.due_date,
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    create_default_project_task_structure(session=session, project=project, project_data=project_data)
    return project


def percent_complete(completed: int, total: int) -> Decimal:
    if total <= 0:
        return Decimal("0")
    return (Decimal(completed) * Decimal("100") / Decimal(total)).quantize(Decimal("0.01"))


def calculate_project_completion_percent(*, session: Session, project: Project) -> Decimal:
    if project.completion_date:
        return Decimal("100")

    tasks = list(
        session.exec(
            select(ProjectTask)
            .join(ProjectMilestone, ProjectMilestone.id == ProjectTask.milestone_id)
            .where(ProjectMilestone.project_id == project.id)
            .where(ProjectTask.is_excluded.is_(False))
        ).all()
    )
    if tasks:
        completed_tasks = sum(
            1
            for task in tasks
            if task.completion_date
            or (task.milestone_status or "").strip().lower() in COMPLETED_TASK_STATUSES
        )
        return percent_complete(completed_tasks, len(tasks))

    milestones = list(
        session.exec(
            select(ProjectMilestone).where(ProjectMilestone.project_id == project.id)
        ).all()
    )
    if milestones:
        completed_milestones = sum(
            1 for milestone in milestones if milestone.is_complete or milestone.completion_date
        )
        return percent_complete(completed_milestones, len(milestones))

    return Decimal("0")


def is_project_invoiced(*, session: Session, project: Project) -> bool:
    status_name = project.current_status.status_name if project.current_status else None
    if status_name == "completed & invoiced":
        return True
    if project.invoice_amount and project.invoice_amount > 0:
        return True
    invoice_count = session.exec(
        select(func.count()).select_from(Invoice).where(Invoice.project_id == project.id)
    ).one()
    return invoice_count > 0


def get_project_tab(*, session: Session, project: Project) -> str:
    completion_percent = calculate_project_completion_percent(session=session, project=project)
    if completion_percent < Decimal("100"):
        return PROJECT_TAB_IN_PROGRESS
    if is_project_invoiced(session=session, project=project):
        return PROJECT_TAB_COMPLETED
    return PROJECT_TAB_TO_BE_INVOICED


def midpoint_date(start: date, end: date) -> date:
    return start + timedelta(days=(end - start).days // 2)


def create_default_project_task_structure(
    *, session: Session, project: Project, project_data: ProjectCreateRequest
) -> None:
    preliminary_due_date = (
        project_data.preliminary_due_date
        or midpoint_date(project_data.start_date, project_data.due_date)
    )
    design_due_date = project_data.design_due_date or project_data.due_date

    default_milestones = (
        (DEFAULT_MAIN_TASKS[0], preliminary_due_date, 1),
        (DEFAULT_MAIN_TASKS[1], design_due_date, 2),
    )

    for milestone_name, due_date_value, display_order in default_milestones:
        milestone = ProjectMilestone(
            project_id=project.id,
            milestone_name=milestone_name,
            due_date=due_date_value,
            display_order=display_order,
        )
        session.add(milestone)

    for material_name in DEFAULT_MATERIALS:
        session.add(
            Material(
                project_id=project.id,
                name=material_name,
                # Add any other default fields if needed (e.g., unit="pieces", quantity=Decimal("1"))
            )
        )

    session.commit()

def create_material(*, session: Session, project_id: uuid.UUID, material_data: MaterialCreate) -> Material:
    material = Material.model_validate(material_data, update={"project_id": project_id})
    session.add(material)
    session.commit()
    session.refresh(material)
    return material

def update_material(*, session: Session, material: Material, updates: dict) -> Material:
    material.sqlmodel_update(updates)
    session.add(material)
    session.commit()
    session.refresh(material)
    return material

def delete_material(*, session: Session, material: Material) -> None:
    session.delete(material)
    session.commit()

def get_material(*, session: Session, material_id: uuid.UUID) -> Material | None:
    return session.get(Material, material_id)

def get_materials_by_project_id(*, session: Session, project_id: uuid.UUID) -> list[Material]:
    return list(session.exec(select(Material).where(Material.project_id == project_id)).all())

def build_project_details(*, session: Session, projects: list[Project]) -> list[ProjectDetail]:
    today = date.today()
    result = []
    for p in projects:
        client = session.get(Client, p.client_id) if p.client_id else None
        days = (today - p.start_date).days if p.start_date else None
        result.append(
            ProjectDetail(
                project_id=p.id,
                job_number=p.job_number,
                project_name=p.project_name,
                contract_title=p.contract_title,
                agent=p.agent,
                job_title=p.job_title,
                address=p.full_address,
                company_name=p.client.company_name if client else None,
                company_address=p.client.billing_address if client else None,
                client_name=p.client.client_name if client else None,
                status=p.current_status.status_name if p.current_status else None,
                start_date=p.start_date,
                due_date=p.due_date,
                date_received=p.created_at.date() if p.created_at else None,
                days_elapsed=days,
                completion_percent=calculate_project_completion_percent(session=session, project=p),
                is_invoiced=is_project_invoiced(session=session, project=p),
                project_tab=get_project_tab(session=session, project=p),
                fee_estimate=p.fee_final,
            )
        )
    return result


def get_project_milestone(*, session: Session, milestone_id: uuid.UUID) -> ProjectMilestone | None:
    return session.get(ProjectMilestone, milestone_id)


def get_project_task(*, session: Session, task_id: uuid.UUID) -> ProjectTask | None:
    return session.get(ProjectTask, task_id)


def create_project_milestone(
    *, session: Session, project_id: uuid.UUID, milestone_data: ProjectMilestoneTreeCreate
) -> ProjectMilestone:
    milestone = ProjectMilestone.model_validate(
        milestone_data,
        update={"project_id": project_id},
    )
    session.add(milestone)
    session.commit()
    session.refresh(milestone)
    return milestone


def update_project_milestone(
    *, session: Session, milestone: ProjectMilestone, updates: dict
) -> ProjectMilestone:
    milestone.sqlmodel_update(updates)
    session.add(milestone)
    session.commit()
    session.refresh(milestone)
    return milestone


def delete_project_milestone(*, session: Session, milestone: ProjectMilestone) -> None:
    session.delete(milestone)
    session.commit()


def create_project_task(
    *,
    session: Session,
    milestone_id: uuid.UUID,
    task_data: ProjectTaskTreeCreate,
) -> ProjectTask:
    task = ProjectTask.model_validate(
        task_data,
        update={"milestone_id": milestone_id},
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def update_project_task(*, session: Session, task: ProjectTask, updates: dict) -> ProjectTask:
    task.sqlmodel_update(updates)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

def get_tasks(
    *,
    session: Session,
    start: date | None = None,
    end: date | None = None,
    status: str | None = None,
) -> list[ProjectTask]:
    query = select(ProjectTask)
    if start is not None:
        query = query.where(ProjectTask.due_date >= start)
    if end is not None:
        query = query.where(ProjectTask.due_date <= end)
    if status is not None:
        query = query.where(func.lower(ProjectTask.milestone_status) == status.lower())

    return list(
        session.exec(
            query.order_by(col(ProjectTask.due_date), col(ProjectTask.created_at))
        ).all()
    )

def build_task_tree(*, tasks: list[ProjectTask]) -> list[ProjectTaskNode]:
    nodes = {
        task.id: ProjectTaskNode(
            id=task.id,
            milestone_id=task.milestone_id,
            parent_task_id=task.parent_task_id,
            task_name=task.task_name,
            task_description=task.task_description,
            due_date=task.due_date,
            milestone_status=task.milestone_status,
            core_phase_name=task.core_phase_name,
            assigned_role_id=task.assigned_role_id,
            assigned_role_name=task.assigned_role.role_name if getattr(task, "assigned_role", None) else None,
            allocated_hours=task.allocated_hours,
            completion_date=task.completion_date,
            invoice_amount=task.invoice_amount,
            fee_final=task.fee_final,
            is_excluded=task.is_excluded,
            paid_date=task.paid_date,
        )
        for task in tasks
    }

    roots: list[ProjectTaskNode] = []
    sorted_tasks = sorted(
        tasks,
        key=lambda task: (
            task.parent_task_id is not None,
            task.due_date or date.max,
            task.created_at or datetime.min,
            task.task_name.lower(),
        ),
    )

    for task in sorted_tasks:
        node = nodes[task.id]
        if task.parent_task_id and task.parent_task_id in nodes:
            nodes[task.parent_task_id].children.append(node)
        else:
            roots.append(node)

    return roots


def get_project_task_management(*, session: Session, project_id: uuid.UUID) -> list[ProjectMilestoneNode]:
    milestones = list(
        session.exec(
            select(ProjectMilestone)
            .where(ProjectMilestone.project_id == project_id)
            .order_by(
                col(ProjectMilestone.display_order),
                col(ProjectMilestone.created_at),
            )
        ).all()
    )

    task_rows = list(
        session.exec(
            select(ProjectTask)
            .join(ProjectMilestone, ProjectMilestone.id == ProjectTask.milestone_id)
            .where(ProjectMilestone.project_id == project_id)
            .order_by(col(ProjectTask.created_at))
        ).all()
    )
    tasks_by_milestone: dict[uuid.UUID, list[ProjectTask]] = {}
    for task in task_rows:
        tasks_by_milestone.setdefault(task.milestone_id, []).append(task)

    return [
        ProjectMilestoneNode(
            id=milestone.id,
            project_id=milestone.project_id,
            milestone_name=milestone.milestone_name,
            description_type=milestone.description_type,
            due_date=milestone.due_date,
            completion_date=milestone.completion_date,
            is_complete=milestone.is_complete,
            progress=milestone.progress,
            display_order=milestone.display_order,
            tasks=build_task_tree(tasks=tasks_by_milestone.get(milestone.id, [])),
        )
        for milestone in milestones
    ]

def delete_project_task(*, session: Session, task: ProjectTask) -> None:
    session.delete(task)
    session.commit()


def get_projects_by_status(*, session: Session, status: str | None = None) -> list[Project]:
    query = select(Project)
    if status:
        query = query.join(ProjectStatusType).where(ProjectStatusType.status_name == status)
    return list(session.exec(query.order_by(col(Project.created_at).desc())).all())


def get_projects_by_tab(*, session: Session, tab: str) -> list[Project]:
    projects = get_all_active_projects(session=session)
    return [
        project
        for project in projects
        if get_project_tab(session=session, project=project) == tab
    ]


def delete_project(*, session: Session, project_id: uuid.UUID) -> bool:
    project = session.get(Project, project_id)
    if not project:
        return False
    session.delete(project)
    session.commit()
    return True

def delete_all_projects(*, session: Session) -> int:
    deleted = session.exec(select(Project)).all()
    count = len(deleted)
    for project in deleted:
        session.delete(project)
    session.commit()
    return count


# def update_material(*, session: Session, material: Material, updates: dict) -> Material:
#     material.sqlmodel_update(updates)
#     session.add(material)
#     session.commit()
#     session.refresh(material)
#     return material


def update_project(*, session: Session, project: Project, updates: dict) -> Project:
    project.sqlmodel_update(updates)
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


# def update_project_new(*, session: Session, project_id: uuid.UUID, project_data: ProjectUpdateRequest) -> Project | None:
#     project = session.get(Project, project_id)
#     if not project:
#         return None

#     if project_data.status is not None:
#         status_type = get_status_type(session=session, status_name=project_data.status)

#         if not status_type:
#             raise ValueError(f"Status type '{project_data.status}' does not exist.")
#         project.current_status_id = status_type.id

#     if project_data.project_name is not None:
#         project.project_name = project_data.project_name
#     if project_data.contract_title is not None:
#         project.contract_title = project_data.contract_title
#     if project_data.agent is not None:
#         project.agent = project_data.agent
#     if project_data.job_title is not None:
#         project.job_title = project_data.job_title
#     if project_data.address is not None:
#         project.full_address = project_data.address
#     if project_data.project_types is not None:
#         project.project_type = project_data.project_types
#     if project_data.date_received is not None:
#         project.date_received = project_data.date_received
#     if project_data.start_date is not None:
#         project.start_date = project_data.start_date
#     if project_data.due_date is not None:
#         project.due_date = project_data.due_date
#     if project_data.fee_estimate is not None:
#         project.fee_final = project_data.fee_estimate

#     session.add(project)
#     session.commit()
#     session.refresh(project)
#     return project

# --------------------------------

def month_bounds(year: int, month: int) -> tuple[date, date]:
    _, last_day = monthrange(year, month)
    return date(year, month, 1), date(year, month, last_day)


def prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def get_project_manager(*, session: Session, project_id: uuid.UUID) -> str | None:
    employees = session.exec(
        select(Employee)
        .join(ProjectAssignment, ProjectAssignment.employee_id == Employee.id)
        .where(ProjectAssignment.project_id == project_id)
    ).all()
    if not employees:
        return None
    for emp in employees:
        if emp.role_title and "manager" in emp.role_title.lower():
            return emp.full_name or f"{emp.first_name} {emp.last_name}".strip()
    emp = employees[0]
    return emp.full_name or f"{emp.first_name} {emp.last_name}".strip()


def build_project_summaries(*, session: Session, projects: list[Project]) -> list[ProjectSummary]:
    today = date.today()
    result = []
    for p in projects:
        client = session.get(Client, p.client_id) if p.client_id else None
        days = (today - p.start_date).days if p.start_date else None
        result.append(
            ProjectSummary(
                project_id=p.id,
                project_name=p.project_name,
                client_name=client.client_name if client else None,
                project_manager_name=get_project_manager(session=session, project_id=p.id),
                days_since_started=days,
            )
        )
    return result


def get_all_active_projects(*, session: Session) -> list[Project]:
    return list(
        session.exec(
            select(Project)
            .where(Project.is_active.is_(True))
            .order_by(col(Project.created_at).desc())
        ).all()
    )


def get_delayed_projects(*, session: Session) -> list[Project]:
    today = date.today()
    delayed_ids = session.exec(
        select(ProjectMilestone.project_id)
        .where(ProjectMilestone.due_date < today)
        .where(ProjectMilestone.is_complete.is_(False))
        .distinct()
    ).all()
    if not delayed_ids:
        return []
    return list(
        session.exec(
            select(Project)
            .where(col(Project.id).in_(delayed_ids))
            .where(Project.is_active.is_(True))
            .order_by(col(Project.created_at).desc())
        ).all()
    )


def get_overdue_projects(*, session: Session) -> list[Project]:
    today = date.today()
    return list(
        session.exec(
            select(Project)
            .where(Project.is_active == True)
            .where(Project.due_date < today)
            .where(Project.completion_date == None)
            .order_by(col(Project.due_date).asc())
        ).all()
    )


def get_projects_expected_by_date(*, session: Session, due_by: date) -> list[Project]:
    return list(
        session.exec(
            select(Project)
            .where(Project.is_active == True)
            .where(Project.due_date <= due_by)
            .where(Project.completion_date == None)
            .order_by(col(Project.due_date).asc())
        ).all()
    )


def count_active_projects(*, session: Session, start: date, end: date) -> int:
    return session.exec(
        select(func.count())
        .select_from(Project)
        .where(Project.is_active.is_(True))
        .where(Project.start_date <= end)
        .where(or_(Project.completion_date.is_(None), Project.completion_date >= start))
    ).one()


def count_completed_projects(*, session: Session, start: date, end: date) -> int:
    return session.exec(
        select(func.count())
        .select_from(Project)
        .where(Project.completion_date >= start)
        .where(Project.completion_date <= end)
    ).one()


def sum_invoices(*, session: Session, start: date, end: date) -> Decimal:
    total = session.exec(
        select(func.sum(Invoice.invoice_amount))
        .where(Invoice.invoice_date >= start)
        .where(Invoice.invoice_date <= end)
    ).one()
    return total or Decimal("0")
