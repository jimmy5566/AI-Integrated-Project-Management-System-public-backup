import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    AdminUserCreate,
    EmployeeHoursResponse,
    Message,
    UpdatePassword,
    User,
    UserCreate,
    UserDetail,
    UserProfile,
    UserPublic,
    UserRegister,
    UsersDetail,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.utils import generate_new_account_email, send_email

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UsersPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    users, count = crud.get_users(session=session, skip=skip, limit=limit)
    return UsersPublic(data=users, count=count)


@router.get(
    "/all-users",
    response_model=UsersDetail,
)
def read_all_users(session: SessionDep) -> Any:
    rows = crud.get_all_users_with_roles(session=session)
    data = [
        UserDetail(id=u.id, email=u.email, full_name=u.full_name, role=role_name)
        for u, role_name in rows
    ]
    return UsersDetail(data=data, count=len(data))


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def create_user(*, session: SessionDep, user_in: AdminUserCreate) -> Any:
    if crud.get_user_by_email(session=session, email=user_in.email):
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = crud.create_user_with_employee(session=session, user_in=user_in)

    if settings.emails_enabled and user_in.email:
        email_data = generate_new_account_email(
            email_to=user_in.email, username=user_in.email, password=user_in.password
        )
        send_email(
            email_to=user_in.email,
            subject=email_data.subject,
            html_content=email_data.html_content,
        )
    return user


@router.post("/signup", response_model=UserPublic)
def register_user(*, session: SessionDep, user_in: UserRegister) -> Any:
    if crud.get_user_by_email(session=session, email=user_in.email):
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )
    user = crud.create_user(
        session=session,
        user_create=UserCreate(
            email=user_in.email,
            password=user_in.password,
            full_name=user_in.full_name,
        ),
    )
    return user


@router.patch("/me", response_model=UserPublic)
def update_user_me(
    *, session: SessionDep, user_in: UserUpdateMe, current_user: CurrentUser
) -> Any:
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    if user_in.role_name is not None and current_user.employee_id:
        role = crud.update_employee_role(
            session=session, employee_id=current_user.employee_id, role_name=user_in.role_name
        )
        if role is None:
            raise HTTPException(status_code=400, detail=f"Role '{user_in.role_name}' not found")
    user_data = user_in.model_dump(exclude_unset=True, exclude={"role_name"})
    current_user.sqlmodel_update(user_data)
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    verified, _ = verify_password(body.current_password, current_user.hashed_password)
    if not verified:
        raise HTTPException(status_code=400, detail="Incorrect password")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400, detail="New password cannot be the same as the current one"
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    session.add(current_user)
    session.commit()
    return Message(message="Password updated successfully")


@router.get("/me", response_model=UserProfile)
def read_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    return crud.get_user_profile(session=session, user=current_user)


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Message:
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    crud.delete_user_and_employee(session=session, user=current_user)
    return Message(message="User deleted successfully")


@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(
    user_id: uuid.UUID, session: SessionDep, current_user: CurrentUser
) -> Any:
    user = session.get(User, user_id)
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="The user doesn't have enough privileges",
        )
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UserPublic,
)
def update_user(
    *, session: SessionDep, user_id: uuid.UUID, user_in: UserUpdate
) -> Any:
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="The user with this id does not exist in the system",
        )
    if user_in.email:
        existing_user = crud.get_user_by_email(session=session, email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    if user_in.role_name is not None and db_user.employee_id:
        role = crud.update_employee_role(
            session=session, employee_id=db_user.employee_id, role_name=user_in.role_name
        )
        if role is None:
            raise HTTPException(
                status_code=404, detail=f"Role '{user_in.role_name}' not found."
            )
    db_user = crud.update_user(session=session, db_user=db_user, user_in=user_in)
    return db_user


@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)])
def delete_user(
    session: SessionDep, current_user: CurrentUser, user_id: uuid.UUID
) -> Message:
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(
            status_code=403, detail="Super users are not allowed to delete themselves"
        )
    crud.delete_user_and_employee(session=session, user=user)
    return Message(message="User deleted successfully")


@router.get("/time_log/{date_str}", response_model=EmployeeHoursResponse)
def get_employee_time_log(
    session: SessionDep,
    date_str: str,
    user_ids: list[uuid.UUID] | None = Query(default=None),
) -> Any:
    try:
        since = datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use dd-mm-yyyy")
    data = crud.get_employee_hours_since(session=session, since=since, user_ids=user_ids)
    return EmployeeHoursResponse(data=data, count=len(data))
