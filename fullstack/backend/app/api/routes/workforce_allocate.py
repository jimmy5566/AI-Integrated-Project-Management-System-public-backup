# ---- Igie -----
import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.crud.workforce_allocate import (
    check_role_exists,
    create_assignment,
    create_audit_log,
    delete_assignment,
    get_assignment,
    get_user_employee_id,
    update_assignment_role,
)
from app.models import (
    Project,
    ProjectAssignment,
    WorkforceAllocationEntry,
    WorkforceAllocationListResponse,
    WorkforceAssignmentRequest,
    WorkforceAssignmentResponse,
    WorkforceDeleteRequest,
    WorkforceDeleteResponse,
    WorkforcePatchResponse,
    WorkforcePostResponse,
)

router = APIRouter(tags=["workforce allocation"])


def check_project_permission(
    session: SessionDep,
    project_id: uuid.UUID,
    current_user: CurrentUser,
) -> Project:
    project = session.get(Project, project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.is_superuser:
        return project

    employee_id = get_user_employee_id(session, current_user.id)

    assignment = get_assignment(
        session=session,
        project_id=project_id,
        employee_id=employee_id,
    )

    if assignment and assignment.role and assignment.role.role_name == "project_manager":
        return project

    raise HTTPException(
        status_code=403,
        detail="Only a project manager or superuser can manage workforce allocation",
    )


def to_assignment_response(
    assignment: ProjectAssignment,
) -> WorkforceAssignmentResponse:
    return WorkforceAssignmentResponse(
        id=assignment.id,
        project_id=assignment.project_id,
        employee_id=assignment.employee_id,
        role_id=assignment.role_id,
        created_at=assignment.created_at,
    )


@router.get(
    "/project/{project_id}/workforce-allocate",
    response_model=WorkforceAllocationListResponse,
)
def get_workforce_allocation(
    project_id: uuid.UUID,
    session: SessionDep,
    current_user: CurrentUser,
) -> WorkforceAllocationListResponse:
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    entries: list[WorkforceAllocationEntry] = []
    for assignment in project.assignments:
        if assignment.employee is None:
            continue
        employee = assignment.employee
        full_name = (
            employee.full_name
            or f"{employee.first_name or ''} {employee.last_name or ''}".strip()
            or None
        )
        entries.append(
            WorkforceAllocationEntry(
                assignment_id=assignment.id,
                project_id=assignment.project_id,
                employee_id=assignment.employee_id,
                employee_name=full_name,
                role_id=assignment.role_id,
                role_name=assignment.role.role_name if assignment.role else None,
                created_at=assignment.created_at,
            )
        )

    return WorkforceAllocationListResponse(
        project_id=project_id,
        assignments=entries,
        count=len(entries),
    )


@router.post(
    "/project/{project_id}/workforce-allocate",
    response_model=WorkforcePostResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_workforce(
    project_id: uuid.UUID,
    data: list[WorkforceAssignmentRequest],
    session: SessionDep,
    current_user: CurrentUser,
):
    check_project_permission(session, project_id, current_user)

    if not data:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    created_assignments: list[ProjectAssignment] = []

    for item in data:
        employee_id = get_user_employee_id(session, item.user_id)
        check_role_exists(session, item.role_id)

        existing_assignment = get_assignment(
            session=session,
            project_id=project_id,
            employee_id=employee_id,
        )

        if existing_assignment:
            raise HTTPException(
                status_code=409,
                detail=f"User is already assigned to this project: {item.user_id}",
            )

        assignment = create_assignment(
            session=session,
            project_id=project_id,
            employee_id=employee_id,
            role_id=item.role_id,
        )

        created_assignments.append(assignment)

    create_audit_log(
        session=session,
        action="assign",
        project_id=project_id,
        target_user_ids=[item.user_id for item in data],
        performed_by=current_user.id,
        changes={
            "assigned": [
                {
                    "user_id": str(item.user_id),
                    "role_id": str(item.role_id),
                }
                for item in data
            ]
        },
    )

    session.commit()

    for assignment in created_assignments:
        session.refresh(assignment)

    return WorkforcePostResponse(
        assigned=len(created_assignments),
        data=[to_assignment_response(assignment) for assignment in created_assignments],
    )


@router.patch(
    "/project/{project_id}/workforce-allocate",
    response_model=WorkforcePatchResponse,
)
def update_workforce_roles(
    project_id: uuid.UUID,
    data: list[WorkforceAssignmentRequest],
    session: SessionDep,
    current_user: CurrentUser,
):
    check_project_permission(session, project_id, current_user)

    if not data:
        raise HTTPException(status_code=400, detail="Request body cannot be empty")

    updated_assignments: list[ProjectAssignment] = []

    for item in data:
        employee_id = get_user_employee_id(session, item.user_id)
        check_role_exists(session, item.role_id)

        assignment = get_assignment(
            session=session,
            project_id=project_id,
            employee_id=employee_id,
        )

        if not assignment:
            raise HTTPException(
                status_code=404,
                detail=f"Existing assignment not found for user: {item.user_id}",
            )

        assignment = update_assignment_role(
            session=session,
            assignment=assignment,
            role_id=item.role_id,
        )

        updated_assignments.append(assignment)

    create_audit_log(
        session=session,
        action="update_role",
        project_id=project_id,
        target_user_ids=[item.user_id for item in data],
        performed_by=current_user.id,
        changes={
            "updated": [
                {
                    "user_id": str(item.user_id),
                    "new_role_id": str(item.role_id),
                }
                for item in data
            ]
        },
    )

    session.commit()

    for assignment in updated_assignments:
        session.refresh(assignment)

    return WorkforcePatchResponse(
        updated=len(updated_assignments),
        data=[to_assignment_response(assignment) for assignment in updated_assignments],
    )


@router.delete(
    "/project/{project_id}/workforce-allocate",
    response_model=WorkforceDeleteResponse,
)
def remove_workforce(
    project_id: uuid.UUID,
    data: WorkforceDeleteRequest,
    session: SessionDep,
    current_user: CurrentUser,
):
    check_project_permission(session, project_id, current_user)

    if not data.user_ids:
        raise HTTPException(status_code=400, detail="user_ids cannot be empty")

    removed_count = 0

    for user_id in data.user_ids:
        employee_id = get_user_employee_id(session, user_id)

        assignment = get_assignment(
            session=session,
            project_id=project_id,
            employee_id=employee_id,
        )

        if not assignment:
            raise HTTPException(
                status_code=404,
                detail=f"Assignment not found for user: {user_id}",
            )

        delete_assignment(session=session, assignment=assignment)
        removed_count += 1

    create_audit_log(
        session=session,
        action="remove",
        project_id=project_id,
        target_user_ids=data.user_ids,
        performed_by=current_user.id,
        changes={
            "removed_user_ids": [str(user_id) for user_id in data.user_ids]
        },
    )

    session.commit()

    return WorkforceDeleteResponse(
        removed=removed_count,
        message="Workforce allocation updated successfully",
    )

