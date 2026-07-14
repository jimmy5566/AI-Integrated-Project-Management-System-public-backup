from datetime import date
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, status as http_status

from app import crud
from app.api.deps import SessionDep, get_current_active_superuser, get_current_user
from app.models import (
    SubcontractorCreate,
    SubcontractorPublic
)

router = APIRouter(
    prefix="/subcontractors",
    tags=["subcontractors"],
    dependencies=[Depends(get_current_user)],
)



@router.post("/", response_model=SubcontractorPublic, status_code=http_status.HTTP_201_CREATED)
def create_subcontractor( subcontractor: SubcontractorCreate, session: SessionDep) -> SubcontractorPublic:
    created = crud.create_subcontractor(session=session, subcontractor=subcontractor)
    return SubcontractorPublic.model_validate(created)

@router.get("/", response_model=list[SubcontractorPublic])
def list_subcontractors(session: SessionDep) -> list[SubcontractorPublic]:
    subcontractors = crud.get_subcontractors(session=session)
    return [SubcontractorPublic.model_validate(sub) for sub in subcontractors]