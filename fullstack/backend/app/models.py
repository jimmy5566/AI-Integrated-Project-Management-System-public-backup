import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum

from pydantic import EmailStr
from sqlalchemy import DateTime, Text, Column
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy.types import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from enum import Enum

def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Lookup / Role  (no FK dependencies — must be first)
# ---------------------------------------------------------------------------

class RoleBase(SQLModel):
    role_name: str = Field(unique=True, max_length=100)
    description: str | None = Field(default=None, sa_type=Text)
    is_active: bool = True


class RoleCreate(RoleBase):
    pass


class RoleUpdate(SQLModel):
    role_name: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None)
    is_active: bool | None = None


class Role(RoleBase, table=True):
    __tablename__ = "roles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    employees: list["Employee"] = Relationship(back_populates="role")
    subcontractors: list["Subcontractor"] = Relationship(back_populates="role")
    project_tasks: list["ProjectTask"] = Relationship(back_populates="assigned_role")
    project_assignments: list["ProjectAssignment"] = Relationship(back_populates="role")


class RolePublic(RoleBase):
    id: uuid.UUID
    created_at: datetime | None = None


class RolesPublic(SQLModel):
    data: list[RolePublic]
    count: int


# ---------------------------------------------------------------------------
# Project Status Types  (no FK dependencies)
# ---------------------------------------------------------------------------

class ProjectStatusTypeBase(SQLModel):
    status_name: str = Field(unique=True, max_length=100)
    description: str | None = Field(default=None, sa_type=Text)
    is_active: bool = True


class ProjectStatus(str, Enum):
    proposal = "proposal"
    prelim = "prelim"
    design_doc = "design & doc"
    amendment = "amendment"
    hold = "hold"
    to_be_invoiced = "to be invoiced"
    completed_invoiced = "completed & invoiced"
    eng_qa = "Eng/QA Review"
    construction = "construction"
    blank = "-"


class SubcontractorStatus(str, Enum):
    not_applicable = "N/A"
    ordered = "ordered"
    received = "received"
    by_client = "by client"


class ProjectStatusTypeCreate(ProjectStatusTypeBase):
    pass


class ProjectStatusTypeUpdate(SQLModel):
    status_name: str | None = Field(default=None, max_length=100)
    description: str | None = None
    is_active: bool | None = None


class ProjectStatusType(ProjectStatusTypeBase, table=True):
    __tablename__ = "project_status_types"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    projects: list["Project"] = Relationship(back_populates="current_status")


class ProjectStatusTypePublic(ProjectStatusTypeBase):
    id: uuid.UUID


class ProjectStatusTypesPublic(SQLModel):
    data: list[ProjectStatusTypePublic]
    count: int


# ---------------------------------------------------------------------------
# Clients  (no FK dependencies)
# ---------------------------------------------------------------------------

class ClientBase(SQLModel):
    client_name: str = Field(max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)
    billing_address: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, sa_type=Text)


class ClientCreate(ClientBase):
    pass


class ClientUpdate(SQLModel):
    client_name: str | None = Field(default=None, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)
    billing_address: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class Client(ClientBase, table=True):
    __tablename__ = "clients"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    projects: list["Project"] = Relationship(back_populates="client")


