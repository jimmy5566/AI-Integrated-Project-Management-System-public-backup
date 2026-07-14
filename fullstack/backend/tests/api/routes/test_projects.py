from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import (
    Client,
    Employee,
    Invoice,
    Project,
    ProjectAssignment,
    ProjectMilestone,
    ProjectStatusType,
    ProjectTask,
    Role,
)
from tests.utils.utils import random_lower_string


def test_projects_require_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/projects")

    assert response.status_code == 401


def get_prelim_status(db: Session) -> ProjectStatusType:
    status = db.exec(
        select(ProjectStatusType).where(ProjectStatusType.status_name == "prelim")
    ).first()
    assert status is not None
    return status


def test_get_project_with_roles(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    role_name = f"Project Engineer {random_lower_string()[:8]}"
    job_number = f"JOB-ROLES-{random_lower_string()[:8]}"
    role = Role(role_name=role_name, description="Engineer role", is_active=True)
    db.add(role)
    db.commit()
    db.refresh(role)

    employee = Employee(
        first_name="Alice",
        last_name="Nguyen",
        full_name="Alice Nguyen",
        role_id=role.id,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    client_row = Client(
        client_name="Test Client",
        company_name="Test Company",
        billing_address="123 Test Street",
    )
    db.add(client_row)
    db.commit()
    db.refresh(client_row)

    status = get_prelim_status(db)

    project = Project(
        job_number=job_number,
        client_id=client_row.id,
        current_status_id=status.id,
        project_name="Metadata with Roles",
        start_date=date.today(),
        due_date=date.today(),
        is_active=True,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    assignment = ProjectAssignment(
        project_id=project.id,
        employee_id=employee.id,
        allocation_notes="Project Manager",
    )
    db.add(assignment)
    db.commit()

    response = client.get(
        f"/api/v1/projects/{project.id}/with-roles",
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == str(project.id)
    assert payload["job_number"] == job_number
    assert payload["company_name"] == "Test Company"
    assert payload["company_address"] == "123 Test Street"
    assert payload["client_name"] == "Test Client"
    assert payload["status"] == "prelim"
    assert len(payload["assignments"]) == 1
    assert payload["assignments"][0]["employee_name"] == "Alice Nguyen"
    assert payload["assignments"][0]["role_name"] == role_name
    assert payload["assignments"][0]["role_in_project"] == "Project Manager"


def test_create_project_creates_default_milestones_without_tasks(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    job_number = f"JOB-TASK-{random_lower_string()[:8]}"
    get_prelim_status(db)

    response = client.post(
        "/api/v1/projects",
        headers=superuser_token_headers,
        json={
            "job_number": job_number,
            "project_types": "civil",
            "project_name": "Task Management Project",
            "client_name": "Task Client",
            "client_company": "Task Company",
            "client_contact": "task@example.com",
            "client_address": "10 Task Street",
            "fee_estimate": "12.50",
            "date_received": str(date(2026, 5, 1)),
            "start_date": str(date(2026, 5, 2)),
            "due_date": str(date(2026, 6, 1)),
            "preliminary_due_date": str(date(2026, 5, 15)),
            "design_due_date": str(date(2026, 6, 1)),
        },
    )

    assert response.status_code == 200
    project_id = response.json()["project_id"]

    task_response = client.get(
        f"/api/v1/projects/{project_id}/task-management",
        headers=superuser_token_headers,
    )

    assert task_response.status_code == 200
    payload = task_response.json()
    assert payload["project_id"] == project_id
    assert len(payload["milestones"]) == 2
    assert payload["milestones"][0]["milestone_name"] == "Preliminary Design & Documentation"
    assert payload["milestones"][0]["due_date"] == "2026-05-15"
    assert payload["milestones"][1]["milestone_name"] == "Design & Documentation"
    assert payload["milestones"][1]["due_date"] == "2026-06-01"
    assert payload["milestones"][0]["tasks"] == []
    assert payload["milestones"][1]["tasks"] == []
    materials_response = client.get(
        f"/api/v1/projects/{project_id}/materials",
        headers=superuser_token_headers,
    )
    assert materials_response.status_code == 200
    assert [material["name"] for material in materials_response.json()] == [
        "Soil Testing",
        "Survey",
        "Timber Framing",
    ]
    detail_response = client.get(
        f"/api/v1/projects/{project_id}",
        headers=superuser_token_headers,
    )
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["contract_title"] is None
    assert detail_payload["project_tab"] == "in_progress"
    assert detail_payload["completion_percent"] == "0.00"


def test_create_project_subtask_under_main_task(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    role_name = f"Engineer Task Nested {random_lower_string()[:8]}"
    job_number = f"JOB-TASK-{random_lower_string()[:8]}"
    role = Role(role_name=role_name, description="Engineer role", is_active=True)
    db.add(role)
    db.commit()
    db.refresh(role)

    client_row = Client(
        client_name="Nested Client",
        company_name="Nested Company",
        billing_address="50 Nested Avenue",
    )
    db.add(client_row)
    db.commit()
    db.refresh(client_row)

    status = get_prelim_status(db)

    project = Project(
        job_number=job_number,
        client_id=client_row.id,
        current_status_id=status.id,
        project_name="Nested Task Project",
        start_date=date(2026, 5, 1),
        due_date=date(2026, 6, 1),
        is_active=True,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    milestone = ProjectMilestone(
        project_id=project.id,
        milestone_name="Preliminary Design & Documentation",
        due_date=date(2026, 5, 12),
        display_order=1,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)

    parent_task_response = client.post(
        f"/api/v1/projects/{project.id}/milestones/{milestone.id}/tasks",
        headers=superuser_token_headers,
        json={
            "task_name": "Siteworks Plan Design",
            "due_date": "2026-05-10",
        },
    )
    assert parent_task_response.status_code == 201
    parent_task_id = parent_task_response.json()["id"]

    child_task_response = client.post(
        f"/api/v1/projects/{project.id}/milestones/{milestone.id}/tasks",
        headers=superuser_token_headers,
        json={
            "task_name": "Footing Design & Documentation",
            "parent_task_id": parent_task_id,
            "due_date": "2026-05-11",
            "assigned_role_id": str(role.id),
            "allocated_hours": "18.50",
        },
    )

    assert child_task_response.status_code == 201
    child_payload = child_task_response.json()
    assert child_payload["task_name"] == "Footing Design & Documentation"
    assert child_payload["assigned_role_id"] == str(role.id)
    assert child_payload["allocated_hours"] == "18.50"

    task_response = client.get(
        f"/api/v1/projects/{project.id}/task-management",
        headers=superuser_token_headers,
    )
    assert task_response.status_code == 200
    payload = task_response.json()
    root_task = payload["milestones"][0]["tasks"][0]
    assert root_task["task_name"] == "Siteworks Plan Design"
    assert len(root_task["children"]) == 1
    assert root_task["children"][0]["task_name"] == "Footing Design & Documentation"
    assert root_task["children"][0]["assigned_role_name"] == role_name
    assert root_task["children"][0]["allocated_hours"] == "18.50"
    assert "subcontractor_name" not in root_task["children"][0]
    assert "subcontractor_status" not in root_task["children"][0]


def test_delete_project_milestone_removes_tasks(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    status = get_prelim_status(db)

    client_row = Client(
        client_name=f"Delete Milestone Client {random_lower_string()[:8]}",
        company_name="Delete Milestone Company",
    )
    db.add(client_row)
    db.commit()
    db.refresh(client_row)

    project = Project(
        job_number=f"JOB-DEL-MILESTONE-{random_lower_string()[:8]}",
        client_id=client_row.id,
        current_status_id=status.id,
        project_name="Delete Milestone Project",
        start_date=date(2026, 5, 1),
        due_date=date(2026, 6, 1),
        is_active=True,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    milestone = ProjectMilestone(
        project_id=project.id,
        milestone_name="Design & Documentation",
        due_date=date(2026, 5, 12),
        display_order=1,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    milestone_id = milestone.id

    task = ProjectTask(
        milestone_id=milestone_id,
        task_name="Documentation task",
        due_date=date(2026, 5, 11),
    )
    db.add(task)
    db.commit()

    response = client.delete(
        f"/api/v1/projects/{project.id}/milestones/{milestone_id}",
        headers=superuser_token_headers,
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Milestone deleted successfully"}
    db.expire_all()
    assert db.get(ProjectMilestone, milestone_id) is None
    assert db.exec(
        select(ProjectTask).where(ProjectTask.milestone_id == milestone_id)
    ).all() == []


def test_project_tabs_are_grouped_by_completion_and_invoice_state(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    status = get_prelim_status(db)

    client_row = Client(
        client_name=f"Tabs Client {random_lower_string()[:8]}",
        company_name="Tabs Company",
    )
    db.add(client_row)
    db.commit()
    db.refresh(client_row)

    projects: dict[str, Project] = {}
    for key in ("progress", "invoice", "completed"):
        project = Project(
            job_number=f"JOB-TAB-{key}-{random_lower_string()[:8]}",
            client_id=client_row.id,
            current_status_id=status.id,
            project_name=f"Tab {key}",
            start_date=date(2026, 5, 1),
            due_date=date(2026, 6, 1),
            is_active=True,
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        projects[key] = project

        completed = key in {"invoice", "completed"}
        milestone = ProjectMilestone(
            project_id=project.id,
            milestone_name="Design & Documentation",
            due_date=date(2026, 6, 1),
            is_complete=completed,
            completion_date=date(2026, 6, 1) if completed else None,
            display_order=1,
        )
        db.add(milestone)
        db.commit()
        db.refresh(milestone)

        db.add(
            ProjectMilestone(
                project_id=project.id,
                milestone_name="Preliminary Design & Documentation",
                due_date=date(2026, 5, 15),
                is_complete=completed,
                completion_date=date(2026, 5, 15) if completed else None,
                display_order=2,
            )
        )
        db.add(
            ProjectMilestone(
                project_id=project.id,
                milestone_name="Documentation Review",
                due_date=date(2026, 5, 20),
                is_complete=completed,
                completion_date=date(2026, 5, 20) if completed else None,
                display_order=3,
            )
        )
        db.commit()

    db.add(
        Invoice(
            project_id=projects["completed"].id,
            invoice_number=f"INV-{random_lower_string()[:8]}",
            invoice_date=date(2026, 6, 2),
            invoice_amount=Decimal("1000.00"),
        )
    )
    db.commit()

    in_progress_response = client.get(
        "/api/v1/projects?tab=in_progress",
        headers=superuser_token_headers,
    )
    to_be_invoiced_response = client.get(
        "/api/v1/projects?tab=to_be_invoiced",
        headers=superuser_token_headers,
    )
    completed_response = client.get(
        "/api/v1/projects?tab=completed",
        headers=superuser_token_headers,
    )

    assert in_progress_response.status_code == 200
    assert to_be_invoiced_response.status_code == 200
    assert completed_response.status_code == 200

    in_progress_ids = {item["project_id"] for item in in_progress_response.json()["data"]}
    to_be_invoiced_ids = {item["project_id"] for item in to_be_invoiced_response.json()["data"]}
    completed_ids = {item["project_id"] for item in completed_response.json()["data"]}

    assert str(projects["progress"].id) in in_progress_ids
    assert str(projects["invoice"].id) in to_be_invoiced_ids
    assert str(projects["completed"].id) in completed_ids
