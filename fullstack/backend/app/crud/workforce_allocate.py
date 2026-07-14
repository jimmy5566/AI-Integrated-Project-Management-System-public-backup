# ----- Igie -----
import uuid

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models import (
    AuditLog,
    ProjectAssignment,
    Role,
    User,
)


def get_user_employee_id(session: Session, user_id: uuid.UUID) -> uuid.UUID:
    user = session.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail=f"User not found: {user_id}")

    if not user.employee_id:
        raise HTTPException(
            status_code=404,
            detail=f"User is not linked to an employee: {user_id}",
        )

    return user.employee_id


def check_role_exists(session: Session, role_id: uuid.UUID) -> Role:
    role = session.get(Role, role_id)

    if not role:
        raise HTTPException(status_code=404, detail=f"Role not found: {role_id}")

    if not role.is_active:
        raise HTTPException(status_code=400, detail=f"Role is inactive: {role_id}")

    return role


def get_assignment(
    session: Session,
    project_id: uuid.UUID,
    employee_id: uuid.UUID,
) -> ProjectAssignment | None:
    return session.exec(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project_id,
            ProjectAssignment.employee_id == employee_id,
        )
    ).first()


def create_assignment(
    session: Session,
    project_id: uuid.UUID,
    employee_id: uuid.UUID,
    role_id: uuid.UUID,
) -> ProjectAssignment:
    assignment = ProjectAssignment(
        project_id=project_id,
        employee_id=employee_id,
        role_id=role_id,
    )

    session.add(assignment)
    return assignment


def update_assignment_role(
    session: Session,
    assignment: ProjectAssignment,
    role_id: uuid.UUID,
) -> ProjectAssignment:
    assignment.role_id = role_id
    session.add(assignment)
    return assignment


def delete_assignment(
    session: Session,
    assignment: ProjectAssignment,
) -> None:
    session.delete(assignment)


def create_audit_log(
    session: Session,
    action: str,
    project_id: uuid.UUID,
    target_user_ids: list[uuid.UUID],
    performed_by: uuid.UUID,
    changes: dict[str, object],
) -> None:
    audit_log = AuditLog(
        action=action,
        project_id=project_id,
        target_user_ids=[str(user_id) for user_id in target_user_ids],
        performed_by=performed_by,
        changes=changes,
    )

    session.add(audit_log)

# ----- Igie -----