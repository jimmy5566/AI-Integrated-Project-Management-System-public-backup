from fastapi import APIRouter, Depends
from sqlmodel import SQLModel, col, select

from app.api.deps import SessionDep, get_current_user
from app.models import Employee, EmployeePublic, Role


class EmployeeDirectoryPublic(EmployeePublic):
    role_name: str | None = None


class EmployeesDirectoryPublic(SQLModel):
    data: list[EmployeeDirectoryPublic]
    count: int


router = APIRouter(
    prefix="/employees",
    tags=["employees"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=EmployeesDirectoryPublic)
def list_employees(session: SessionDep) -> EmployeesDirectoryPublic:
    rows = session.exec(
        select(Employee, Role.role_name)
        .outerjoin(Role, Employee.role_id == Role.id)
        .order_by(col(Employee.created_at).desc())
    ).all()

    data = [
        EmployeeDirectoryPublic(**employee.model_dump(), role_name=role_name)
        for employee, role_name in rows
    ]
    return EmployeesDirectoryPublic(data=data, count=len(data))
