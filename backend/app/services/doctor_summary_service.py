import json
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Person, Document, Observation
from app.services.analytics_service import AnalyticsService
from app.core.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)

class DoctorSummaryService:
    @staticmethod
    async def generate_summary_async(db: Session, person_id: str) -> Dict[str, Any]:
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
        
        abnormal_data = []
        for o in abnormal_obs:
            abnormal_data.append({
                "test_name": o.original_test_name,
                "canonical_name": o.canonical_test_name,
                "value": o.value_text,
                "unit": o.original_unit,
                "flag": o.abnormal_flag,
                "reference": o.reference_text,
                "date": o.observation_date,
                "source_page": o.source_page
            })
            
        trend_data = []
        for t in key_trends:
            if t.get("is_abnormal"):
                trend_data.append({
                    "test_name": t["canonical_name"],
                    "category": t["category"],
                    "latest_value": t.get("latest_value"),
                    "latest_date": t.get("latest_date"),
                    "history": [{"date": p["date"], "value": p["value"], "flag": p.get("abnormal_flag")} for p in t["points"]]
                })

        overall_observation = "No recent data available to provide an observation."
        discussion_points = []
        
        if abnormal_obs or trend_data:
            # Generate insights via LLM
            prompt = f"""
You are an Internal Medicine Doctor reviewing a patient's lab results. 
Below are the abnormal observations and longitudinal trends for the patient {person.name}.

Abnormal Findings:
{json.dumps(abnormal_data, indent=2)}

Key Trends (Biomarkers with at least one abnormal reading):
{json.dumps(trend_data, indent=2)}

Provide your response strictly in the following JSON format:
{{
  "overall_observation": "A comprehensive paragraph summarizing the patient's health trends based on these reports.",
  "discussion_points": [
    {{
      "topic": "Topic area (e.g., Glycemic Control & HbA1c)",
      "observation": "A concise summary of the record evidence.",
      "suggested_question": "A precise question for the patient to ask their doctor based on this finding.",
      "source": "E.g., Page X of report (Date)"
    }}
  ]
}}
Ensure the JSON is valid and contains no extra text outside the JSON object.
"""
            api_key = settings.GEMINI_API_KEY
            if api_key:
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
                        resp = await client.post(url, json={
                            "contents": [{"parts": [{"text": prompt}]}],
                            "generationConfig": {"responseMimeType": "application/json"}
                        })
                        if resp.status_code == 200:
                            data = resp.json()
                            raw_json = data["candidates"][0]["content"]["parts"][0]["text"]
                            llm_result = json.loads(raw_json)
                            overall_observation = llm_result.get("overall_observation", overall_observation)
                            discussion_points = llm_result.get("discussion_points", [])
                        else:
                            logger.error(f"LLM API error: {resp.text}")
                except Exception as e:
                    logger.error(f"Failed to generate LLM summary: {e}")

        # Fallback if LLM fails or returns nothing
        if not discussion_points:
            for obs in abnormal_obs:
                code = obs.canonical_test_code or obs.original_test_name.lower()
                date_str = obs.observation_date or "recent report"
                ref = obs.reference_text or f"{obs.reference_low} - {obs.reference_high}"
                discussion_points.append({
                    "topic": obs.canonical_test_name or obs.original_test_name,
                    "observation": f"{obs.original_test_name} result is {obs.value_text} {obs.original_unit or ''} (Flagged {obs.abnormal_flag}, Ref: {ref}).",
                    "suggested_question": f"Review whether this {obs.original_test_name} reading requires follow-up monitoring.",
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
            "abnormal_findings": abnormal_data,
            "key_trends": key_trends,
            "overall_observation": overall_observation,
            "discussion_points": discussion_points
        }
