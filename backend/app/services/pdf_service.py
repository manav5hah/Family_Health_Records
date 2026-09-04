import fitz
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

class PDFService:
    @staticmethod
    def extract_document_info(file_path: str) -> Dict[str, Any]:
        """
        Inspects PDF and extracts page count, text blocks, and basic metadata.
        """
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages_data = []

        patient_name = None
        doc_date = None
        lab_name = None
        referring_doctor = None

        for page_num in range(page_count):
            page = doc[page_num]
            # Get text blocks with coordinates: (x0, y0, x1, y1, text, block_no, block_type)
            raw_blocks = page.get_text("blocks")
            blocks = []
            full_page_text = page.get_text("text")

            for b in raw_blocks:
                if len(b) >= 5 and b[4].strip():
                    blocks.append({
                        "x0": round(b[0], 2),
                        "y0": round(b[1], 2),
                        "x1": round(b[2], 2),
                        "y1": round(b[3], 2),
                        "text": b[4].strip(),
                        "block_no": b[5] if len(b) > 5 else 0
                    })

            # Check for header metadata on first couple pages
            if page_num < 2:
                for b in blocks:
                    t = b["text"]
                    # Patient Name
                    if not patient_name:
                        m_name = re.search(r"Name\s*:\s*(?:Mrs\.|Mr\.|Ms\.|Master|Dr\.)?\s*([A-Za-z\s]+)", t, re.IGNORECASE)
                        if m_name:
                            patient_name = m_name.group(1).strip()
                    
                    # Date
                    if not doc_date:
                        m_date = re.search(r"(?:Report|Reg|Sample)\s*Date\s*(?:and\s*Time)?\s*:\s*(\d{2}-[A-Za-z]{3}-\d{4})", t, re.IGNORECASE)
                        if m_date:
                            doc_date = m_date.group(1).strip()
                    
                    # Lab or Clinic
                    if not lab_name:
                        if "NSRL" in t or "Pathology" in t or "Laboratory" in t or "Diagnostic" in t:
                            for line in t.split("\n"):
                                if any(k in line.lower() for k in ["lab", "pathology", "nsrl", "diagnostics"]):
                                    lab_name = line.strip()
                                    break
                    
                    # Referring Doctor
                    if not referring_doctor:
                        m_doc = re.search(r"Ref\.\s*By\s*:\s*(Dr\.[A-Za-z\s]+)", t, re.IGNORECASE)
                        if m_doc:
                            referring_doctor = m_doc.group(1).strip()

            pages_data.append({
                "page_number": page_num + 1,
                "text": full_page_text,
                "blocks": blocks,
                "width": page.rect.width,
                "height": page.rect.height
            })

        doc.close()

        return {
            "page_count": page_count,
            "patient_name": patient_name,
            "document_date": doc_date,
            "lab_or_clinic": lab_name or "Diagnostic Laboratory",
            "referring_doctor": referring_doctor,
            "pages": pages_data
        }
