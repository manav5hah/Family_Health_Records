# Family Health Records & Longitudinal Health Analysis System

A privacy-focused, family-centric health record system that preserves original medical documents (PDFs) as the immutable source of truth, extracts structured medical observations, normalizes clinical terminology, and provides interactive multi-decade longitudinal visualizations and physician discussion preparation.

---

## Key Features

1. **Immutable Source-of-Truth Document Storage**:
   - Original PDFs are stored content-addressed by SHA-256 hash.
   - Guaranteed never to be altered or discarded.
   - Built-in PDF viewer with page-by-page visual inspection.

2. **Automated Structured Extraction & Normalization**:
   - Digital vector extraction powered by PyMuPDF extracting tabular rows, test names, values, units, biological reference intervals, methods, and abnormal flags.
   - Deterministic medical normalization mapping messy lab aliases (`S. Creatinine`, `S Creat`, `Serum Creatinine`) to canonical codes, and auditable unit conversions (e.g. `G%` to `g/dL`).
   - Pluggable LLM fallback for freeform clinical discharge summaries.

3. **Human-in-the-Loop (HITL) Split-Screen Verification**:
   - Side-by-side view: Original PDF on the left, extracted observations on the right.
   - Color-coded confidence and abnormal flags (`L` for Low, `H` for High).
   - Click-to-page navigation: Clicking any test card jumps the PDF viewer to that exact source page.
   - In-line correction and audit trail for every confirmed or corrected value.

4. **Longitudinal Health Trend Analytics**:
   - Multi-year time-series charts using Recharts with shaded normal biological reference bands.
   - Multi-year comparison matrix (cross-document grid comparing biomarkers across dates).
   - Provenance linking: Clicking any point on the chart links directly back to the source report and page.

5. **Doctor Visit Mode**:
   - Generates a physician-ready 1-page clinical summary.
   - AI-generated discussion points and questions based strictly on documented out-of-range findings.
   - Strict clinical safety principles: AI assists doctor discussions, never prescribes or diagnoses autonomously.
   - Printable / exportable directly to PDF.

---

## Quick Start

### 1. Launch Fullstack Application (One Command)
```bash
./run_app.sh
```
Open your browser at **`http://localhost:8000`**.

### 2. Running Backend & Frontend in Development Mode

**Backend**:
```bash
source .venv/bin/activate
export PYTHONPATH="backend"
uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm run dev
```
(Frontend dev server runs at `http://localhost:5173` and proxies API requests to port 8000).

---

## Running Automated Tests
```bash
PYTHONPATH=.venv:backend .venv/bin/pytest backend/tests/
```
All unit tests and API integration tests execute in < 1 second.
