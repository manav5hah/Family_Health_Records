export interface Person {
  id: string;
  family_id: string;
  name: string;
  relationship_type: string;
  gender?: string;
  dob?: string;
  blood_group?: string;
  notes?: string;
}

export interface Observation {
  id: string;
  document_id: string;
  person_id: string;
  panel_name?: string;
  original_test_name: string;
  value_text: string;
  value_numeric?: number;
  original_unit?: string;
  reference_low?: number;
  reference_high?: number;
  reference_text?: string;
  abnormal_flag?: string; // H, L, HH, LL, A
  method?: string;
  canonical_test_code?: string;
  canonical_test_name?: string;
  normalized_value?: number;
  normalized_unit?: string;
  observation_date?: string;
  source_page: number;
  source_snippet?: string;
  source_bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  extraction_method: string;
  confidence: number;
  verification_status: 'needs_review' | 'verified' | 'corrected' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  correction_notes?: string;
}

export interface DocumentItem {
  id: string;
  person_id: string;
  filename: string;
  sha256: string;
  file_size_bytes: number;
  mime_type: string;
  document_type: string;
  document_date?: string;
  lab_or_clinic?: string;
  referring_doctor?: string;
  page_count: number;
  status: 'uploaded' | 'processing' | 'extracted' | 'verified' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
  observation_count: number;
  observations?: Observation[];
}

export interface TrendPoint {
  date: string;
  value: number;
  unit: string;
  original_value: string;
  original_name: string;
  document_id: string;
  document_date?: string;
  source_page: number;
  abnormal_flag?: string;
  reference_low?: number;
  reference_high?: number;
  verification_status: string;
}

export interface ParameterTrend {
  canonical_code: string;
  canonical_name: string;
  category: string;
  unit: string;
  reference_low?: number;
  reference_high?: number;
  points: TrendPoint[];
  latest_value?: number;
  latest_date?: string;
  is_abnormal: boolean;
}

export interface ComparisonMatrix {
  dates: string[];
  rows: {
    canonical_code: string;
    canonical_name: string;
    unit: string;
    values: Record<string, {
      value?: number;
      display: string;
      abnormal_flag?: string;
    }>;
  }[];
}

export interface DiscussionPoint {
  topic: string;
  observation: string;
  suggested_question: string;
  source: string;
}

export interface DoctorVisitSummary {
  patient: {
    id: string;
    name: string;
    gender?: string;
    dob?: string;
    relationship?: string;
    blood_group?: string;
  };
  summary_date: string;
  total_documents: number;
  total_observations: number;
  abnormal_findings: {
    test_name: string;
    canonical_name?: string;
    value: string;
    unit?: string;
    flag?: string;
    reference?: string;
    source_page: number;
    date?: string;
  }[];
  key_trends: ParameterTrend[];
  discussion_points: DiscussionPoint[];
  overall_observation?: string;
}
