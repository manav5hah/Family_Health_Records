import re
import os
import json
from typing import List, Dict, Any, Optional
import httpx

from app.services.normalization_service import MedicalNormalizer
from app.core.config import settings

class ExtractionService:
    @classmethod
    def parse_digital_blocks(cls, pages_data: List[Dict[str, Any]], doc_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Deterministic parser for structured digital lab reports.
        Extracts observations, reference ranges, units, flags, and bounding boxes.
        """
        observations = []
        abnormal_flags_set = {"L", "H", "LL", "HH", "A", "ABNORMAL", "LOW", "HIGH"}

        for page in pages_data:
            page_num = page["page_number"]
            blocks = [b for b in page["blocks"] if b.get("text", "").strip()]

            # Detect current panel header on this page
            current_panel = "General Investigation"
            for b in blocks:
                t = b["text"].strip()
                if any(p in t for p in ["Renal Function Test", "Lipid Profile", "Liver Function Test", 
                                         "BIOCHEMICAL INVESTIGATIONS", "Haemogram", "HB AND INDICES", 
                                         "TOTAL AND DIFFERENTIAL", "PLATELET COUNT", "Skeletal Profile", "Urine"]):
                    current_panel = t.replace("\n", " ")

            # Group blocks by vertical y0 coordinate (table row reconstruction)
            rows = []
            for b in sorted(blocks, key=lambda x: x["y0"]):
                placed = False
                for r in rows:
                    if abs(r["y0"] - b["y0"]) <= 8:
                        r["blocks"].append(b)
                        r["y0"] = min(r["y0"], b["y0"])
                        r["y1"] = max(r["y1"], b["y1"])
                        r["x0"] = min(r["x0"], b["x0"])
                        r["x1"] = max(r["x1"], b["x1"])
                        placed = True
                        break
                if not placed:
                    rows.append({
                        "y0": b["y0"], "y1": b["y1"],
                        "x0": b["x0"], "x1": b["x1"],
                        "blocks": [b]
                    })

            for r in rows:
                lines = []
                for b in r["blocks"]:
                    for l in b["text"].split("\n"):
                        if l.strip():
                            lines.append(l.strip())

                if len(lines) < 2:
                    continue

                # Ignore header / footer blocks
                first_line_lower = lines[0].lower()
                if any(ignore in first_line_lower for ignore in [
                    "laboratory report", "reg date", "sample date", "report date", 
                    "test", "results", "note:", "printed on", "dr.", "end of report", "page "
                ]):
                    continue

                # Check if block has reference range format and a numeric result
                has_range = any(
                    re.search(r"\d+\.?\d*\s*-\s*\d+\.?\d*", l) or 
                    re.search(r"(?:<|>|<=|>=)\s*\d+", l) or
                    "normal" in l.lower() or "prediabetes" in l.lower()
                    for l in lines
                )
                
                # Look for numbers
                numbers = []
                for idx, line in enumerate(lines):
                    # match numbers like 11.6, 35.38, 7940, 0.61
                    m = re.match(r"^(\d+\.?\d*)$", line)
                    if m:
                        numbers.append((idx, float(m.group(1)), line))

                if not has_range and not numbers:
                    continue

                # Let's extract:
                test_name = lines[0]
                
                # Flag
                flag = None
                curr_idx = 1
                if curr_idx < len(lines) and lines[curr_idx].upper() in abnormal_flags_set:
                    flag = lines[curr_idx].upper()
                    curr_idx += 1

                # Unit and reference range
                unit = None
                ref_text = None
                ref_low = None
                ref_high = None
                method = None
                result_val = None
                result_text = None

                # Find result value: usually the last line or the explicit number
                if numbers:
                    # Last number in the block is typically the result
                    last_num_idx, num_val, num_str = numbers[-1]
                    result_val = num_val
                    result_text = num_str
                    
                    # Everything between curr_idx and last_num_idx is unit, range, method
                    middle_lines = lines[curr_idx:last_num_idx]
                else:
                    middle_lines = lines[curr_idx:-1]
                    result_text = lines[-1]

                for m_line in middle_lines:
                    # Check if it's a range like "12.00 - 15.00" or "0.5 - 1.1"
                    range_match = re.search(r"(\d+\.?\d*)\s*-\s*(\d+\.?\d*)", m_line)
                    if range_match:
                        ref_low = float(range_match.group(1))
                        ref_high = float(range_match.group(2))
                        ref_text = m_line
                    elif any(k in m_line.lower() for k in ["normal", "<", ">"]):
                        ref_text = m_line
                    elif any(u in m_line.lower() for u in ["mg/dl", "g%", "gm/dl", "mmol/l", "u/l", "%", "/µl", "fl", "pg", "cumm", "mm"]):
                        unit = m_line
                    elif any(m in m_line.lower() for m in ["kinetic", "enzymatic", "ise", "hplc", "colorimetric", "biuret", "calculated", "diazo", "urease"]):
                        method = m_line
                    elif not unit:
                        unit = m_line

                # Normalize test concept
                canon_code, canon_name, std_unit = MedicalNormalizer.match_canonical(test_name)
                norm_val, norm_unit = MedicalNormalizer.normalize_unit_and_value(result_val, unit or std_unit, canon_code)

                # Confidence scoring
                confidence = 0.95 if (result_val is not None and canon_code is not None) else 0.85
                
                # Determine initial verification status
                # If flagged abnormal or low confidence -> needs_review
                verification_status = "needs_review"

                observations.append({
                    "original_test_name": test_name,
                    "value_text": str(result_text) if result_text else str(result_val),
                    "value_numeric": result_val,
                    "original_unit": unit,
                    "reference_low": ref_low,
                    "reference_high": ref_high,
                    "reference_text": ref_text,
                    "abnormal_flag": flag,
                    "method": method,
                    "panel_name": current_panel,
                    "canonical_test_code": canon_code,
                    "canonical_test_name": canon_name or test_name,
                    "normalized_value": norm_val,
                    "normalized_unit": norm_unit or unit,
                    "observation_date": doc_date,
                    "source_page": page_num,
                    "source_snippet": " | ".join(lines),
                    "source_bbox": {
                        "x0": r["x0"], "y0": r["y0"], "x1": r["x1"], "y1": r["y1"]
                    },
                    "extraction_method": "digital_parser",
                    "confidence": confidence,
                    "verification_status": verification_status
                })

        return observations

    @classmethod
    async def extract_with_llm(cls, page_text: str, page_num: int, doc_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Optional LLM extraction fallback for complex, unstructured clinical notes or scanned PDFs.
        Supports Google Gemini and OpenAI APIs when keys are configured.
        """
        api_key = settings.GEMINI_API_KEY or settings.OPENAI_API_KEY
        if not api_key:
            return []

        # Prompt with strict medical JSON schema
        prompt = f"""
Extract all medical laboratory test results, observations, and vital signs from the following clinical document text.
Return ONLY a valid JSON array of objects with the schema:
[
  {{
    "original_test_name": "string (as reported)",
    "value_text": "string",
    "value_numeric": number or null,
    "original_unit": "string or null",
    "reference_low": number or null,
    "reference_high": number or null,
    "reference_text": "string or null",
    "abnormal_flag": "H or L or null",
    "method": "string or null",
    "confidence": number between 0.0 and 1.0,
    "source_snippet": "exact snippet quoted from text"
  }}
]

Document Text:
{page_text}
"""
        try:
            if settings.GEMINI_API_KEY:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
                    resp = await client.post(url, json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"responseMimeType": "application/json"}
                    })
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_json = data["candidates"][0]["content"]["parts"][0]["text"]
                        items = json.loads(raw_json)
                        for item in items:
                            canon_code, canon_name, std_unit = MedicalNormalizer.match_canonical(item.get("original_test_name", ""))
                            norm_val, norm_unit = MedicalNormalizer.normalize_unit_and_value(
                                item.get("value_numeric"), item.get("original_unit"), canon_code
                            )
                            item["canonical_test_code"] = canon_code
                            item["canonical_test_name"] = canon_name or item.get("original_test_name")
                            item["normalized_value"] = norm_val
                            item["normalized_unit"] = norm_unit
                            item["source_page"] = page_num
                            item["observation_date"] = doc_date
                            item["extraction_method"] = "llm_gemini"
                            item["verification_status"] = "needs_review"
                        return items
        except Exception as e:
            print(f"LLM Extraction failed: {e}")

        return []

    @classmethod
    async def extract_with_vision_llm(cls, file_path: str, doc_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        OCR fallback using Gemini Vision for scanned PDFs.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return []

        import fitz
        import base64

        doc = fitz.open(file_path)
        observations = []

        prompt = f"""
Extract all medical laboratory test results, observations, and vital signs from the following document image.
Return ONLY a valid JSON array of objects with the schema:
[
  {{
    "original_test_name": "string (as reported)",
    "value_text": "string",
    "value_numeric": number or null,
    "original_unit": "string or null",
    "reference_low": number or null,
    "reference_high": number or null,
    "reference_text": "string or null",
    "abnormal_flag": "H or L or null",
    "method": "string or null",
    "confidence": number between 0.0 and 1.0,
    "source_snippet": "exact snippet quoted from text"
  }}
]
"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    pix = page.get_pixmap()
                    img_bytes = pix.tobytes("jpeg")
                    img_b64 = base64.b64encode(img_bytes).decode("utf-8")

                    resp = await client.post(url, json={
                        "contents": [{
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": img_b64
                                    }
                                }
                            ]
                        }],
                        "generationConfig": {"responseMimeType": "application/json"}
                    })

                    if resp.status_code == 200:
                        data = resp.json()
                        raw_json = data["candidates"][0]["content"]["parts"][0]["text"]
                        items = json.loads(raw_json)
                        for item in items:
                            canon_code, canon_name, std_unit = MedicalNormalizer.match_canonical(item.get("original_test_name", ""))
                            norm_val, norm_unit = MedicalNormalizer.normalize_unit_and_value(
                                item.get("value_numeric"), item.get("original_unit"), canon_code
                            )
                            item["canonical_test_code"] = canon_code
                            item["canonical_test_name"] = canon_name or item.get("original_test_name")
                            item["normalized_value"] = norm_val
                            item["normalized_unit"] = norm_unit
                            item["source_page"] = page_num + 1
                            item["observation_date"] = doc_date
                            item["extraction_method"] = "llm_vision"
                            item["verification_status"] = "needs_review"
                            observations.append(item)
                    else:
                        print(f"Vision LLM error: {resp.text}")
        except Exception as e:
            print(f"Vision LLM Extraction failed: {e}")
        finally:
            doc.close()

        return observations
