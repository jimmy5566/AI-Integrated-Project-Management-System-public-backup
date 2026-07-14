from sqlmodel import Session, select
from datetime import date, datetime, timedelta


from app.models import (
    Subcontractor,
    SubcontractorCreate
)

def get_subcontractors(*, session: Session) -> list[Subcontractor]:
    return list(session.exec(select(Subcontractor)).all())


def create_subcontractor(*, session: Session, subcontractor: SubcontractorCreate) -> Subcontractor:
    db_subcontractor = Subcontractor.model_validate(subcontractor)
    session.add(db_subcontractor)
    session.commit()
    session.refresh(db_subcontractor)
    return db_subcontractor

