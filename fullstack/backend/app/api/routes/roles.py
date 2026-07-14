import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.models import (
    Employee,
    Message,
    Role,
    RoleCreate,
    RolePublic,
    RolesPublic,
    RoleUpdate,
    Subcontractor,
)

router = APIRouter()


@router.get("/", response_model=RolesPublic)
def list_roles(session: SessionDep, current_user: CurrentUser) -> Any:
    count = session.exec(select(func.count()).select_from(Role)).one()
    roles = session.exec(select(Role)).all()
    return RolesPublic(data=roles, count=count)


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=RolePublic,
)
def create_role(*, session: SessionDep, body: RoleCreate) -> Any:
    existing = session.exec(select(Role).where(Role.role_name == body.role_name)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Role name already exists")
    role = Role.model_validate(body)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@router.get("/{role_id}", response_model=RolePublic)
def get_role(
    *, session: SessionDep, current_user: CurrentUser, role_id: uuid.UUID
) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.put(
    "/{role_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=RolePublic,
)
def update_role(*, session: SessionDep, role_id: uuid.UUID, body: RoleUpdate) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if body.role_name and body.role_name != role.role_name:
        existing = session.exec(select(Role).where(Role.role_name == body.role_name)).first()
        if existing:
            raise HTTPException(status_code=409, detail="Role name already exists")
    role_data = body.model_dump(exclude_unset=True)
    role.sqlmodel_update(role_data)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


@router.delete(
    "/{role_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=Message,
)
def delete_role(*, session: SessionDep, role_id: uuid.UUID) -> Any:
    role = session.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    employee_count = session.exec(
        select(func.count()).select_from(Employee).where(Employee.role_id == role_id)
    ).one()
    subcontractor_count = session.exec(
        select(func.count())
        .select_from(Subcontractor)
        .where(Subcontractor.role_id == role_id)
    ).one()
    if employee_count or subcontractor_count:
        raise HTTPException(
            status_code=400,
            detail="Role is in use and cannot be deleted",
        )
    session.delete(role)
    session.commit()
    return Message(message="Role deleted successfully")
