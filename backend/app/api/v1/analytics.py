from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.services.analytics_service import AnalyticsService

router = APIRouter()

@router.get("/analytics/trends")
def get_trends(
    person_id: str,
    codes: Optional[str] = Query(None, description="Comma-separated canonical codes"),
    db: Session = Depends(get_db)
):
    code_list = [c.strip() for c in codes.split(",") if c.strip()] if codes else None
    return AnalyticsService.get_person_trends(db, person_id, code_list)

@router.get("/analytics/matrix")
def get_comparison_matrix(person_id: str, db: Session = Depends(get_db)):
    return AnalyticsService.get_comparison_matrix(db, person_id)
