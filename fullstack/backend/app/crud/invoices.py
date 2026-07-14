from datetime import date, timedelta
from decimal import Decimal

from sqlmodel import Session, col, func, select

from app.models import Invoice, InvoiceDetail, Project

_OVERDUE_DAYS = 14


def get_finished_invoices_since(
    *, session: Session, since: date
) -> tuple[list[InvoiceDetail], Decimal]:
    """Invoices issued since `since` that are overdue: not paid and issued >14 days ago."""
    overdue_cutoff = date.today() - timedelta(days=_OVERDUE_DAYS)
    invoices = session.exec(
        select(Invoice)
        .where(Invoice.invoice_date >= since)
        .where(Invoice.invoice_date <= overdue_cutoff)
        .where(Invoice.paid_date == None)
        .order_by(col(Invoice.invoice_date).asc())
    ).all()

    result = []
    for inv in invoices:
        project = session.get(Project, inv.project_id)
        result.append(InvoiceDetail(
            invoice_id=inv.id,
            project_id=inv.project_id,
            project_name=project.project_name if project else None,
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            invoice_amount=inv.invoice_amount,
            paid_date=inv.paid_date,
        ))

    total = session.exec(
        select(func.sum(Invoice.invoice_amount))
        .where(Invoice.invoice_date >= since)
        .where(Invoice.invoice_date <= overdue_cutoff)
        .where(Invoice.paid_date == None)
    ).one() or Decimal("0")

    return result, total


def get_expected_invoices_before(
    *, session: Session, before: date
) -> tuple[list[InvoiceDetail], Decimal]:
    """Invoices not yet issued on active projects whose due_date is on or before `before`."""
    invoices = session.exec(
        select(Invoice)
        .join(Project, Invoice.project_id == Project.id)
        .where(Invoice.invoice_date == None)
        .where(Project.due_date <= before)
        .where(Project.is_active == True)
        .order_by(col(Project.due_date).asc())
    ).all()

    result = []
    for inv in invoices:
        project = session.get(Project, inv.project_id)
        result.append(InvoiceDetail(
            invoice_id=inv.id,
            project_id=inv.project_id,
            project_name=project.project_name if project else None,
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            invoice_amount=inv.invoice_amount,
            paid_date=inv.paid_date,
        ))

    total = session.exec(
        select(func.sum(Invoice.invoice_amount))
        .join(Project, Invoice.project_id == Project.id)
        .where(Invoice.invoice_date == None)
        .where(Project.due_date <= before)
        .where(Project.is_active == True)
    ).one() or Decimal("0")

    return result, total
