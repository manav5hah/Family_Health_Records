import type { Person, DocumentItem, ParameterTrend, ComparisonMatrix, DoctorVisitSummary, Observation } from './types';
import { mockStore } from './mockStore';

const API_BASE = 'http://localhost:8000/api/v1';

// Automatically detect GitHub Pages or static hosting
const isStaticHost = typeof window !== 'undefined' && (
  window.location.hostname.endsWith('github.io') ||
  window.location.protocol === 'https:' ||
  (window.location.port !== '5173' && window.location.port !== '8000' && window.location.hostname !== 'localhost')
);

let useMock = isStaticHost;

async function tryFetch<T>(apiFn: () => Promise<T>, mockFallback: () => T | Promise<T>): Promise<T> {
  if (useMock) {
    return Promise.resolve(mockFallback());
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const result = await apiFn();
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    console.warn('Backend API unavailable, falling back to in-browser Standalone/GitHub Pages storage:', err);
    useMock = true;
    return Promise.resolve(mockFallback());
  }
}

export const api = {
  isStandaloneMode(): boolean {
    return useMock;
  },

  async getFamily(): Promise<{ id: string; name: string; members: Person[] }> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/families/default`);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getFamily()
    );
  },

  async getPersons(): Promise<Person[]> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/persons`);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getPersons()
    );
  },

  async createPerson(data: Partial<Person>): Promise<Person> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/persons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.createPerson(data)
    );
  },

  async getDocuments(personId?: string): Promise<DocumentItem[]> {
    return tryFetch(
      async () => {
        const url = personId ? `${API_BASE}/documents?person_id=${personId}` : `${API_BASE}/documents`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getDocuments(personId)
    );
  },

  async getDocument(documentId: string): Promise<DocumentItem> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/documents/${documentId}`);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getDocument(documentId)
    );
  },

  getPdfUrl(documentId: string): string {
    if (useMock) {
      return mockStore.getPdfUrl(documentId);
    }
    return `${API_BASE}/documents/${documentId}/pdf`;
  },

  async deleteDocument(documentId: string): Promise<{ status: string; id: string; filename: string }> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/documents/${documentId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.deleteDocument(documentId)
    );
  },

  async uploadDocument(file: File, personId: string, documentType: string = 'lab_report'): Promise<DocumentItem> {
    return tryFetch(
      async () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('person_id', personId);
        formData.append('document_type', documentType);
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.uploadDocument(file, personId, documentType)
    );
  },

  async ingestSample(): Promise<DocumentItem> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/documents/ingest-sample`, { method: 'POST' });
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => {
        mockStore.resetToDefault();
        return mockStore.getDocuments()[0];
      }
    );
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
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/observations/${observationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.updateObservation(observationId, payload)
    );
  },

  async bulkVerify(observationIds: string[], action: 'verified' | 'rejected' = 'verified', notes?: string) {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/observations/bulk-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ observation_ids: observationIds, action, notes }),
        });
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.bulkVerify(observationIds, action, notes)
    );
  },

  async getTrends(personId: string, codes?: string[]): Promise<ParameterTrend[]> {
    return tryFetch(
      async () => {
        let url = `${API_BASE}/analytics/trends?person_id=${personId}`;
        if (codes && codes.length > 0) {
          url += `&codes=${codes.join(',')}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getTrends(personId, codes)
    );
  },

  async getMatrix(personId: string): Promise<ComparisonMatrix> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/analytics/matrix?person_id=${personId}`);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getMatrix(personId)
    );
  },

  async getDoctorSummary(personId: string): Promise<DoctorVisitSummary> {
    return tryFetch(
      async () => {
        const res = await fetch(`${API_BASE}/doctor-visit/summary?person_id=${personId}`);
        if (!res.ok) throw new Error('API failed');
        return res.json();
      },
      () => mockStore.getDoctorSummary(personId)
    );
  }
};
