from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from app import crud
from app.api.deps import SessionDep
from app.models import InvoiceListResponse

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("/finish/{date_str}", response_model=InvoiceListResponse)
def get_finished_invoices(session: SessionDep, date_str: str) -> Any:
    """Return invoices issued since date_str that are overdue (unpaid after 14 days)."""
    try:
        since = datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use dd-mm-yyyy")
    data, total = crud.get_finished_invoices_since(session=session, since=since)
    return InvoiceListResponse(data=data, count=len(data), total=total)


@router.get("/expected/{date_str}", response_model=InvoiceListResponse)
def get_expected_invoices(session: SessionDep, date_str: str) -> Any:
    """Return invoices not yet issued on projects due on or before date_str."""
    try:
        before = datetime.strptime(date_str, "%d-%m-%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use dd-mm-yyyy")
    data, total = crud.get_expected_invoices_before(session=session, before=before)
    return InvoiceListResponse(data=data, count=len(data), total=total)