class ClientPublic(ClientBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ClientsPublic(SQLModel):
    data: list[ClientPublic]
    count: int


# ---------------------------------------------------------------------------
# Employees  (FK -> roles)
# ---------------------------------------------------------------------------

class EmployeeBase(SQLModel):
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    role_title: str | None = Field(default=None, max_length=100)
    role_id: uuid.UUID | None = Field(default=None, foreign_key="roles.id")
    is_active: bool = True


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(SQLModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    role_title: str | None = Field(default=None, max_length=100)
    role_id: uuid.UUID | None = None
    is_active: bool | None = None


class Employee(EmployeeBase, table=True):
    __tablename__ = "employees"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    role: Role | None = Relationship(back_populates="employees")
    project_assignments: list["ProjectAssignment"] = Relationship(back_populates="employee")
    notification_preferences: list["NotificationPreference"] = Relationship(back_populates="employee")

    # Two FKs from time_logs point to employees (employee_id + approved_by_id).
    # Use raw SA relationship with explicit foreign_keys to disambiguate.
    time_logs: list["TimeLog"] = Relationship(
        sa_relationship=relationship(
            "TimeLog",
            primaryjoin="TimeLog.employee_id == Employee.id",
            foreign_keys="[TimeLog.employee_id]",
            back_populates="employee",
        )
    )


class EmployeePublic(EmployeeBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class EmployeesPublic(SQLModel):
    data: list[EmployeePublic]
    count: int


# ---------------------------------------------------------------------------
# Subcontractors  (FK -> roles)
# ---------------------------------------------------------------------------

class SubcontractorBase(SQLModel):
    company_name: str = Field(max_length=255)
    contact_name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    specialty: str | None = Field(default=None, max_length=255)
    role_id: uuid.UUID | None = Field(default=None, foreign_key="roles.id")
    abn: str | None = Field(default=None, max_length=20)
    billing_address: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, sa_type=Text)
    is_active: bool = True


class SubcontractorCreate(SubcontractorBase):
    pass


class SubcontractorUpdate(SQLModel):
    company_name: str | None = Field(default=None, max_length=255)
    contact_name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    specialty: str | None = Field(default=None, max_length=255)
    role_id: uuid.UUID | None = None
    abn: str | None = Field(default=None, max_length=20)
    billing_address: str | None = Field(default=None, max_length=500)
    notes: str | None = None
    is_active: bool | None = None


class Subcontractor(SubcontractorBase, table=True):
    __tablename__ = "subcontractors"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    role: Role | None = Relationship(back_populates="subcontractors")
    project_assignments: list["ProjectAssignment"] = Relationship(back_populates="subcontractor")
    materials: list["Material"] = Relationship(back_populates="subcontractor")
    time_logs: list["TimeLog"] = Relationship(back_populates="subcontractor")


class SubcontractorPublic(SubcontractorBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SubcontractorsPublic(SQLModel):
    data: list[SubcontractorPublic]
    count: int


# ---------------------------------------------------------------------------
# User  (auth login — FK -> employees; defined after Employee)
# ---------------------------------------------------------------------------

class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class AdminUserCreate(SQLModel):
    email: EmailStr = Field(max_length=255)
    full_name: str | None = Field(default=None, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    is_superuser: bool = False


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    role_name: str | None = Field(default=None, max_length=100)
    role_title: str | None = Field(default=None, max_length=100)



class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role_name: str | None = Field(default=None, max_length=100)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    role_name: str | None = Field(default=None, max_length=100)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class User(UserBase, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    employee_id: uuid.UUID | None = Field(default=None, foreign_key="employees.id")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class UserPublic(UserBase):
    id: uuid.UUID
    employee_id: uuid.UUID | None = None
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


class UserDetail(SQLModel):
    id: uuid.UUID
    email: str
    full_name: str | None = None
    role: str | None = None


class UsersDetail(SQLModel):
    data: list[UserDetail]
    count: int


class UserProfile(SQLModel):
    id: uuid.UUID
    email: str
    is_superuser: bool
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    role_name: str | None = None
    is_active: bool


# ---------------------------------------------------------------------------
# Projects  (FK -> clients, project_status_types)
# ---------------------------------------------------------------------------

class ProjectBase(SQLModel):
    job_number: str = Field(unique=True, max_length=50)
    client_id: uuid.UUID = Field(foreign_key="clients.id")
    current_status_id: uuid.UUID | None = Field(default=None, foreign_key="project_status_types.id")
    project_name: str | None = Field(default=None, max_length=255)
    contract_title: str | None = Field(default=None, max_length=255)
    agent: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=255)
    sector: str | None = Field(default=None, max_length=100)
    project_type: str | None = Field(default=None, max_length=100)
    full_address: str | None = Field(default=None, max_length=500)
    date_received: date | None = None
    start_date: date | None = None
    due_date: date | None = None
    completion_date: date | None = None
    display_order: int | None = None
    fee_final: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    invoice_amount: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    is_active: bool = True
    notes: str | None = Field(default=None, sa_type=Text)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(SQLModel):
    job_number: str | None = Field(default=None, max_length=50)
    client_id: uuid.UUID | None = None
    current_status_id: uuid.UUID | None = None
    project_name: str | None = Field(default=None, max_length=255)
    contract_title: str | None = Field(default=None, max_length=255)
    agent: str | None = Field(default=None, max_length=255)
    job_title: str | None = Field(default=None, max_length=255)
    sector: str | None = Field(default=None, max_length=100)
    project_type: str | None = Field(default=None, max_length=100)
    full_address: str | None = Field(default=None, max_length=500)
    date_received: date | None = None
    start_date: date | None = None
    due_date: date | None = None
    completion_date: date | None = None
    display_order: int | None = None
    fee_final: Decimal | None = None
    invoice_amount: Decimal | None = None
    is_active: bool | None = None
    notes: str | None = None


class Project(ProjectBase, table=True):
    __tablename__ = "projects"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    client: Client | None = Relationship(back_populates="projects")
    current_status: ProjectStatusType | None = Relationship(back_populates="projects")
    milestones: list["ProjectMilestone"] = Relationship(back_populates="project",sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True},)
    assignments: list["ProjectAssignment"] = Relationship(back_populates="project", sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True})
    invoices: list["Invoice"] = Relationship(back_populates="project", sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True})
    order_types: list["OrderType"] = Relationship(back_populates="project", sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True})
    materials: list["Material"] = Relationship(
        back_populates="project",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "passive_deletes": True,
        },
    )
    time_logs: list["TimeLog"] = Relationship(back_populates="project", sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True})


