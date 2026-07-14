import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from sqlmodel import Session, col, func, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    AdminUserCreate,
    Employee,
    EmployeeHoursDetail,
    Role,
    TimeLog,
    User,
    UserCreate,
    UserProfile,
    UserUpdate,
)


# ---------------------------------------------------------------------------
# Original auth CRUD (previously in crud.py)
# ---------------------------------------------------------------------------

DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"


def get_user_by_email(*, session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def create_user(*, session: Session, user_create: UserCreate) -> User:
    db_obj = User.model_validate(
        user_create, update={"hashed_password": get_password_hash(user_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        extra_data["hashed_password"] = get_password_hash(user_data["password"])
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        verify_password(password, DUMMY_HASH)
        return None
    verified, updated_hash = verify_password(password, db_user.hashed_password)
    if not verified:
        return None
    if updated_hash:
        db_user.hashed_password = updated_hash
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    return db_user


# ---------------------------------------------------------------------------
# Extended user CRUD (extracted from routes/users.py)
# ---------------------------------------------------------------------------

def get_users(*, session: Session, skip: int = 0, limit: int = 100) -> tuple[list[User], int]:
    count = session.exec(select(func.count()).select_from(User)).one()
    users = session.exec(
        select(User).order_by(col(User.created_at).desc()).offset(skip).limit(limit)
    ).all()
    return list(users), count


def get_all_users_with_roles(*, session: Session) -> list[tuple[User, str | None]]:
    rows = session.exec(
        select(User, Role.role_name)
        .outerjoin(Employee, User.employee_id == Employee.id)
        .outerjoin(Role, Employee.role_id == Role.id)
        .order_by(col(User.created_at).desc())
    ).all()
    return list(rows)


def create_user_with_employee(
    *, session: Session, user_in: AdminUserCreate
) -> User:
    employee = Employee(
        first_name="",
        last_name="",
        full_name=user_in.full_name,
        email=user_in.email,
        is_active=True,
    )
    session.add(employee)
    session.commit()
    session.refresh(employee)

    db_obj = User.model_validate(
        UserCreate(
            email=user_in.email,
            password=user_in.password,
            full_name=user_in.full_name,
            is_superuser=user_in.is_superuser,
        ),
        update={
            "hashed_password": get_password_hash(user_in.password),
            "employee_id": employee.id,
        },
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def get_user_profile(*, session: Session, user: User) -> UserProfile:
    employee = session.get(Employee, user.employee_id) if user.employee_id else None
    role_name = None
    if employee and employee.role_id:
        role = session.get(Role, employee.role_id)
        role_name = role.role_name if role else None
    return UserProfile(
        id=user.id,
        email=user.email,
        is_superuser=user.is_superuser,
        first_name=employee.first_name if employee else None,
        last_name=employee.last_name if employee else None,
        full_name=employee.full_name if employee else None,
        role_name=role_name,
        is_active=employee.is_active if employee else user.is_active,
    )


def update_employee_role(
    *, session: Session, employee_id: uuid.UUID, role_name: str
) -> Role | None:
    employee = session.get(Employee, employee_id)
    if not employee:
        return None
    role = session.exec(select(Role).where(Role.role_name == role_name)).first()
    if not role:
        return None
    employee.role_id = role.id
    session.add(employee)
    session.commit()
    return role


def delete_user_and_employee(*, session: Session, user: User) -> None:
    employee_id = user.employee_id
    session.delete(user)
    session.commit()
    if employee_id:
        employee = session.get(Employee, employee_id)
        if employee:
            session.delete(employee)
            session.commit()


def get_employee_hours_since(
    *, session: Session, since: date, user_ids: list[uuid.UUID] | None = None
) -> list[EmployeeHoursDetail]:
    query = (
        select(Employee, func.sum(TimeLog.hours_worked), Role.role_name)
        .join(TimeLog, TimeLog.employee_id == Employee.id)
        .outerjoin(Role, Employee.role_id == Role.id)
        .where(TimeLog.log_date >= since)
        .group_by(Employee.id, Role.role_name)
    )

    if user_ids:
        employee_ids = session.exec(
            select(User.employee_id)
            .where(col(User.id).in_(user_ids))
            .where(User.employee_id != None)
        ).all()
        if not employee_ids:
            return []
        query = query.where(col(Employee.id).in_(employee_ids))

    rows = session.exec(query).all()
    return [
        EmployeeHoursDetail(
            employee_id=emp.id,
            name=emp.full_name or f"{emp.first_name} {emp.last_name}".strip(),
            working_hours=total_hours or Decimal("0"),
            role=role_name,
        )
        for emp, total_hours, role_name in rows
    ]
