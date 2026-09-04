from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.doctor_summary_service import DoctorSummaryService

router = APIRouter()

@router.get("/doctor-visit/summary")
async def get_doctor_visit_summary(person_id: str, db: Session = Depends(get_db)):
    return await DoctorSummaryService.generate_summary_async(db, person_id)