class ProjectPublic(ProjectBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectsPublic(SQLModel):
    data: list[ProjectPublic]
    count: int


# ---------------------------------------------------------------------------
# Project Milestones  (FK -> projects)
# ---------------------------------------------------------------------------

class ProjectMilestoneBase(SQLModel):
    project_id: uuid.UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    milestone_name: str = Field(max_length=255)
    description_type: str | None = Field(default=None, max_length=100)
    due_date: date | None = None
    completion_date: date | None = None
    is_complete: bool = False
    progress: int = Field(default=0, ge=0, le=100)
    display_order: int | None = None


class ProjectMilestoneCreate(ProjectMilestoneBase):
    pass


class ProjectMilestoneUpdate(SQLModel):
    milestone_name: str | None = Field(default=None, max_length=255)
    description_type: str | None = Field(default=None, max_length=100)
    due_date: date | None = None
    completion_date: date | None = None
    is_complete: bool | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    display_order: int | None = None


class ProjectMilestone(ProjectMilestoneBase, table=True):
    __tablename__ = "project_milestones"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    project: Project | None = Relationship(back_populates="milestones")
    tasks: list["ProjectTask"] = Relationship(
        back_populates="milestone",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "passive_deletes": True},
    )


class ProjectMilestonePublic(ProjectMilestoneBase):
    id: uuid.UUID
    created_at: datetime | None = None


class ProjectMilestonesPublic(SQLModel):
    data: list[ProjectMilestonePublic]
    count: int


class ProjectMilestoneTreeCreate(SQLModel):
    milestone_name: str = Field(max_length=255)
    description_type: str | None = Field(default=None, max_length=100)
    due_date: date | None = None
    completion_date: date | None = None
    is_complete: bool = False
    progress: int = Field(default=0, ge=0, le=100)
    display_order: int | None = None


# ---------------------------------------------------------------------------
# Project Tasks  (FK -> project_milestones)
# ---------------------------------------------------------------------------

class ProjectTaskBase(SQLModel):
    milestone_id: uuid.UUID = Field(foreign_key="project_milestones.id", ondelete="CASCADE")
    task_name: str = Field(max_length=255)
    task_description: str | None = Field(default=None, sa_type=Text)
    parent_task_id: uuid.UUID | None = Field(default=None, foreign_key="project_tasks.id", ondelete="CASCADE")
    due_date: date | None = None
    milestone_status: str | None = Field(default=None, max_length=100)
    core_phase_name: str | None = Field(default=None, max_length=100)
    assigned_role_id: uuid.UUID | None = Field(default=None, foreign_key="roles.id")
    allocated_hours: Decimal | None = Field(default=None, max_digits=8, decimal_places=2)
    completion_date: date | None = None
    invoice_amount: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    fee_final: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    is_excluded: bool = False
    paid_date: date | None = None


class ProjectTaskCreate(ProjectTaskBase):
    pass


class ProjectTaskUpdate(SQLModel):
    task_name: str | None = Field(default=None, max_length=255)
    task_description: str | None = None
    parent_task_id: uuid.UUID | None = None
    due_date: date | None = None
    milestone_status: str | None = Field(default=None, max_length=100)
    core_phase_name: str | None = Field(default=None, max_length=100)
    assigned_role_id: uuid.UUID | None = None
    allocated_hours: Decimal | None = None
    completion_date: date | None = None
    invoice_amount: Decimal | None = None
    fee_final: Decimal | None = None
    is_excluded: bool | None = None
    paid_date: date | None = None


