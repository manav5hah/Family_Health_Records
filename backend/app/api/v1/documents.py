from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import json

from app.core.database import get_db
from app.models.models import Document, Observation, Person, AuditLog
from app.schemas.schemas import DocumentResponse, DocumentDetailResponse
from app.services.storage_service import StorageService
from app.services.pdf_service import PDFService
from app.services.extraction_service import ExtractionService

router = APIRouter()

@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(person_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Document)
    if person_id:
        query = query.filter(Document.person_id == person_id)
    docs = query.order_by(Document.created_at.desc()).all()

    result = []
    for d in docs:
        obs_count = db.query(Observation).filter(Observation.document_id == d.id).count()
        doc_dict = {
            "id": d.id,
            "person_id": d.person_id,
            "filename": d.filename,
            "sha256": d.sha256,
            "file_size_bytes": d.file_size_bytes,
            "mime_type": d.mime_type,
            "document_type": d.document_type,
            "document_date": d.document_date,
            "lab_or_clinic": d.lab_or_clinic,
            "referring_doctor": d.referring_doctor,
            "page_count": d.page_count,
            "status": d.status,
            "notes": d.notes,
            "created_at": d.created_at,
            "updated_at": d.updated_at,
            "observation_count": obs_count
        }
        result.append(doc_dict)
    return result

@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    obs = db.query(Observation).filter(Observation.document_id == document_id).order_by(Observation.source_page.asc()).all()
    
    return {
        "id": doc.id,
        "person_id": doc.person_id,
        "filename": doc.filename,
        "sha256": doc.sha256,
        "file_size_bytes": doc.file_size_bytes,
        "mime_type": doc.mime_type,
        "document_type": doc.document_type,
        "document_date": doc.document_date,
        "lab_or_clinic": doc.lab_or_clinic,
        "referring_doctor": doc.referring_doctor,
        "page_count": doc.page_count,
        "status": doc.status,
        "notes": doc.notes,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "observation_count": len(obs),
        "observations": obs
    }

