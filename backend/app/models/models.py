import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Family(Base):
    __tablename__ = "families"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, default="My Family")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("Person", back_populates="family", cascade="all, delete-orphan")

class Person(Base):
    __tablename__ = "persons"

    id = Column(String, primary_key=True, default=generate_uuid)
    family_id = Column(String, ForeignKey("families.id"), nullable=False)
    name = Column(String, nullable=False)
    relationship_type = Column(String, default="self")  # self, father, mother, spouse, child, other
    gender = Column(String, nullable=True)             # Male, Female, Other
    dob = Column(String, nullable=True)                # YYYY-MM-DD or approx age
    blood_group = Column(String, nullable=True)        # A+, B+, O+, etc.
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    family = relationship("Family", back_populates="members")
    documents = relationship("Document", back_populates="person", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="person", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    person_id = Column(String, ForeignKey("persons.id"), nullable=False)
    filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    sha256 = Column(String, nullable=False, index=True)
    file_size_bytes = Column(Integer, default=0)
    mime_type = Column(String, default="application/pdf")
    document_type = Column(String, default="lab_report")  # lab_report, prescription, discharge_summary, imaging, other
    document_date = Column(String, nullable=True)         # YYYY-MM-DD or formatted string
    lab_or_clinic = Column(String, nullable=True)
    referring_doctor = Column(String, nullable=True)
    page_count = Column(Integer, default=1)
    status = Column(String, default="uploaded")          # uploaded, processing, extracted, verified, failed
    notes = Column(Text, nullable=True)
    raw_pages_data = Column(JSON, nullable=True)          # Page texts, layout blocks, metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    person = relationship("Person", back_populates="documents")
    observations = relationship("Observation", back_populates="document", cascade="all, delete-orphan")

class Observation(Base):
    __tablename__ = "observations"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False, index=True)
    person_id = Column(String, ForeignKey("persons.id"), nullable=False, index=True)
    panel_name = Column(String, nullable=True)           # e.g. Renal Function Test, Lipid Profile
    
    # Original reported data (Immutable source provenance)
    original_test_name = Column(String, nullable=False)
    value_text = Column(String, nullable=False)
    value_numeric = Column(Float, nullable=True)
    original_unit = Column(String, nullable=True)
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    reference_text = Column(String, nullable=True)
    abnormal_flag = Column(String, nullable=True)        # H, L, HH, LL, A
    method = Column(String, nullable=True)

    # Normalized canonical representation
    canonical_test_code = Column(String, nullable=True, index=True) # e.g. creatinine, hba1c
    canonical_test_name = Column(String, nullable=True)             # e.g. Serum Creatinine
    normalized_value = Column(Float, nullable=True)
    normalized_unit = Column(String, nullable=True)

    # Date and Source Linking (Provenance)
    observation_date = Column(String, nullable=True, index=True)    # YYYY-MM-DD
    source_page = Column(Integer, default=1)                        # 1-indexed page
    source_snippet = Column(Text, nullable=True)
    source_bbox = Column(JSON, nullable=True)                       # {x0, y0, x1, y1}
    extraction_method = Column(String, default="digital_parser")    # digital_parser, llm, ocr
    confidence = Column(Float, default=1.0)

    # Verification / Human-in-the-loop
    verification_status = Column(String, default="needs_review")    # needs_review, verified, corrected, rejected
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    correction_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document", back_populates="observations")
    person = relationship("Person", back_populates="observations")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String, nullable=False) # document, observation, person
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False)      # create, verify, correct, reject, delete
    user_id = Column(String, default="local_user")
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
