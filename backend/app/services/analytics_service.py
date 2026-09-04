from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.models import Observation, Document
from app.services.normalization_service import CANONICAL_PARAMETERS

class AnalyticsService:
    @staticmethod
    def get_person_trends(db: Session, person_id: str, canonical_codes: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Retrieves longitudinal time-series data for a person's laboratory parameters.
        """
        query = db.query(Observation).join(Document, Observation.document_id == Document.id)\
            .filter(Observation.person_id == person_id)\
            .filter(Observation.value_numeric.isnot(None))\
            .filter(Observation.verification_status.in_(["verified", "needs_review", "corrected"]))

        if canonical_codes:
            query = query.filter(Observation.canonical_test_code.in_(canonical_codes))
        else:
            # Default to all observations with canonical codes
            query = query.filter(Observation.canonical_test_code.isnot(None))

        # Order chronologically
        observations = query.order_by(Observation.observation_date.asc(), Observation.created_at.asc()).all()

        # Group by canonical parameter
        grouped = defaultdict(list)
        for obs in observations:
            grouped[obs.canonical_test_code].append(obs)

        trends = []
        for code, obs_list in grouped.items():
            param_meta = CANONICAL_PARAMETERS.get(code, {})
            display_name = param_meta.get("name", obs_list[0].canonical_test_name or code)
            unit = obs_list[0].normalized_unit or obs_list[0].original_unit or ""

            points = []
            for obs in obs_list:
                date_str = obs.observation_date or (obs.document.document_date if obs.document else None) or obs.created_at.strftime("%Y-%m-%d")
                points.append({
                    "date": date_str,
                    "value": obs.normalized_value if obs.normalized_value is not None else obs.value_numeric,
                    "unit": unit,
                    "original_value": obs.value_text,
                    "original_name": obs.original_test_name,
                    "document_id": obs.document_id,
                    "document_date": obs.document.document_date if obs.document else None,
                    "source_page": obs.source_page,
                    "abnormal_flag": obs.abnormal_flag,
                    "reference_low": obs.reference_low,
                    "reference_high": obs.reference_high,
                    "verification_status": obs.verification_status
                })

            trends.append({
                "canonical_code": code,
                "canonical_name": display_name,
                "category": param_meta.get("category", "General"),
                "unit": unit,
                "reference_low": obs_list[-1].reference_low,
                "reference_high": obs_list[-1].reference_high,
                "points": points,
                "latest_value": points[-1]["value"] if points else None,
                "latest_date": points[-1]["date"] if points else None,
                "is_abnormal": any(p["abnormal_flag"] in ["H", "L", "HH", "LL", "A"] for p in points[-1:]) if points else False
            })

        return trends

    @staticmethod
    def get_comparison_matrix(db: Session, person_id: str) -> Dict[str, Any]:
        """
        Builds a multi-year/multi-date comparison grid for primary health indicators.
        Similar to Section 10 in design document.
        """
        core_codes = [
            "creatinine", "urea", "hba1c", "glucose_fasting", 
            "haemoglobin", "cholesterol_total", "cholesterol_ldl", "cholesterol_hdl", "sgpt"
        ]

        trends = AnalyticsService.get_person_trends(db, person_id, core_codes)
        
        # Collect all unique dates
        all_dates = set()
        for t in trends:
            for p in t["points"]:
                all_dates.add(p["date"])

        sorted_dates = sorted(list(all_dates))

        # Build matrix
        rows = []
        for t in trends:
            date_map = {p["date"]: p for p in t["points"]}
            values_by_date = {}
            for d in sorted_dates:
                p = date_map.get(d)
                values_by_date[d] = {
                    "value": p["value"] if p else None,
                    "display": f"{p['value']} {p['unit']}" if p else "—",
                    "abnormal_flag": p["abnormal_flag"] if p else None
                }
            rows.append({
                "canonical_code": t["canonical_code"],
                "canonical_name": t["canonical_name"],
                "unit": t["unit"],
                "values": values_by_date
            })

        return {
            "dates": sorted_dates,
            "rows": rows
        }
