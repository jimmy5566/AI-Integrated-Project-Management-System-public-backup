from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.core.db import engine, init_db
from app.main import app
from app.models import UserCreate, UserUpdate
from tests.utils.user import authentication_token_from_email
from tests.utils.utils import get_superuser_token_headers


def ensure_test_superuser(session: Session) -> None:
    user = crud.get_user_by_email(session=session, email=settings.FIRST_SUPERUSER)
    if not user:
        crud.create_user(
            session=session,
            user_create=UserCreate(
                email=settings.FIRST_SUPERUSER,
                password=settings.FIRST_SUPERUSER_PASSWORD,
                is_superuser=True,
            ),
        )
        return

    crud.update_user(
        session=session,
        db_user=user,
        user_in=UserUpdate(
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        ),
    )


@pytest.fixture(autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        init_db(session)
        ensure_test_superuser(session)
        yield session
        session.rollback()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def superuser_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    ensure_test_superuser(db)
    return get_superuser_token_headers(client)


@pytest.fixture()
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_email(
        client=client, email=settings.EMAIL_TEST_USER, db=db
    )
