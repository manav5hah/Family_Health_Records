from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Person, Document, Observation
from app.services.analytics_service import AnalyticsService

class DoctorSummaryService:
    @staticmethod
    def generate_summary(db: Session, person_id: str) -> Dict[str, Any]:
        person = db.query(Person).filter(Person.id == person_id).first()
        if not person:
            raise ValueError("Person not found")

        total_docs = db.query(Document).filter(Document.person_id == person_id).count()
        total_obs = db.query(Observation).filter(Observation.person_id == person_id).count()

        # Find abnormal observations
        abnormal_obs = db.query(Observation)\
            .filter(Observation.person_id == person_id)\
            .filter(Observation.abnormal_flag.in_(["H", "L", "HH", "LL", "A"]))\
            .order_by(Observation.source_page.asc())\
            .all()

        # Get core longitudinal trends
        key_trends = AnalyticsService.get_person_trends(db, person_id)

        # Generate objective discussion points based strictly on grounded abnormal findings
        discussion_points: List[Dict[str, Any]] = []

        for obs in abnormal_obs:
            code = obs.canonical_test_code or obs.original_test_name.lower()
            date_str = obs.observation_date or "recent report"
            ref = obs.reference_text or f"{obs.reference_low} - {obs.reference_high}"

            if "hba1c" in code:
                discussion_points.append({
                    "topic": "Glycemic Control & HbA1c",
                    "observation": f"HbA1c was measured at {obs.value_text} {obs.original_unit or '%'} on {date_str} (Reference: {ref}).",
                    "suggested_question": "Ask your doctor whether lifestyle adjustments (diet/exercise) or a repeat testing schedule (e.g. 3–6 months) is recommended to monitor prediabetes progression.",
                    "source": f"Page {obs.source_page} of report ({date_str})"
                })
            elif "haemoglobin" in code or "hb" in code:
                discussion_points.append({
                    "topic": "Haemoglobin & Red Blood Cell Indices",
                    "observation": f"Haemoglobin was reported below the reference range at {obs.value_text} {obs.original_unit} on {date_str} (Reference: {ref}).",
                    "suggested_question": "Inquire whether dietary changes or additional workups (such as Serum Ferritin / Iron studies) are advisable to evaluate mild anemia.",
                    "source": f"Page {obs.source_page} of report ({date_str})"
                })
            elif "ldl" in code or "cholesterol" in code:
                discussion_points.append({
                    "topic": "Lipid Profile & Cardiovascular Health",
                    "observation": f"{obs.original_test_name} was reported at {obs.value_text} {obs.original_unit or 'mg/dL'} on {date_str} (Reference: {ref}).",
                    "suggested_question": "Discuss your overall cardiovascular risk factors and whether dietary modifications or lipid-lowering therapies are suggested.",
                    "source": f"Page {obs.source_page} of report ({date_str})"
                })
            elif "ggt" in code or "gamma" in code:
                discussion_points.append({
                    "topic": "Liver Enzymes (GGT)",
                    "observation": f"Gamma Glutamyl Transferase was elevated at {obs.value_text} {obs.original_unit or 'U/L'} on {date_str} (Reference: {ref}).",
                    "suggested_question": "Ask if repeat liver enzyme testing or an abdominal ultrasound is recommended to investigate this elevation.",
                    "source": f"Page {obs.source_page} of report ({date_str})"
                })
            elif "creatinine" in code or "urea" in code:
                discussion_points.append({
                    "topic": "Renal Function Markers",
                    "observation": f"{obs.original_test_name} was flagged at {obs.value_text} {obs.original_unit or 'mg/dL'} on {date_str} (Reference: {ref}).",
                    "suggested_question": "Discuss kidney function markers in the context of hydration status and blood pressure.",
                    "source": f"Page {obs.source_page} of report ({date_str})"
                })
            else:
                discussion_points.append({
                    "topic": obs.canonical_test_name or obs.original_test_name,
                    "observation": f"{obs.original_test_name} result is {obs.value_text} {obs.original_unit or ''} (Flagged {obs.abnormal_flag}, Ref: {ref}).",
                    "suggested_question": f"Review whether this {obs.original_test_name} reading requires follow-up monitoring or further investigation.",
                    "source": f"Page {obs.source_page} of report ({date_str})"
                })

        return {
            "patient": {
                "id": person.id,
                "name": person.name,
                "gender": person.gender,
                "dob": person.dob,
                "relationship": person.relationship_type,
                "blood_group": person.blood_group
            },
            "summary_date": datetime.now().strftime("%d-%b-%Y"),
            "total_documents": total_docs,
            "total_observations": total_obs,
            "abnormal_findings": [
                {
                    "test_name": o.original_test_name,
                    "canonical_name": o.canonical_test_name,
                    "value": o.value_text,
                    "unit": o.original_unit,
                    "flag": o.abnormal_flag,
                    "reference": o.reference_text,
                    "source_page": o.source_page,
                    "date": o.observation_date
                }
                for o in abnormal_obs
            ],
            "key_trends": key_trends,
            "discussion_points": discussion_points
        }
