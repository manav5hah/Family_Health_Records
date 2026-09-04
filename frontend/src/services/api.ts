import type { Person, DocumentItem, ParameterTrend, ComparisonMatrix, DoctorVisitSummary, Observation } from './types';

const API_BASE = 'http://localhost:8000/api/v1';

export const api = {
  async getFamily(): Promise<{ id: string; name: string; members: Person[] }> {
    const res = await fetch(`${API_BASE}/families/default`);
    return res.json();
  },

  async getPersons(): Promise<Person[]> {
    const res = await fetch(`${API_BASE}/persons`);
    return res.json();
  },

  async createPerson(data: Partial<Person>): Promise<Person> {
    const res = await fetch(`${API_BASE}/persons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getDocuments(personId?: string): Promise<DocumentItem[]> {
    const url = personId ? `${API_BASE}/documents?person_id=${personId}` : `${API_BASE}/documents`;
    const res = await fetch(url);
    return res.json();
  },

  async getDocument(documentId: string): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/${documentId}`);
    return res.json();
  },

  getPdfUrl(documentId: string): string {
    return `${API_BASE}/documents/${documentId}/pdf`;
  },

  async deleteDocument(documentId: string): Promise<{ status: string; id: string; filename: string }> {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async uploadDocument(file: File, personId: string, documentType: string = 'lab_report'): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('person_id', personId);
    formData.append('document_type', documentType);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async ingestSample(): Promise<DocumentItem> {
    const res = await fetch(`${API_BASE}/documents/ingest-sample`, {
      method: 'POST',
    });
    return res.json();
  },

  async updateObservation(
    observationId: string,
    payload: {
      value_text?: string;
      value_numeric?: number;
      original_unit?: string;
      reference_text?: string;
      abnormal_flag?: string;
      canonical_test_code?: string;
      verification_status: 'verified' | 'corrected' | 'rejected';
      correction_notes?: string;
    }
  ): Promise<Observation> {
    const res = await fetch(`${API_BASE}/observations/${observationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async bulkVerify(observationIds: string[], action: 'verified' | 'rejected' = 'verified', notes?: string) {
    const res = await fetch(`${API_BASE}/observations/bulk-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observation_ids: observationIds, action, notes }),
    });
    return res.json();
  },

  async getTrends(personId: string, codes?: string[]): Promise<ParameterTrend[]> {
    let url = `${API_BASE}/analytics/trends?person_id=${personId}`;
    if (codes && codes.length > 0) {
      url += `&codes=${codes.join(',')}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  async getMatrix(personId: string): Promise<ComparisonMatrix> {
    const res = await fetch(`${API_BASE}/analytics/matrix?person_id=${personId}`);
    return res.json();
  },

  async getDoctorSummary(personId: string): Promise<DoctorVisitSummary> {
    const res = await fetch(`${API_BASE}/doctor-visit/summary?person_id=${personId}`);
    return res.json();
  }
};
