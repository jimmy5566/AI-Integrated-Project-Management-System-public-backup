from sqlmodel import Session, select

from app.models import (
    ProjectStatusType
)


def get_status_type(*, session: Session, status_name: str) -> ProjectStatusType:
    status_type = session.exec(select(ProjectStatusType).where(ProjectStatusType.status_name == status_name)).first()
    
    if not status_type:
        raise ValueError(f"Status type '{status_name}' does not exist.")

    return status_type
    
def create_status_type(*, session: Session, status_name: str) -> ProjectStatusType:
    status_type = session.exec(
        select(ProjectStatusType).where(ProjectStatusType.status_name == status_name)
    ).first()
    if status_type:
        raise ValueError(f"Status type '{status_name}' already exists.")

    status_type = ProjectStatusType(status_name=status_name)
    session.add(status_type)
    session.commit()
    session.refresh(status_type)
    return status_type


def get_all_status_types(*, session: Session) -> list[ProjectStatusType]:
    return list(session.exec(select(ProjectStatusType)).all())
