from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

# --- Person Schemas ---
class PersonBase(BaseModel):
    name: str
    relationship_type: str = "self"
    gender: Optional[str] = None
    dob: Optional[str] = None
    blood_group: Optional[str] = None
    notes: Optional[str] = None

class PersonCreate(PersonBase):
    family_id: Optional[str] = None

class PersonResponse(PersonBase):
    id: str
    family_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Observation Schemas ---
class ObservationBase(BaseModel):
    original_test_name: str
    value_text: str
    value_numeric: Optional[float] = None
    original_unit: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    reference_text: Optional[str] = None
    abnormal_flag: Optional[str] = None
    panel_name: Optional[str] = None
    method: Optional[str] = None
    canonical_test_code: Optional[str] = None
    canonical_test_name: Optional[str] = None
    normalized_value: Optional[float] = None
    normalized_unit: Optional[str] = None
    observation_date: Optional[str] = None
    source_page: int = 1
    source_snippet: Optional[str] = None
    source_bbox: Optional[Dict[str, Any]] = None
    extraction_method: str = "digital_parser"
    confidence: float = 1.0
    verification_status: str = "needs_review"

class ObservationUpdate(BaseModel):
    value_text: Optional[str] = None
    value_numeric: Optional[float] = None
    original_unit: Optional[str] = None
    reference_text: Optional[str] = None
    abnormal_flag: Optional[str] = None
    canonical_test_code: Optional[str] = None
    verification_status: str  # verified, corrected, rejected
    correction_notes: Optional[str] = None

class ObservationResponse(ObservationBase):
    id: str
    document_id: str
    person_id: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    correction_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: str
    person_id: str
    filename: str
    sha256: str
    file_size_bytes: int
    mime_type: str
    document_type: str
    document_date: Optional[str] = None
    lab_or_clinic: Optional[str] = None
    referring_doctor: Optional[str] = None
    page_count: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    observation_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class DocumentDetailResponse(DocumentResponse):
    observations: List[ObservationResponse] = []

# --- Verification Bulk Action ---
class BulkVerificationRequest(BaseModel):
    observation_ids: List[str]
    action: str = "verified"  # verified or rejected
    notes: Optional[str] = None

# --- Longitudinal Analytics Schemas ---
class TrendPoint(BaseModel):
    date: str
    value: float
    unit: str
    original_value: str
    original_name: str
    document_id: str
    document_date: Optional[str] = None
    source_page: int
    abnormal_flag: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None

class ParameterTrend(BaseModel):
    canonical_code: str
    canonical_name: str
    unit: str
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    points: List[TrendPoint]

class DoctorVisitSummary(BaseModel):
    person: PersonResponse
    summary_date: str
    total_documents: int
    total_observations: int
    abnormal_observations: List[ObservationResponse]
    key_trends: List[ParameterTrend]
    discussion_points: List[str]
