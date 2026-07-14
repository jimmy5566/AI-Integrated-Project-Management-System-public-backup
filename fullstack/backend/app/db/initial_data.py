from app.crud.project_statuses import get_status_type, create_status_type
from app.models import ProjectStatus, Role # ------ Igie added role----
from sqlmodel import Session, select


def ensure_project_status_types(session: Session) -> None:
    for status in ProjectStatus:
        try:
            get_status_type(session=session, status_name=status.value)
        except ValueError:
            create_status_type(session=session, status_name=status.value)


# --------- Igie -----------
from app.models import Role

def ensure_roles(session):
    roles = ["drafter", "engineer", "project_manager"]

    for role_name in roles:
        exists = session.exec(
            select(Role).where(Role.role_name == role_name)
        ).first()

        if not exists:
            session.add(
                Role(
                    role_name=role_name,
                    description=f"{role_name} role",
                    is_active=True,
                )
            )

    session.commit()
# --------- Igie -----------