@router.get("/documents/{document_id}/pdf")
def stream_pdf(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(doc.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Original document file not found on disk")
    
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=doc.filename,
        content_disposition_type="inline"
    )

@router.post("/documents/upload", response_model=DocumentDetailResponse)
async def upload_document(
    file: UploadFile = File(...),
    person_id: str = Form(...),
    document_type: str = Form("lab_report"),
    db: Session = Depends(get_db)
):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    content = await file.read()
    sha256, storage_path, file_size = StorageService.save_document(
        file_bytes=content,
        family_id=person.family_id,
        person_id=person.id,
        original_filename=file.filename or "report.pdf"
    )

    # Check if duplicate
    existing = db.query(Document).filter(Document.sha256 == sha256, Document.person_id == person_id).first()
    if existing:
        return get_document(existing.id, db)

    # Extract text and blocks via PyMuPDF
    pdf_info = PDFService.extract_document_info(storage_path)

    doc = Document(
        person_id=person_id,
        filename=file.filename or "report.pdf",
        storage_path=storage_path,
        sha256=sha256,
        file_size_bytes=file_size,
        mime_type=file.content_type or "application/pdf",
        document_type=document_type,
        document_date=pdf_info.get("document_date"),
        lab_or_clinic=pdf_info.get("lab_or_clinic"),
        referring_doctor=pdf_info.get("referring_doctor"),
        page_count=pdf_info.get("page_count", 1),
        status="processing",
        raw_pages_data=pdf_info.get("pages")
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Extract structured observations
    extracted_obs = ExtractionService.parse_digital_blocks(
        pages_data=pdf_info.get("pages", []),
        doc_date=doc.document_date
    )
    
    if not extracted_obs:
        extracted_obs = await ExtractionService.extract_with_vision_llm(
            file_path=storage_path,
            doc_date=doc.document_date
        )
    
    if not extracted_obs:
        extracted_obs = await ExtractionService.extract_with_vision_llm(
            file_path=storage_path,
            doc_date=doc.document_date
        )

    saved_observations = []
    for item in extracted_obs:
        obs = Observation(
            document_id=doc.id,
            person_id=person_id,
            panel_name=item.get("panel_name"),
            original_test_name=item["original_test_name"],
            value_text=item["value_text"],
            value_numeric=item.get("value_numeric"),
            original_unit=item.get("original_unit"),
            reference_low=item.get("reference_low"),
            reference_high=item.get("reference_high"),
            reference_text=item.get("reference_text"),
            abnormal_flag=item.get("abnormal_flag"),
            method=item.get("method"),
            canonical_test_code=item.get("canonical_test_code"),
            canonical_test_name=item.get("canonical_test_name"),
            normalized_value=item.get("normalized_value"),
            normalized_unit=item.get("normalized_unit"),
            observation_date=item.get("observation_date") or doc.document_date,
            source_page=item.get("source_page", 1),
            source_snippet=item.get("source_snippet"),
            source_bbox=item.get("source_bbox"),
            extraction_method=item.get("extraction_method", "digital_parser"),
            confidence=item.get("confidence", 0.95),
            verification_status=item.get("verification_status", "needs_review")
        )
        db.add(obs)
        saved_observations.append(obs)

    doc.status = "extracted"
    db.commit()
    db.refresh(doc)

    # Audit log
    audit = AuditLog(
        entity_type="document",
        entity_id=doc.id,
        action="upload_and_extract",
        details={"filename": doc.filename, "extracted_count": len(saved_observations)}
    )
    db.add(audit)
    db.commit()

    return {
        "id": doc.id,
        "person_id": doc.person_id,
        "filename": doc.filename,
        "sha256": doc.sha256,
        "file_size_bytes": doc.file_size_bytes,
        "mime_type": doc.mime_type,
        "document_type": doc.document_type,
        "document_date": doc.document_date,
        "lab_or_clinic": doc.lab_or_clinic,
        "referring_doctor": doc.referring_doctor,
        "page_count": doc.page_count,
        "status": doc.status,
        "notes": doc.notes,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "observation_count": len(saved_observations),
        "observations": saved_observations
    }

@router.post("/documents/ingest-sample")
async def ingest_sample_file(db: Session = Depends(get_db)):
    """
    Convenience endpoint to ingest the sample PDF in the workspace.
    """
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    sample_path = base_dir / "TestReport_GIRA K SHAH_60900104556_c874e454-3150-43f5-b29c-5d0002bf7800.pdf"
    if not sample_path.exists():
        sample_path = base_dir / "sample_reports" / "TestReport_GIRA K SHAH_60900104556_c874e454-3150-43f5-b29c-5d0002bf7800.pdf"
    
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample PDF not found in workspace")

    # Ensure default family and person exist
    person = db.query(Person).filter(Person.name == "Mrs. Gira K Shah").first()
    if not person:
        from app.api.v1.persons import get_or_create_default_family
        get_or_create_default_family(db)
        person = db.query(Person).first()

    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    sha256, storage_path, file_size = StorageService.save_document(
        file_bytes=file_bytes,
        family_id=person.family_id,
        person_id=person.id,
        original_filename=sample_path.name
    )

    existing = db.query(Document).filter(Document.sha256 == sha256, Document.person_id == person.id).first()
    if existing:
        return get_document(existing.id, db)

    pdf_info = PDFService.extract_document_info(storage_path)

    doc = Document(
        person_id=person.id,
        filename=sample_path.name,
        storage_path=storage_path,
        sha256=sha256,
        file_size_bytes=file_size,
        mime_type="application/pdf",
        document_type="lab_report",
        document_date=pdf_info.get("document_date"),
        lab_or_clinic=pdf_info.get("lab_or_clinic"),
        referring_doctor=pdf_info.get("referring_doctor"),
        page_count=pdf_info.get("page_count", 1),
        status="processing",
        raw_pages_data=pdf_info.get("pages")
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    extracted_obs = ExtractionService.parse_digital_blocks(
        pages_data=pdf_info.get("pages", []),
        doc_date=doc.document_date
    )
    
    if not extracted_obs:
        extracted_obs = await ExtractionService.extract_with_vision_llm(
            file_path=storage_path,
            doc_date=doc.document_date
        )

    saved_observations = []
    for item in extracted_obs:
        obs = Observation(
            document_id=doc.id,
            person_id=person.id,
            panel_name=item.get("panel_name"),
            original_test_name=item["original_test_name"],
            value_text=item["value_text"],
            value_numeric=item.get("value_numeric"),
            original_unit=item.get("original_unit"),
            reference_low=item.get("reference_low"),
            reference_high=item.get("reference_high"),
            reference_text=item.get("reference_text"),
            abnormal_flag=item.get("abnormal_flag"),
            method=item.get("method"),
            canonical_test_code=item.get("canonical_test_code"),
            canonical_test_name=item.get("canonical_test_name"),
            normalized_value=item.get("normalized_value"),
            normalized_unit=item.get("normalized_unit"),
            observation_date=item.get("observation_date") or doc.document_date,
            source_page=item.get("source_page", 1),
            source_snippet=item.get("source_snippet"),
            source_bbox=item.get("source_bbox"),
            extraction_method="digital_parser",
            confidence=item.get("confidence", 0.95),
            verification_status="needs_review"
        )
        db.add(obs)
        saved_observations.append(obs)

    doc.status = "extracted"
    db.commit()
    db.refresh(doc)

    return get_document(doc.id, db)

@router.delete("/documents/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    filename = doc.filename
    storage_path = doc.storage_path

    # Delete all observations associated with this document
    obs_deleted = db.query(Observation).filter(Observation.document_id == document_id).delete()

    # Safely delete physical file on disk if it exists
    StorageService.delete_document_file(storage_path)

    # Delete document record
    db.delete(doc)

    # Audit log
    audit = AuditLog(
        entity_type="document",
        entity_id=document_id,
        action="delete_document",
        details={"filename": filename, "observations_removed": obs_deleted}
    )
    db.add(audit)
    db.commit()

    return {
        "status": "deleted",
        "id": document_id,
        "filename": filename,
        "observations_removed": obs_deleted
    }

