from pathlib import Path
from app.core.database import SessionLocal, Base, engine
from app.models.models import Family, Person, Document, Observation
from app.services.storage_service import StorageService
from app.services.pdf_service import PDFService
from app.services.extraction_service import ExtractionService

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Create Family
    family = db.query(Family).first()
    if not family:
        family = Family(name="Shah Family Health Records")
        db.add(family)
        db.commit()
        db.refresh(family)

    # Create Person: Mrs. Gira K Shah
    person = db.query(Person).filter(Person.name == "Mrs. Gira K Shah").first()
    if not person:
        person = Person(
            family_id=family.id,
            name="Mrs. Gira K Shah",
            relationship_type="Mother",
            gender="Female",
            dob="51 Years",
            blood_group="B+"
        )
        db.add(person)
        db.commit()
        db.refresh(person)

    # Ingest sample PDF
    base_dir = Path(__file__).resolve().parent.parent.parent
    sample_path = base_dir / "sample_reports" / "TestReport_GIRA K SHAH_60900104556_c874e454-3150-43f5-b29c-5d0002bf7800.pdf"
    if not sample_path.exists():
        sample_path = base_dir / "TestReport_GIRA K SHAH_60900104556_c874e454-3150-43f5-b29c-5d0002bf7800.pdf"

    if sample_path.exists():
        with open(sample_path, "rb") as f:
            file_bytes = f.read()

        sha256, storage_path, file_size = StorageService.save_document(
            file_bytes=file_bytes,
            family_id=family.id,
            person_id=person.id,
            original_filename=sample_path.name
        )

        doc = db.query(Document).filter(Document.sha256 == sha256).first()
        if not doc:
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
                status="extracted",
                raw_pages_data=pdf_info.get("pages")
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            extracted_obs = ExtractionService.parse_digital_blocks(
                pages_data=pdf_info.get("pages", []),
                doc_date=doc.document_date
            )

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
            db.commit()
            print(f"Successfully seeded document and {len(extracted_obs)} observations!")
        else:
            print("Document already seeded.")

    db.close()

if __name__ == "__main__":
    seed()
