import os
import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.models import Family, Person, Document, Observation
from app.services.storage_service import StorageService
from app.services.pdf_service import PDFService
from app.services.extraction_service import ExtractionService
from app.services.normalization_service import MedicalNormalizer
from app.services.analytics_service import AnalyticsService
from app.services.doctor_summary_service import DoctorSummaryService

TEST_DB = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_normalization():
    code, name, unit = MedicalNormalizer.match_canonical("S. Creatinine")
    assert code == "creatinine"
    assert unit == "mg/dL"

    code2, name2, unit2 = MedicalNormalizer.match_canonical("Plasma Glucose - F")
    assert code2 == "glucose_fasting"

    code3, name3, unit3 = MedicalNormalizer.match_canonical("HbA1c")
    assert code3 == "hba1c"

def test_sample_pdf_pipeline(db_session):
    base_dir = Path(__file__).resolve().parent.parent.parent
    pdf_path = base_dir / "TestReport_GIRA K SHAH_60900104556_c874e454-3150-43f5-b29c-5d0002bf7800.pdf"
    if not pdf_path.exists():
        pdf_path = base_dir / "sample_reports" / "TestReport_GIRA K SHAH_60900104556_c874e454-3150-43f5-b29c-5d0002bf7800.pdf"
    assert pdf_path.exists(), "Sample PDF must exist"

    # 1. Family & Person setup
    family = Family(name="Test Family")
    db_session.add(family)
    db_session.commit()

    person = Person(
        family_id=family.id,
        name="Mrs. Gira K Shah",
        relationship_type="Mother",
        gender="Female",
        dob="51 Years"
    )
    db_session.add(person)
    db_session.commit()

    # 2. Extract PDF info
    pdf_info = PDFService.extract_document_info(str(pdf_path))
    assert pdf_info["page_count"] == 10
    assert "GIRA" in pdf_info["patient_name"].upper()

    # 3. Save Document
    doc = Document(
        person_id=person.id,
        filename=pdf_path.name,
        storage_path=str(pdf_path),
        sha256="test_sha256",
        file_size_bytes=pdf_path.stat().st_size,
        mime_type="application/pdf",
        document_type="lab_report",
        document_date=pdf_info.get("document_date"),
        lab_or_clinic=pdf_info.get("lab_or_clinic"),
        referring_doctor=pdf_info.get("referring_doctor"),
        page_count=pdf_info.get("page_count"),
        status="processing"
    )
    db_session.add(doc)
    db_session.commit()

    # 4. Extract Observations
    extracted = ExtractionService.parse_digital_blocks(pdf_info["pages"], doc.document_date)
    assert len(extracted) > 20, f"Expected > 20 observations, got {len(extracted)}"

    for item in extracted:
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
            canonical_test_code=item.get("canonical_test_code"),
            canonical_test_name=item.get("canonical_test_name"),
            normalized_value=item.get("normalized_value"),
            normalized_unit=item.get("normalized_unit"),
            observation_date=item.get("observation_date"),
            source_page=item.get("source_page"),
            source_bbox=item.get("source_bbox"),
            confidence=item.get("confidence", 0.95),
            verification_status="needs_review"
        )
        db_session.add(obs)

    doc.status = "extracted"
    db_session.commit()

    # 5. Test Analytics Trends
    trends = AnalyticsService.get_person_trends(db_session, person.id)
    assert len(trends) > 5

    # Check HbA1c
    hba1c_trend = next((t for t in trends if t["canonical_code"] == "hba1c"), None)
    assert hba1c_trend is not None
    assert hba1c_trend["points"][0]["value"] == 6.0

    # 6. Test Doctor Visit Summary
    summary = DoctorSummaryService.generate_summary(db_session, person.id)
    assert len(summary["abnormal_findings"]) > 0
    assert len(summary["discussion_points"]) > 0
    print("\nGenerated Doctor Discussion Points:")
    for dp in summary["discussion_points"]:
        print(f"- [{dp['topic']}]: {dp['suggested_question']}")
