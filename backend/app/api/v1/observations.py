from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Observation, AuditLog, Document
from app.schemas.schemas import ObservationResponse, ObservationUpdate, BulkVerificationRequest

router = APIRouter()

@router.get("/observations/{observation_id}", response_model=ObservationResponse)
def get_observation(observation_id: str, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")
    return obs

@router.patch("/observations/{observation_id}", response_model=ObservationResponse)
def update_observation(
    observation_id: str,
    payload: ObservationUpdate,
    db: Session = Depends(get_db)
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(status_code=404, detail="Observation not found")

    old_values = {
        "value_text": obs.value_text,
        "value_numeric": obs.value_numeric,
        "verification_status": obs.verification_status
    }

    if payload.value_text is not None:
        obs.value_text = payload.value_text
    if payload.value_numeric is not None:
        obs.value_numeric = payload.value_numeric
        obs.normalized_value = payload.value_numeric
    if payload.original_unit is not None:
        obs.original_unit = payload.original_unit
    if payload.reference_text is not None:
        obs.reference_text = payload.reference_text
    if payload.abnormal_flag is not None:
        obs.abnormal_flag = payload.abnormal_flag
    if payload.canonical_test_code is not None:
        obs.canonical_test_code = payload.canonical_test_code

    obs.verification_status = payload.verification_status
    obs.correction_notes = payload.correction_notes
    obs.verified_at = datetime.utcnow()
    obs.verified_by = "user"

    # Audit log
    audit = AuditLog(
        entity_type="observation",
        entity_id=obs.id,
        action=f"verify_{payload.verification_status}",
        details={
            "old": old_values,
            "new": {
                "value_text": obs.value_text,
                "value_numeric": obs.value_numeric,
                "verification_status": obs.verification_status,
                "notes": payload.correction_notes
            }
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(obs)

    # Check if all observations in document are now verified
    unverified_count = db.query(Observation)\
        .filter(Observation.document_id == obs.document_id, Observation.verification_status == "needs_review")\
        .count()
    if unverified_count == 0:
        doc = db.query(Document).filter(Document.id == obs.document_id).first()
        if doc:
            doc.status = "verified"
            db.commit()

    return obs

@router.post("/observations/bulk-verify")
def bulk_verify(payload: BulkVerificationRequest, db: Session = Depends(get_db)):
    observations = db.query(Observation).filter(Observation.id.in_(payload.observation_ids)).all()
    if not observations:
        return {"updated_count": 0}

    doc_ids = set()
    for obs in observations:
        obs.verification_status = payload.action
        obs.verified_at = datetime.utcnow()
        obs.verified_by = "user"
        if payload.notes:
            obs.correction_notes = payload.notes
        doc_ids.add(obs.document_id)

    # Audit log
    audit = AuditLog(
        entity_type="observation_bulk",
        entity_id="bulk",
        action=payload.action,
        details={"count": len(observations), "ids": payload.observation_ids}
    )
    db.add(audit)
    db.commit()

    # Update document status if all verified
    for d_id in doc_ids:
        remaining = db.query(Observation).filter(
            Observation.document_id == d_id,
            Observation.verification_status == "needs_review"
        ).count()
        if remaining == 0:
            doc = db.query(Document).filter(Document.id == d_id).first()
            if doc:
                doc.status = "verified"
                db.commit()

    return {"updated_count": len(observations), "status": payload.action}
