import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Employee, Role


def test_list_employees_returns_directory_data(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    role = Role(
        role_name=f"people-page-role-{uuid.uuid4()}",
        description="People page test role",
        is_active=True,
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    employee = Employee(
        first_name="Jane",
        last_name="Doe",
        full_name="Jane Doe",
        email="jane.doe@example.com",
        phone="+61 8 1234 5678",
        role_title="Lead Engineer",
        role_id=role.id,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    response = client.get(
        f"{settings.API_V1_STR}/employees/",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] >= 1

    matched = next((item for item in payload["data"] if item["id"] == str(employee.id)), None)
    assert matched is not None
    assert matched["full_name"] == "Jane Doe"
    assert matched["email"] == "jane.doe@example.com"
    assert matched["phone"] == "+61 8 1234 5678"
    assert matched["role_title"] == "Lead Engineer"
    assert matched["role_name"] == role.role_name
