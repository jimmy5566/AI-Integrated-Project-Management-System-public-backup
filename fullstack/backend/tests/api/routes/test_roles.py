import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models import Employee, Role
from tests.utils.utils import random_lower_string


def create_role_name() -> str:
    return f"role-{random_lower_string()[:12]}"


def test_list_roles_requires_authentication(client: TestClient) -> None:
    response = client.get("/api/v1/roles/")
    assert response.status_code == 401


def test_create_role_requires_superuser(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/roles/",
        headers=normal_user_token_headers,
        json={"role_name": create_role_name(), "description": "Test role", "is_active": True},
    )
    assert response.status_code == 403
    assert response.json() == {"detail": "The user doesn't have enough privileges"}


def test_create_and_get_role(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    role_name = create_role_name()
    create_response = client.post(
        "/api/v1/roles/",
        headers=superuser_token_headers,
        json={"role_name": role_name, "description": "Project manager", "is_active": True},
    )
    assert create_response.status_code == 200

    created_role = create_response.json()
    get_response = client.get(
        f"/api/v1/roles/{created_role['id']}",
        headers=superuser_token_headers,
    )
    assert get_response.status_code == 200
    fetched_role = get_response.json()
    assert fetched_role["id"] == created_role["id"]
    assert fetched_role["role_name"] == role_name


def test_create_role_rejects_duplicate_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    role_name = create_role_name()
    first_response = client.post(
        "/api/v1/roles/",
        headers=superuser_token_headers,
        json={"role_name": role_name, "description": "First", "is_active": True},
    )
    assert first_response.status_code == 200

    second_response = client.post(
        "/api/v1/roles/",
        headers=superuser_token_headers,
        json={"role_name": role_name, "description": "Duplicate", "is_active": True},
    )
    assert second_response.status_code == 409
    assert second_response.json() == {"detail": "Role name already exists"}


def test_update_role_rejects_duplicate_name(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    first_role_name = create_role_name()
    second_role_name = create_role_name()

    first_response = client.post(
        "/api/v1/roles/",
        headers=superuser_token_headers,
        json={"role_name": first_role_name, "description": "First", "is_active": True},
    )
    second_response = client.post(
        "/api/v1/roles/",
        headers=superuser_token_headers,
        json={"role_name": second_role_name, "description": "Second", "is_active": True},
    )
    assert first_response.status_code == 200
    assert second_response.status_code == 200

    response = client.put(
        f"/api/v1/roles/{second_response.json()['id']}",
        headers=superuser_token_headers,
        json={"role_name": first_role_name},
    )
    assert response.status_code == 409
    assert response.json() == {"detail": "Role name already exists"}


def test_delete_role_rejects_role_in_use(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    role = Role(role_name=create_role_name(), description="In use", is_active=True)
    db.add(role)
    db.commit()
    db.refresh(role)

    employee = Employee(
        first_name="Test",
        last_name="Engineer",
        full_name="Test Engineer",
        role_id=role.id,
        is_active=True,
    )
    db.add(employee)
    db.commit()

    response = client.delete(
        f"/api/v1/roles/{role.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 400
    assert response.json() == {"detail": "Role is in use and cannot be deleted"}


def test_delete_role_removes_unused_role(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    db: Session,
) -> None:
    role = Role(role_name=create_role_name(), description="Unused", is_active=True)
    db.add(role)
    db.commit()
    db.refresh(role)

    response = client.delete(
        f"/api/v1/roles/{role.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json() == {"message": "Role deleted successfully"}
    assert db.exec(select(Role).where(Role.id == role.id)).first() is None


def test_get_nonexistent_role_returns_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"/api/v1/roles/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json() == {"detail": "Role not found"}
