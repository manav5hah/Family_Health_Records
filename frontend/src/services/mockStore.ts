import type { 
  Person, DocumentItem, Observation, ParameterTrend, 
  ComparisonMatrix, DoctorVisitSummary, DiscussionPoint 
} from './types';
import { seedData } from './seedData';

const STORAGE_KEY = 'family_health_records_state_v2';

interface AppState {
  family: { id: string; name: string };
  persons: Person[];
  documents: DocumentItem[];
  observations: Observation[];
}

const CANONICAL_META: Record<string, { name: string; unit: string; category: string }> = {
  creatinine: { name: 'Serum Creatinine', unit: 'mg/dL', category: 'Kidney Function' },
  urea: { name: 'Blood Urea', unit: 'mg/dL', category: 'Kidney Function' },
  uric_acid: { name: 'Uric Acid', unit: 'mg/dL', category: 'Kidney Function' },
  sodium: { name: 'Sodium', unit: 'mmol/L', category: 'Electrolytes' },
  potassium: { name: 'Potassium', unit: 'mmol/L', category: 'Electrolytes' },
  chloride: { name: 'Chloride', unit: 'mmol/L', category: 'Electrolytes' },
  hba1c: { name: 'Glycated Hemoglobin (HbA1c)', unit: '%', category: 'Diabetes' },
  glucose_fasting: { name: 'Fasting Blood Glucose', unit: 'mg/dL', category: 'Diabetes' },
  glucose_pp: { name: 'Post-Prandial Blood Glucose', unit: 'mg/dL', category: 'Diabetes' },
  haemoglobin: { name: 'Haemoglobin (Hb)', unit: 'g/dL', category: 'Haemogram / CBC' },
  wbc_total: { name: 'Total WBC Count', unit: '/µL', category: 'Haemogram / CBC' },
  platelet_count: { name: 'Platelet Count', unit: '/µL', category: 'Haemogram / CBC' },
  pcv: { name: 'Packed Cell Volume (PCV / Hematocrit)', unit: '%', category: 'Haemogram / CBC' },
  cholesterol_total: { name: 'Total Cholesterol', unit: 'mg/dL', category: 'Lipid Profile' },
  cholesterol_hdl: { name: 'HDL Cholesterol', unit: 'mg/dL', category: 'Lipid Profile' },
  cholesterol_ldl: { name: 'LDL Cholesterol', unit: 'mg/dL', category: 'Lipid Profile' },
  triglycerides: { name: 'Triglycerides', unit: 'mg/dL', category: 'Lipid Profile' },
  cholesterol_vldl: { name: 'VLDL Cholesterol', unit: 'mg/dL', category: 'Lipid Profile' },
  cholesterol_hdl_ratio: { name: 'Total Cholesterol / HDL Ratio', unit: 'ratio', category: 'Lipid Profile' },
  sgpt: { name: 'Alanine Aminotransferase (ALT / SGPT)', unit: 'U/L', category: 'Liver Function' },
  sgot: { name: 'Aspartate Aminotransferase (AST / SGOT)', unit: 'U/L', category: 'Liver Function' },
  alk_phos: { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', category: 'Liver Function' },
  ggt: { name: 'Gamma Glutamyl Transferase (GGT)', unit: 'U/L', category: 'Liver Function' },
  bilirubin_total: { name: 'Total Bilirubin', unit: 'mg/dL', category: 'Liver Function' },
  bilirubin_direct: { name: 'Direct / Conjugated Bilirubin', unit: 'mg/dL', category: 'Liver Function' },
  protein_total: { name: 'Total Protein', unit: 'g/dL', category: 'Liver Function' },
  albumin: { name: 'Albumin', unit: 'g/dL', category: 'Liver Function' },
  globulin: { name: 'Globulin', unit: 'g/dL', category: 'Liver Function' },
  calcium: { name: 'Calcium', unit: 'mg/dL', category: 'Skeletal / Minerals' },
  phosphorus: { name: 'Phosphorus', unit: 'mg/dL', category: 'Skeletal / Minerals' },
  esr: { name: 'Erythrocyte Sedimentation Rate (ESR)', unit: 'mm/hr', category: 'Inflammation' },
  tsh: { name: 'Thyroid Stimulating Hormone (TSH)', unit: 'µIU/mL', category: 'Thyroid' },
  vitamin_d: { name: '25-OH Vitamin D', unit: 'ng/mL', category: 'Vitamins' },
  vitamin_b12: { name: 'Vitamin B12', unit: 'pg/mL', category: 'Vitamins' }
};

class MockStore {
  private state: AppState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): AppState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return this.getDefaultState();
  }

  private getDefaultState(): AppState {
    return {
      family: { ...seedData.family },
      persons: [...(seedData.persons as unknown as Person[])],
      documents: (seedData.documents as unknown[]).map((d: any) => ({
        ...d,
        observation_count: (seedData.observations as unknown as Observation[]).filter(o => o.document_id === d.id).length
      })),
      observations: [...(seedData.observations as unknown as Observation[])]
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore quota errors
    }
  }

  public resetToDefault() {
    this.state = this.getDefaultState();
    this.saveState();
  }

  // --- API Methods ---

  public getFamily() {
    return {
      id: this.state.family.id,
      name: this.state.family.name,
      members: this.state.persons
    };
  }

  public getPersons(): Person[] {
    return [...this.state.persons];
  }

  public createPerson(data: Partial<Person>): Person {
    const newPerson: Person = {
      id: 'person-' + Math.random().toString(36).substring(2, 9),
      family_id: this.state.family.id,
      name: data.name || 'New Member',
      relationship_type: data.relationship_type || 'Other',
      gender: data.gender || 'Other',
      dob: data.dob || '',
      blood_group: data.blood_group || '',
      notes: data.notes || ''
    };
    this.state.persons.push(newPerson);
    this.saveState();
    return newPerson;
  }

  public getDocuments(personId?: string): DocumentItem[] {
    let docs = this.state.documents;
    if (personId) {
      docs = docs.filter(d => d.person_id === personId);
    }
    return docs.map(d => ({
      ...d,
      observation_count: this.state.observations.filter(o => o.document_id === d.id).length
    }));
  }

  public getDocument(documentId: string): DocumentItem {
    const doc = this.state.documents.find(d => d.id === documentId);
    if (!doc) {
      throw new Error('Document not found');
    }
    const obs = this.state.observations.filter(o => o.document_id === documentId);
    return {
      ...doc,
      observation_count: obs.length,
      observations: obs
    };
  }

  public deleteDocument(documentId: string) {
    this.state.documents = this.state.documents.filter(d => d.id !== documentId);
    this.state.observations = this.state.observations.filter(o => o.document_id !== documentId);
    this.saveState();
    return { status: 'deleted', id: documentId, filename: 'report.pdf' };
  }

  public uploadDocument(file: File, personId: string, documentType: string = 'lab_report'): DocumentItem {
    const docId = 'doc-' + Math.random().toString(36).substring(2, 9);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

    const newDoc: DocumentItem = {
      id: docId,
      person_id: personId,
      filename: file.name || 'Uploaded_Medical_Report.pdf',
      sha256: 'mocksha256_' + Math.random().toString(36).substring(2, 12),
      file_size_bytes: file.size || 1024000,
      mime_type: 'application/pdf',
      document_type: documentType,
      document_date: dateStr,
      lab_or_clinic: 'Diagnostic Pathology Lab',
      referring_doctor: 'Dr. Physician',
      page_count: 3,
      status: 'extracted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      observation_count: 5
    };

    // Generate sample observations extracted from this newly uploaded report
    const sampleTests = [
      { code: 'glucose_fasting', name: 'Fasting Blood Glucose', val: 96, unit: 'mg/dL', low: 70, high: 100, ref: '70 - 100 mg/dL', panel: 'Diabetes' },
      { code: 'hba1c', name: 'Glycated Hemoglobin (HbA1c)', val: 5.8, unit: '%', low: 4.0, high: 5.6, flag: 'H', ref: '4.0 - 5.6 %', panel: 'Diabetes' },
      { code: 'creatinine', name: 'Serum Creatinine', val: 0.78, unit: 'mg/dL', low: 0.5, high: 1.1, ref: '0.5 - 1.1 mg/dL', panel: 'Renal Function' },
      { code: 'cholesterol_total', name: 'Total Cholesterol', val: 194, unit: 'mg/dL', low: 0, high: 200, ref: '< 200 mg/dL', panel: 'Lipid Profile' },
      { code: 'haemoglobin', name: 'Haemoglobin (Hb)', val: 12.4, unit: 'g/dL', low: 12.0, high: 15.0, ref: '12.0 - 15.0 g/dL', panel: 'Haemogram' }
    ];

    const newObs: Observation[] = sampleTests.map((t, idx) => ({
      id: 'obs-' + Math.random().toString(36).substring(2, 9),
      document_id: docId,
      person_id: personId,
      panel_name: t.panel,
      original_test_name: t.name,
      value_text: String(t.val),
      value_numeric: t.val,
      original_unit: t.unit,
      reference_low: t.low,
      reference_high: t.high,
      reference_text: t.ref,
      abnormal_flag: t.flag || undefined,
      canonical_test_code: t.code,
      canonical_test_name: t.name,
      normalized_value: t.val,
      normalized_unit: t.unit,
      observation_date: dateStr,
      source_page: Math.floor(idx / 2) + 1,
      source_snippet: `${t.name} ${t.val} ${t.unit} (${t.ref})`,
      extraction_method: 'digital_parser',
      confidence: 0.98,
      verification_status: 'needs_review'
    }));

    this.state.documents.unshift(newDoc);
    this.state.observations.push(...newObs);
    this.saveState();

    return {
      ...newDoc,
      observations: newObs
    };
  }

  public updateObservation(observationId: string, payload: Partial<Observation>): Observation {
    const obs = this.state.observations.find(o => o.id === observationId);
    if (!obs) {
      throw new Error('Observation not found');
    }
    Object.assign(obs, payload);
    if (payload.value_text && !payload.value_numeric) {
      const parsed = parseFloat(payload.value_text);
      if (!isNaN(parsed)) {
        obs.value_numeric = parsed;
        obs.normalized_value = parsed;
      }
    }
    obs.verified_at = new Date().toISOString();
    obs.verified_by = 'local_user';
    this.saveState();
    return obs;
  }

  public bulkVerify(observationIds: string[], action: 'verified' | 'rejected' = 'verified', notes?: string) {
    let updatedCount = 0;
    for (const obs of this.state.observations) {
      if (observationIds.includes(obs.id)) {
        obs.verification_status = action;
        obs.verified_at = new Date().toISOString();
        obs.verified_by = 'local_user';
        if (notes) obs.correction_notes = notes;
        updatedCount++;
      }
    }
    this.saveState();
    return { updated_count: updatedCount, status: action };
  }

  public getTrends(personId: string, codes?: string[]): ParameterTrend[] {
    const personObs = this.state.observations.filter(
      o => o.person_id === personId && 
           o.value_numeric !== undefined && 
           o.value_numeric !== null &&
           o.canonical_test_code
    );

    // Group by canonical_test_code
    const grouped = new Map<string, Observation[]>();
    for (const obs of personObs) {
      const c = obs.canonical_test_code!;
      if (codes && codes.length > 0 && !codes.includes(c)) continue;
      if (!grouped.has(c)) {
        grouped.set(c, []);
      }
      grouped.get(c)!.push(obs);
    }

    const trends: ParameterTrend[] = [];

    grouped.forEach((obsList, code) => {
      // Sort chronologically
      obsList.sort((a, b) => {
        const d1 = a.observation_date || '';
        const d2 = b.observation_date || '';
        return d1.localeCompare(d2);
      });

      const meta = CANONICAL_META[code] || {
        name: obsList[0].canonical_test_name || code,
        unit: obsList[0].normalized_unit || obsList[0].original_unit || '',
        category: 'General'
      };

      const points = obsList.map(o => ({
        date: o.observation_date || 'Unknown Date',
        value: o.normalized_value !== undefined ? o.normalized_value! : o.value_numeric!,
        unit: o.normalized_unit || o.original_unit || meta.unit,
        original_value: o.value_text,
        original_name: o.original_test_name,
        document_id: o.document_id,
        document_date: o.observation_date,
        source_page: o.source_page || 1,
        abnormal_flag: o.abnormal_flag,
        reference_low: o.reference_low,
        reference_high: o.reference_high,
        verification_status: o.verification_status
      }));

      const latestPoint = points[points.length - 1];

      trends.push({
        canonical_code: code,
        canonical_name: meta.name,
        category: meta.category,
        unit: meta.unit,
        reference_low: obsList[obsList.length - 1].reference_low,
        reference_high: obsList[obsList.length - 1].reference_high,
        points,
        latest_value: latestPoint ? latestPoint.value : undefined,
        latest_date: latestPoint ? latestPoint.date : undefined,
        is_abnormal: points.some(p => ['H', 'L', 'HH', 'LL', 'A'].includes(p.abnormal_flag || ''))
      });
    });

    return trends;
  }

  public getMatrix(personId: string): ComparisonMatrix {
    const coreCodes = [
      'creatinine', 'urea', 'hba1c', 'glucose_fasting', 
      'haemoglobin', 'cholesterol_total', 'cholesterol_ldl', 'cholesterol_hdl', 'sgpt'
    ];

    const trends = this.getTrends(personId, coreCodes);
    const dateSet = new Set<string>();

    trends.forEach(t => {
      t.points.forEach(p => dateSet.add(p.date));
    });

    const sortedDates = Array.from(dateSet).sort();

    const rows = trends.map(t => {
      const dateMap = new Map(t.points.map(p => [p.date, p]));
      const valuesByDate: Record<string, { value?: number; display: string; abnormal_flag?: string }> = {};

      sortedDates.forEach(d => {
        const point = dateMap.get(d);
        if (point) {
          valuesByDate[d] = {
            value: point.value,
            display: `${point.value} ${point.unit}`,
            abnormal_flag: point.abnormal_flag
          };
        } else {
          valuesByDate[d] = {
            display: '—'
          };
        }
      });

      return {
        canonical_code: t.canonical_code,
        canonical_name: t.canonical_name,
        unit: t.unit,
        values: valuesByDate
      };
    });

    return {
      dates: sortedDates,
      rows
    };
  }

  public getDoctorSummary(personId: string): DoctorVisitSummary {
    const person = this.state.persons.find(p => p.id === personId);
    if (!person) {
      throw new Error('Person not found');
    }

    const docs = this.state.documents.filter(d => d.person_id === personId);
    const obs = this.state.observations.filter(d => d.person_id === personId);
    const abnormalObs = obs.filter(o => ['H', 'L', 'HH', 'LL', 'A'].includes(o.abnormal_flag || ''));
    const keyTrends = this.getTrends(personId);

    const discussionPoints: DiscussionPoint[] = [];

    abnormalObs.forEach(o => {
      const code = o.canonical_test_code || o.original_test_name.toLowerCase();
      const dateStr = o.observation_date || 'recent report';
      const ref = o.reference_text || `${o.reference_low} - ${o.reference_high}`;

      if (code.includes('hba1c')) {
        discussionPoints.push({
          topic: 'Glycemic Control & HbA1c',
          observation: `HbA1c was measured at ${o.value_text} ${o.original_unit || '%'} on ${dateStr} (Reference: ${ref}).`,
          suggested_question: 'Ask your doctor whether lifestyle adjustments (diet/exercise) or a repeat testing schedule (e.g. 3–6 months) is recommended to monitor prediabetes progression.',
          source: `Page ${o.source_page} of report (${dateStr})`
        });
      } else if (code.includes('haemoglobin') || code.includes('hb')) {
        discussionPoints.push({
          topic: 'Haemoglobin & Red Blood Cell Indices',
          observation: `Haemoglobin was reported below reference range at ${o.value_text} ${o.original_unit} on ${dateStr} (Reference: ${ref}).`,
          suggested_question: 'Inquire whether dietary changes or additional workups (such as Serum Ferritin / Iron studies) are advisable to evaluate mild anemia.',
          source: `Page ${o.source_page} of report (${dateStr})`
        });
      } else if (code.includes('ldl') || code.includes('cholesterol')) {
        discussionPoints.push({
          topic: 'Lipid Profile & Cardiovascular Health',
          observation: `${o.original_test_name} was reported at ${o.value_text} ${o.original_unit || 'mg/dL'} on ${dateStr} (Reference: ${ref}).`,
          suggested_question: 'Discuss overall cardiovascular risk factors and whether dietary modifications or lipid-lowering therapies are suggested.',
          source: `Page ${o.source_page} of report (${dateStr})`
        });
      } else if (code.includes('ggt') || code.includes('gamma')) {
        discussionPoints.push({
          topic: 'Liver Enzymes (GGT)',
          observation: `Gamma Glutamyl Transferase was elevated at ${o.value_text} ${o.original_unit || 'U/L'} on ${dateStr} (Reference: ${ref}).`,
          suggested_question: 'Ask if repeat liver enzyme testing or an abdominal ultrasound is recommended to investigate this elevation.',
          source: `Page ${o.source_page} of report (${dateStr})`
        });
      } else {
        discussionPoints.push({
          topic: o.canonical_test_name || o.original_test_name,
          observation: `${o.original_test_name} result is ${o.value_text} ${o.original_unit || ''} (Flagged ${o.abnormal_flag}, Ref: ${ref}).`,
          suggested_question: `Review whether this ${o.original_test_name} reading requires follow-up monitoring or further investigation.`,
          source: `Page ${o.source_page} of report (${dateStr})`
        });
      }
    });

    return {
      patient: {
        id: person.id,
        name: person.name,
        gender: person.gender,
        dob: person.dob,
        relationship: person.relationship_type,
        blood_group: person.blood_group
      },
      summary_date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      total_documents: docs.length,
      total_observations: obs.length,
      abnormal_findings: abnormalObs.map(o => ({
        test_name: o.original_test_name,
        canonical_name: o.canonical_test_name,
        value: o.value_text,
        unit: o.original_unit,
        flag: o.abnormal_flag,
        reference: o.reference_text,
        source_page: o.source_page,
        date: o.observation_date
      })),
      key_trends: keyTrends,
      discussion_points: discussionPoints
    };
  }

  public getPdfUrl(documentId: string): string {
    const doc = this.state.documents.find(d => d.id === documentId);
    const obs = this.state.observations.filter(o => o.document_id === documentId);
    const docName = doc ? doc.filename : 'Laboratory Report';
    const patientName = 'Mrs. Gira K Shah';
    const dateStr = doc?.document_date || '04-Sep-2026';
    const labName = doc?.lab_or_clinic || 'NSRL Pathology & Diagnostic Laboratories';

    // Build an authentic-looking laboratory report page preview
    const tableRows = obs.slice(0, 18).map(o => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
        <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${o.original_test_name}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${o.abnormal_flag ? '#e11d48' : '#0f172a'};">
          ${o.value_text}
          ${o.abnormal_flag ? `<span style="background: #ffe4e6; color: #be123c; font-size: 10px; padding: 2px 6px; border-radius: 9999px; margin-left: 6px;">${o.abnormal_flag}</span>` : ''}
        </td>
        <td style="padding: 10px 12px; color: #64748b;">${o.original_unit || '—'}</td>
        <td style="padding: 10px 12px; color: #64748b; font-size: 12px;">${o.reference_text || (o.reference_low !== undefined ? `${o.reference_low} - ${o.reference_high}` : '—')}</td>
        <td style="padding: 10px 12px; color: #94a3b8; font-size: 11px;">${o.method || 'Automated Analyser'}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #334155; }
        .sheet { max-width: 800px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #059669; padding-bottom: 16px; margin-bottom: 20px; }
        .lab-name { font-size: 18px; font-weight: 800; color: #065f46; letter-spacing: -0.5px; }
        .badge { background: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-top: 4px; }
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; }
        .meta-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; }
        .meta-val { font-weight: 700; color: #0f172a; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th { text-align: left; padding: 10px 12px; background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="header">
          <div>
            <div class="lab-name">${labName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Accredited Diagnostic Clinical Reference Center</div>
            <span class="badge">NABL ACCREDITED &bull; DIGITAL VERIFIED</span>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${docName}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Date: ${dateStr}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Sample ID: #NSRL-60900104</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Patient Name</div>
            <div class="meta-val">${patientName}</div>
          </div>
          <div>
            <div class="meta-label">Age / Gender</div>
            <div class="meta-val">51 Years / Female</div>
          </div>
          <div>
            <div class="meta-label">Referring Doctor</div>
            <div class="meta-val">${doc?.referring_doctor || 'Dr. Self / Family'}</div>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
          LABORATORY INVESTIGATION REPORT
        </div>

        <table>
          <thead>
            <tr>
              <th>Investigation / Biomarker</th>
              <th style="text-align: right;">Result</th>
              <th>Unit</th>
              <th>Reference Interval</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #64748b;">No observations available for this report.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>Report generated for Family Health Records &bull; Immutable provenance preserved</div>
          <div>Page 1 of ${doc?.page_count || 1} &bull; End of Document Preview</div>
        </div>
      </div>
    </body>
    </html>`;

    return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  }
}

export const mockStore = new MockStore();