class ProjectTask(ProjectTaskBase, table=True):
    __tablename__ = "project_tasks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    milestone: ProjectMilestone | None = Relationship(back_populates="tasks")
    assigned_role: Role | None = Relationship(back_populates="project_tasks")

    # Two FKs from project_task_orders point to project_tasks (task_id + depends_on_task_id).
    # Use raw SA relationship with explicit foreign_keys to disambiguate.
    task_orders: list["ProjectTaskOrder"] = Relationship(
        sa_relationship=relationship(
            "ProjectTaskOrder",
            primaryjoin="ProjectTaskOrder.task_id == ProjectTask.id",
            foreign_keys="[ProjectTaskOrder.task_id]",
            back_populates="task",
        )
    )


class ProjectTaskPublic(ProjectTaskBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectTasksPublic(SQLModel):
    data: list[ProjectTaskPublic]
    count: int

# --------------------------------------------------------------------------- Igie
# Project Subtask Models
# Stores workforce allocation and estimated hours for subtasks

class ProjectSubtaskBase(SQLModel):
    # Parent project/task references
    project_id: uuid.UUID = Field(foreign_key="projects.id")
    task_id: uuid.UUID = Field(foreign_key="project_tasks.id")

    # Subtask details
    subtask_name: str = Field(max_length=255)
    subtask_description: str | None = Field(default=None, sa_type=Text)

    # Assigned project manager + estimated hours
    project_manager_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="employees.id"
    )
    project_manager_hours: Decimal | None = Field(
        default=None,
        max_digits=8,
        decimal_places=2
    )

    # Assigned drafter + estimated hours
    draft_engineer_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="employees.id"
    )
    draft_engineer_hours: Decimal | None = Field(
        default=None,
        max_digits=8,
        decimal_places=2
    )

    # Assigned engineer + estimated hours
    engineer_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="employees.id"
    )
    engineer_hours: Decimal | None = Field(
        default=None,
        max_digits=8,
        decimal_places=2
    )


# Create schema
class ProjectSubtaskCreate(ProjectSubtaskBase):
    pass


# Update schema
class ProjectSubtaskUpdate(SQLModel):
    subtask_name: str | None = Field(default=None, max_length=255)
    subtask_description: str | None = None

    project_manager_id: uuid.UUID | None = None
    project_manager_hours: Decimal | None = None

    draft_engineer_id: uuid.UUID | None = None
    draft_engineer_hours: Decimal | None = None

    engineer_id: uuid.UUID | None = None
    engineer_hours: Decimal | None = None


# PATCH request body for assigning workforce to subtasks
class ProjectSubtaskAssignmentUpdate(SQLModel):
    project_manager: uuid.UUID | None = None
    project_manager_hours: Decimal | None = None

    draft_engineer: uuid.UUID | None = None
    draft_engineer_hours: Decimal | None = None

    engineer: uuid.UUID | None = None
    engineer_hours: Decimal | None = None


# Database table
class ProjectSubtask(ProjectSubtaskBase, table=True):
    __tablename__ = "project_subtasks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Public response schema
