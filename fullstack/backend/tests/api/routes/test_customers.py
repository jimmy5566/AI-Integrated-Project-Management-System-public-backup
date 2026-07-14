from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Customer


def test_list_customers_returns_directory_data(
    client: TestClient,
    normal_user_token_headers: dict[str, str],
    db: Session,
) -> None:
    customer = Customer(
        contact_name="Metro Development",
        email="contact@metro.example",
        current_status="Active",
        remarks="Priority account",
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    response = client.get(
        f"{settings.API_V1_STR}/customers/",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["count"] >= 1

    matched = next((item for item in payload["data"] if item["id"] == str(customer.id)), None)
    assert matched is not None
    assert matched["contact_name"] == "Metro Development"
    assert matched["email"] == "contact@metro.example"
    assert matched["current_status"] == "Active"
    assert matched["remarks"] == "Priority account"
