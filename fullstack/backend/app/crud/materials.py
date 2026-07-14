from sqlmodel import Session, select
from datetime import date, datetime, timedelta


from app.models import (
    Material,
    SubcontractorStatus
)


def get_material_statuses(*, session: Session) -> list[str]:
    return [status.value for status in SubcontractorStatus]

def get_materials_by_due_date_and_status(
    *,
    session: Session,
    start: date | None = None,
    end: date | None = None,
    status: str | None = None,
) -> list[Material]:
    query = select(Material)

    if start is not None:
        query = query.where(Material.due_date >= start)
    if end is not None:
        query = query.where(Material.due_date <= end)
    if status is not None:
        query = query.where(Material.status == status)

    return list(session.exec(query).all())