class ProjectSubtaskPublic(ProjectSubtaskBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


# Multiple subtasks response schema
class ProjectSubtasksPublic(SQLModel):
    data: list[ProjectSubtaskPublic]
    count: int

# --------------------------------------------------------------------------- Igie

class ProjectTaskTreeCreate(SQLModel):
    task_name: str = Field(max_length=255)
    task_description: str | None = None
    due_date: date | None = None
    parent_task_id: uuid.UUID | None = None
    assigned_role_id: uuid.UUID | None = None
    allocated_hours: Decimal | None = None
    milestone_status: str | None = None
    core_phase_name: str | None = None


class ProjectTaskTreeUpdate(SQLModel):
    task_name: str | None = None
    task_description: str | None = None
    due_date: date | None = None
    parent_task_id: uuid.UUID | None = None
    assigned_role_id: uuid.UUID | None = None
    allocated_hours: Decimal | None = None
    milestone_status: str | None = None
    core_phase_name: str | None = None
    completion_date: date | None = None
    invoice_amount: Decimal | None = None
    fee_final: Decimal | None = None
    is_excluded: bool | None = None
    paid_date: date | None = None


class ProjectTaskNode(SQLModel):
    id: uuid.UUID
    milestone_id: uuid.UUID
    parent_task_id: uuid.UUID | None = None
    task_name: str
    task_description: str | None = None
    due_date: date | None = None
    milestone_status: str | None = None
    core_phase_name: str | None = None
    assigned_role_id: uuid.UUID | None = None
    assigned_role_name: str | None = None
    allocated_hours: Decimal | None = None
    completion_date: date | None = None
    invoice_amount: Decimal | None = None
    fee_final: Decimal | None = None
    is_excluded: bool = False
    paid_date: date | None = None
    children: list["ProjectTaskNode"] = Field(default_factory=list)


class ProjectMilestoneNode(SQLModel):
    id: uuid.UUID
    project_id: uuid.UUID
    milestone_name: str
    description_type: str | None = None
    due_date: date | None = None
    completion_date: date | None = None
    is_complete: bool = False
    progress: int = 0
    display_order: int | None = None
    tasks: list[ProjectTaskNode] = Field(default_factory=list)


class ProjectTaskManagementResponse(SQLModel):
    project_id: uuid.UUID
    milestones: list[ProjectMilestoneNode]


# ---------------------------------------------------------------------------
# Project Task Orders  (two FKs -> project_tasks)
# ---------------------------------------------------------------------------

class ProjectTaskOrderBase(SQLModel):
    task_id: uuid.UUID = Field(foreign_key="project_tasks.id")
    depends_on_task_id: uuid.UUID = Field(foreign_key="project_tasks.id")


class ProjectTaskOrderCreate(ProjectTaskOrderBase):
    pass


class ProjectTaskOrder(ProjectTaskOrderBase, table=True):
    __tablename__ = "project_task_orders"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    task: ProjectTask | None = Relationship(
        sa_relationship=relationship(
            "ProjectTask",
            primaryjoin="ProjectTaskOrder.task_id == ProjectTask.id",
            foreign_keys="[ProjectTaskOrder.task_id]",
            back_populates="task_orders",
        )
    )


class ProjectTaskOrderPublic(ProjectTaskOrderBase):
    id: uuid.UUID
    created_at: datetime | None = None


# ---------------------------------------------------------------------------
# Project Assignments  (FK -> projects, employees, subcontractors)
# ---------------------------------------------------------------------------

class ProjectAssignmentBase(SQLModel):
    project_id: uuid.UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    employee_id: uuid.UUID | None = Field(default=None, foreign_key="employees.id")
    subcontractor_id: uuid.UUID | None = Field(default=None, foreign_key="subcontractors.id")
    role_id: uuid.UUID | None = Field(default=None, foreign_key="roles.id")
    allocation_notes: str | None = Field(default=None, sa_type=Text)
    actual_hours: Decimal | None = Field(default=None, max_digits=8, decimal_places=2)
    start_date: date | None = None
    completion_date: date | None = None
    manual_progress_percent: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    notes: str | None = Field(default=None, sa_type=Text)


class ProjectAssignmentCreate(ProjectAssignmentBase):
    pass


class ProjectAssignmentUpdate(SQLModel):
    employee_id: uuid.UUID | None = None
    subcontractor_id: uuid.UUID | None = None
    role_id: uuid.UUID | None = None
    allocation_notes: str | None = None
    actual_hours: Decimal | None = None
    start_date: date | None = None
    completion_date: date | None = None
    manual_progress_percent: Decimal | None = None
    notes: str | None = None


class ProjectAssignment(ProjectAssignmentBase, table=True):
    __tablename__ = "project_assignments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    project: Project | None = Relationship(back_populates="assignments")
    employee: Employee | None = Relationship(back_populates="project_assignments")
    subcontractor: Subcontractor | None = Relationship(back_populates="project_assignments")
    role: Role | None = Relationship(back_populates="project_assignments")


class ProjectAssignmentPublic(ProjectAssignmentBase):
    id: uuid.UUID
    created_at: datetime | None = None
    role_name: str | None = None


class ProjectAssignmentsPublic(SQLModel):
    data: list[ProjectAssignmentPublic]
    count: int

#----- Igie -----
class WorkforceAssignmentRequest(SQLModel):
    user_id: uuid.UUID
    role_id: uuid.UUID


class WorkforceDeleteRequest(SQLModel):
    user_ids: list[uuid.UUID]


class WorkforceAssignmentResponse(SQLModel):
    id: uuid.UUID
    project_id: uuid.UUID
    employee_id: uuid.UUID | None = None
    role_id: uuid.UUID | None = None
    created_at: datetime | None = None


class WorkforcePostResponse(SQLModel):
    assigned: int
    data: list[WorkforceAssignmentResponse]


class WorkforcePatchResponse(SQLModel):
    updated: int
    data: list[WorkforceAssignmentResponse]


class WorkforceDeleteResponse(SQLModel):
    removed: int
    message: str


class WorkforceAllocationEntry(SQLModel):
    assignment_id: uuid.UUID
    project_id: uuid.UUID
    employee_id: uuid.UUID | None = None
    employee_name: str | None = None
    role_id: uuid.UUID | None = None
    role_name: str | None = None
    created_at: datetime | None = None


class WorkforceAllocationListResponse(SQLModel):
    project_id: uuid.UUID
    assignments: list[WorkforceAllocationEntry]
    count: int
#----- Igie -----
    
# ---------------------------------------------------------------------------
# Invoices  (FK -> projects)
# ---------------------------------------------------------------------------

class InvoiceBase(SQLModel):
    project_id: uuid.UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    invoice_number: str = Field(max_length=100)
    invoice_date: date | None = None
    invoice_amount: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    paid_date: date | None = None
    notes: str | None = Field(default=None, sa_type=Text)


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceUpdate(SQLModel):
    invoice_number: str | None = Field(default=None, max_length=100)
    invoice_date: date | None = None
    invoice_amount: Decimal | None = None
    paid_date: date | None = None
    notes: str | None = None


class Invoice(InvoiceBase, table=True):
    __tablename__ = "invoices"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    project: Project | None = Relationship(back_populates="invoices")


class InvoicePublic(InvoiceBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class InvoicesPublic(SQLModel):
    data: list[InvoicePublic]
    count: int


# ---------------------------------------------------------------------------
# Order Types  (FK -> projects)
# ---------------------------------------------------------------------------

class OrderTypeBase(SQLModel):
    project_id: uuid.UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    supplier_name: str | None = Field(default=None, max_length=255)
    employee_name: str | None = Field(default=None, max_length=255)
    ordered_date: date | None = None
    received_date: date | None = None
    order_status: str | None = Field(default=None, max_length=100)
    cost_amount: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    names: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, sa_type=Text)


class OrderTypeCreate(OrderTypeBase):
    pass


class OrderTypeUpdate(SQLModel):
    supplier_name: str | None = Field(default=None, max_length=255)
    employee_name: str | None = Field(default=None, max_length=255)
    ordered_date: date | None = None
    received_date: date | None = None
    order_status: str | None = Field(default=None, max_length=100)
    cost_amount: Decimal | None = None
    names: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class OrderType(OrderTypeBase, table=True):
    __tablename__ = "order_types"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    project: Project | None = Relationship(back_populates="order_types")


class OrderTypePublic(OrderTypeBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OrderTypesPublic(SQLModel):
    data: list[OrderTypePublic]
    count: int


# ---------------------------------------------------------------------------
# Customers  (FK -> order_types)
# ---------------------------------------------------------------------------

class CustomerBase(SQLModel):
    contact_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    current_status: str | None = Field(default=None, max_length=100)
    remarks: str | None = Field(default=None, sa_type=Text)
    order_type_id: uuid.UUID | None = Field(default=None, foreign_key="order_types.id")


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(SQLModel):
    contact_name: str | None = Field(default=None, max_length=255)
    email: str | None = Field(default=None, max_length=255)
    current_status: str | None = Field(default=None, max_length=100)
    remarks: str | None = None
    order_type_id: uuid.UUID | None = None


class Customer(CustomerBase, table=True):
    __tablename__ = "customers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    executed_at: date | None = None
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class CustomerPublic(CustomerBase):
    id: uuid.UUID
    executed_at: date | None = None
    created_at: datetime | None = None


class CustomersPublic(SQLModel):
    data: list[CustomerPublic]
    count: int


# ---------------------------------------------------------------------------
# Materials  (FK -> projects)
# ---------------------------------------------------------------------------

class MaterialBase(SQLModel):
    project_id: uuid.UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, sa_type=Text)
    unit: str | None = Field(default=None, max_length=50)
    quantity: Decimal | None = Field(default=None, max_digits=10, decimal_places=3)
    unit_cost: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    total_cost: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    supplier_name: str | None = Field(default=None, max_length=255)
    order_reference: str | None = Field(default=None, max_length=100)
    ordered_date: date | None = None
    received_date: date | None = None
    subcontractor_id: uuid.UUID | None = Field(default=None, foreign_key="subcontractors.id")
    status: str = Field(default=SubcontractorStatus.not_applicable.value, max_length=50)
    notes: str | None = Field(default=None, sa_type=Text)


class MaterialCreate(MaterialBase):
    pass


class MaterialUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    unit: str | None = Field(default=None, max_length=50)
    quantity: Decimal | None = None
    unit_cost: Decimal | None = None
    total_cost: Decimal | None = None
    supplier_name: str | None = Field(default=None, max_length=255)
    order_reference: str | None = Field(default=None, max_length=100)
    ordered_date: date | None = None
    received_date: date | None = None
    subcontractor_id: uuid.UUID | None = None
    status: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class Material(MaterialBase, table=True):
    __tablename__ = "materials"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    project: Project | None = Relationship(back_populates="materials")
    subcontractor: Subcontractor | None = Relationship(back_populates="materials")


class MaterialPublic(MaterialBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class MaterialsPublic(SQLModel):
    data: list[MaterialPublic]
    count: int


# ---------------------------------------------------------------------------
# Time Logs  (two FKs -> employees: employee_id + approved_by_id)
# ---------------------------------------------------------------------------

class TimeLogBase(SQLModel):
    project_id: uuid.UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    employee_id: uuid.UUID | None = Field(default=None, foreign_key="employees.id")
    subcontractor_id: uuid.UUID | None = Field(default=None, foreign_key="subcontractors.id")
    task_id: uuid.UUID | None = Field(default=None, foreign_key="project_tasks.id")
    log_date: date
    hours_worked: Decimal = Field(max_digits=6, decimal_places=2)
    hourly_rate: Decimal | None = Field(default=None, max_digits=8, decimal_places=2)
    cost: Decimal | None = Field(default=None, max_digits=10, decimal_places=2)
    activity_type: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, sa_type=Text)
    is_billable: bool = True
    is_approved: bool = False
    approved_by_id: uuid.UUID | None = Field(default=None, foreign_key="employees.id")


class TimeLogCreate(TimeLogBase):
    pass


class TimeLogUpdate(SQLModel):
    log_date: date | None = None
    hours_worked: Decimal | None = None
    hourly_rate: Decimal | None = None
    cost: Decimal | None = None
    activity_type: str | None = Field(default=None, max_length=100)
    description: str | None = None
    is_billable: bool | None = None
    is_approved: bool | None = None
    approved_by_id: uuid.UUID | None = None


class TimeLog(TimeLogBase, table=True):
    __tablename__ = "time_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    project: Project | None = Relationship(back_populates="time_logs")
    subcontractor: Subcontractor | None = Relationship(back_populates="time_logs")

    # employee_id = the worker; approved_by_id = a second FK to same table.
    # Must use raw SA relationships with explicit foreign_keys on both.
    employee: Employee | None = Relationship(
        sa_relationship=relationship(
            "Employee",
            primaryjoin="TimeLog.employee_id == Employee.id",
            foreign_keys="[TimeLog.employee_id]",
            back_populates="time_logs",
        )
    )
    approved_by: Employee | None = Relationship(
        sa_relationship=relationship(
            "Employee",
            primaryjoin="TimeLog.approved_by_id == Employee.id",
            foreign_keys="[TimeLog.approved_by_id]",
        )
    )


class TimeLogPublic(TimeLogBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None

#--------- Igie ---------
class WorkHoursCreate(SQLModel):
    employee_id: uuid.UUID
    work_hours: Decimal = Field(gt=0, max_digits=6, decimal_places=2)
    work_date: date


class WorkHoursResponse(SQLModel):
    project_id: uuid.UUID
    task_id: uuid.UUID
    employee_id: uuid.UUID
    work_hours: Decimal
    work_date: date
    message: str
#---------- Igie ---------


class TimeLogsPublic(SQLModel):
    data: list[TimeLogPublic]
    count: int


# ---------------------------------------------------------------------------
# Notification Preferences  (FK -> employees)
# ---------------------------------------------------------------------------

class NotificationPreferenceBase(SQLModel):
    employee_id: uuid.UUID = Field(foreign_key="employees.id")
    notification_type: str = Field(max_length=100)
    channel: str = Field(max_length=50)
    is_enabled: bool = True
    frequency: str | None = Field(default=None, max_length=50)


class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass


class NotificationPreferenceUpdate(SQLModel):
    notification_type: str | None = Field(default=None, max_length=100)
    channel: str | None = Field(default=None, max_length=50)
    is_enabled: bool | None = None
    frequency: str | None = Field(default=None, max_length=50)


class NotificationPreference(NotificationPreferenceBase, table=True):
    __tablename__ = "notification_preferences"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    employee: Employee | None = Relationship(back_populates="notification_preferences")


class NotificationPreferencePublic(NotificationPreferenceBase):
    id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


class NotificationPreferencesPublic(SQLModel):
    data: list[NotificationPreferencePublic]
    count: int

# ---------------------------------------------------------------------------
# API Request Schemas (project dashboard)
# ---------------------------------------------------------------------------
class ProjectCreateRequest(SQLModel):
    job_number: str
    project_types: str = "civil"
    project_name: str
    client_name: str
    client_company: str | None = None
    client_contact: str | None = None
    client_address: str | None = None
    address: str | None = None
    contract_title: str | None = None
    agent: str | None = None
    job_title: str | None = None
    fee_estimate: Decimal | None = None
    date_received: date
    start_date: date
    due_date: date
    preliminary_due_date: date | None = None
    design_due_date: date | None = None

class ProjectCreateResponse(SQLModel):
    project_id: uuid.UUID
    message: str = "project created successfully"


class ProjectUpdateRequest(SQLModel):
    project_name: str | None = None
    project_types: str | None = None
    client_name: str | None = None
    client_company: str | None = None
    client_contact: str | None = None
    client_address: str | None = None
    contract_title: str | None = None
    agent: str | None = None
    job_title: str | None = None
    address: str | None = None
    status: str | None = None
    date_received: date | None = None
    start_date: date | None = None
    due_date: date | None = None
    fee_estimate: Decimal | None = None


# ---------------------------------------------------------------------------
# API Response Schemas (project dashboard)
# ---------------------------------------------------------------------------

class ProjectDetail(SQLModel):
    project_id: uuid.UUID
    job_number: str
    project_name: str | None = None
    contract_title: str | None = None
    agent: str | None = None
    job_title: str | None = None
    address: str | None = None
    company_name: str | None = None
    company_address: str | None = None
    client_name: str | None = None
    status: str | None = None
    start_date: date | None = None
    due_date: date | None = None
    days_elapsed: int | None = None
    completion_percent: Decimal | None = None
    is_invoiced: bool = False
    project_tab: str | None = None
    fee_estimate: Decimal | None = None


class AssignmentWithRole(SQLModel):
    employee_name: str | None = None
    role_name: str | None = None
    role_in_project: str | None = None


class ProjectDetailWithRoles(ProjectDetail):
    assignments: list[AssignmentWithRole] = Field(default_factory=list)


class ProjectDetailsResponse(SQLModel):
    data: list[ProjectDetail]
    count: int

class ProjectSummary(SQLModel):
    project_id: uuid.UUID
    project_name: str | None = None
    client_name: str | None = None
    project_manager_name: str | None = None
    days_since_started: int | None = None


class ProjectsListResponse(SQLModel):
    data: list[ProjectSummary]
    count: int


class MonthlyCountResponse(SQLModel):
    current_month: int
    previous_month: int


class MonthlyInvoiceResponse(SQLModel):
    current_month_total: Decimal
    previous_month_total: Decimal


class EmployeeHoursDetail(SQLModel):
    employee_id: uuid.UUID
    name: str | None = None
    working_hours: Decimal
    role: str | None = None


class EmployeeHoursResponse(SQLModel):
    data: list[EmployeeHoursDetail]
    count: int


class InvoiceDetail(SQLModel):
    invoice_id: uuid.UUID
    project_id: uuid.UUID
    project_name: str | None = None
    invoice_number: str
    invoice_date: date | None = None
    invoice_amount: Decimal | None = None
    paid_date: date | None = None


class InvoiceListResponse(SQLModel):
    data: list[InvoiceDetail]
    count: int
    total: Decimal


# ---------------------------------------------------------------------------
# Generic / Auth helpers
# ---------------------------------------------------------------------------

class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    action: str = Field(max_length=100)
    project_id: uuid.UUID = Field(foreign_key="projects.id")
    target_user_ids: list[str] = Field(sa_column=Column(JSONB))
    performed_by: uuid.UUID = Field(foreign_key="users.id")
    timestamp: datetime = Field(default_factory=get_datetime_utc)
    changes: dict = Field(sa_column=Column(JSONB))
