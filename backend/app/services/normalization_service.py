import re
from typing import Optional, Tuple, Dict

# Canonical medical parameter dictionary with alias variants and standard display info
CANONICAL_PARAMETERS: Dict[str, Dict] = {
    "creatinine": {
        "name": "Serum Creatinine",
        "standard_unit": "mg/dL",
        "category": "Kidney Function",
        "aliases": [
            "s. creatinine", "serum creatinine", "creatinine", "creat", "serum creat", "s creatinine"
        ]
    },
    "urea": {
        "name": "Blood Urea",
        "standard_unit": "mg/dL",
        "category": "Kidney Function",
        "aliases": [
            "urea", "blood urea", "s. urea", "serum urea", "b. urea"
        ]
    },
    "uric_acid": {
        "name": "Uric Acid",
        "standard_unit": "mg/dL",
        "category": "Kidney Function",
        "aliases": [
            "uric acid", "serum uric acid", "s. uric acid"
        ]
    },
    "sodium": {
        "name": "Sodium",
        "standard_unit": "mmol/L",
        "category": "Electrolytes",
        "aliases": [
            "sodium", "serum sodium", "s. sodium", "na+", "na"
        ]
    },
    "potassium": {
        "name": "Potassium",
        "standard_unit": "mmol/L",
        "category": "Electrolytes",
        "aliases": [
            "potassium", "serum potassium", "s. potassium", "k+", "k"
        ]
    },
    "chloride": {
        "name": "Chloride",
        "standard_unit": "mmol/L",
        "category": "Electrolytes",
        "aliases": [
            "chloride", "serum chloride", "s. chloride", "cl-", "cl"
        ]
    },
    "hba1c": {
        "name": "Glycated Hemoglobin (HbA1c)",
        "standard_unit": "%",
        "category": "Diabetes",
        "aliases": [
            "hba1c", "glycated hemoglobin", "glyco hemoglobin", "glyco hemoglobin (hba1c)", 
            "glycated haemoglobin estimation", "glycated haemoglobin", "glyco haemoglobin"
        ]
    },
    "glucose_fasting": {
        "name": "Fasting Blood Glucose",
        "standard_unit": "mg/dL",
        "category": "Diabetes",
        "aliases": [
            "plasma glucose - f", "fasting blood sugar", "fbs", "glucose - fasting",
            "blood glucose fasting", "fasting plasma glucose", "glucose, fasting", "fbg"
        ]
    },
    "glucose_pp": {
        "name": "Post-Prandial Blood Glucose",
        "standard_unit": "mg/dL",
        "category": "Diabetes",
        "aliases": [
            "plasma glucose - pp", "post prandial blood sugar", "ppbs", "glucose - post prandial",
            "blood glucose post prandial", "postprandial glucose"
        ]
    },
    "haemoglobin": {
        "name": "Haemoglobin (Hb)",
        "standard_unit": "g/dL",
        "category": "Haemogram / CBC",
        "aliases": [
            "haemoglobin", "hemoglobin", "hb", "hgb"
        ]
    },
    "wbc_total": {
        "name": "Total WBC Count",
        "standard_unit": "/µL",
        "category": "Haemogram / CBC",
        "aliases": [
            "total wbc count", "total leucocyte count", "tlc", "wbc count", "wbc", "total wbc"
        ]
    },
    "platelet_count": {
        "name": "Platelet Count",
        "standard_unit": "/µL",
        "category": "Haemogram / CBC",
        "aliases": [
            "platelet count", "platelets", "total platelet count"
        ]
    },
    "pcv": {
        "name": "Packed Cell Volume (PCV / Hematocrit)",
        "standard_unit": "%",
        "category": "Haemogram / CBC",
        "aliases": [
            "pcv(calc)", "pcv", "packed cell volume", "hematocrit", "hct"
        ]
    },
    "cholesterol_total": {
        "name": "Total Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "aliases": [
            "cholesterol", "total cholesterol", "serum cholesterol", "s. cholesterol"
        ]
    },
    "cholesterol_hdl": {
        "name": "HDL Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "aliases": [
            "hdl cholesterol", "hdl-c", "serum hdl", "hdl"
        ]
    },
    "cholesterol_ldl": {
        "name": "LDL Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "aliases": [
            "ldl cholesterol", "ldl-c", "serum ldl", "ldl"
        ]
    },
    "triglycerides": {
        "name": "Triglycerides",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "aliases": [
            "triglyceride", "triglycerides", "serum triglycerides", "tg"
        ]
    },
    "cholesterol_vldl": {
        "name": "VLDL Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "aliases": [
            "vldl", "vldl cholesterol", "serum vldl"
        ]
    },
    "cholesterol_hdl_ratio": {
        "name": "Total Cholesterol / HDL Ratio",
        "standard_unit": "ratio",
        "category": "Lipid Profile",
        "aliases": [
            "cholesterol/hdl-c", "chol/hdl ratio", "tc/hdl", "total cholesterol / hdl"
        ]
    },
    "sgpt": {
        "name": "Alanine Aminotransferase (ALT / SGPT)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "aliases": [
            "alt (sgpt)", "sgpt", "alt", "alanine aminotransferase", "serum glutamic pyruvic transaminase"
        ]
    },
    "sgot": {
        "name": "Aspartate Aminotransferase (AST / SGOT)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "aliases": [
            "ast (sgot)", "sgot", "ast", "aspartate aminotransferase", "serum glutamic oxaloacetic transaminase"
        ]
    },
    "alk_phos": {
        "name": "Alkaline Phosphatase (ALP)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "aliases": [
            "alkaline phosphatase", "alp", "alk phos"
        ]
    },
    "ggt": {
        "name": "Gamma Glutamyl Transferase (GGT)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "aliases": [
            "gamma glutamyl transferase", "gamma  glutamyl transferase", "ggt", "gamma gt", "ggtp"
        ]
    },
    "bilirubin_total": {
        "name": "Total Bilirubin",
        "standard_unit": "mg/dL",
        "category": "Liver Function",
        "aliases": [
            "bilirubin total", "total bilirubin", "s. bilirubin total", "serum bilirubin total"
        ]
    },
    "bilirubin_direct": {
        "name": "Direct / Conjugated Bilirubin",
        "standard_unit": "mg/dL",
        "category": "Liver Function",
        "aliases": [
            "bilirubin conjugated", "bilirubin direct", "direct bilirubin", "conjugated bilirubin"
        ]
    },
    "protein_total": {
        "name": "Total Protein",
        "standard_unit": "g/dL",
        "category": "Liver Function",
        "aliases": [
            "proteins (total)", "total protein", "total proteins", "serum protein"
        ]
    },
    "albumin": {
        "name": "Albumin",
        "standard_unit": "g/dL",
        "category": "Liver Function",
        "aliases": [
            "albumin", "serum albumin"
        ]
    },
    "globulin": {
        "name": "Globulin",
        "standard_unit": "g/dL",
        "category": "Liver Function",
        "aliases": [
            "globulin", "serum globulin"
        ]
    },
    "calcium": {
        "name": "Calcium",
        "standard_unit": "mg/dL",
        "category": "Skeletal / Minerals",
        "aliases": [
            "calcium", "serum calcium", "s. calcium", "ca"
        ]
    },
    "phosphorus": {
        "name": "Phosphorus",
        "standard_unit": "mg/dL",
        "category": "Skeletal / Minerals",
        "aliases": [
            "phosphorus inorganic", "inorganic phosphorus", "serum phosphorus", "phosphorus"
        ]
    },
    "esr": {
        "name": "Erythrocyte Sedimentation Rate (ESR)",
        "standard_unit": "mm/hr",
        "category": "Inflammation",
        "aliases": [
            "esr", "erythrocyte sedimentation rate"
        ]
    },
    "tsh": {
        "name": "Thyroid Stimulating Hormone (TSH)",
        "standard_unit": "µIU/mL",
        "category": "Thyroid",
        "aliases": [
            "tsh", "thyroid stimulating hormone", "tsh - ultrasensitive"
        ]
    },
    "vitamin_d": {
        "name": "25-OH Vitamin D",
        "standard_unit": "ng/mL",
        "category": "Vitamins",
        "aliases": [
            "vitamin d", "25-oh vitamin d", "25-hydroxy vitamin d", "vit d"
        ]
    },
    "vitamin_b12": {
        "name": "Vitamin B12",
        "standard_unit": "pg/mL",
        "category": "Vitamins",
        "aliases": [
            "vitamin b12", "vit b12", "b12", "cyanocobalamin"
        ]
    }
}

class MedicalNormalizer:
    @staticmethod
    def clean_name(name: str) -> str:
        s = name.lower().strip()
        # Remove trailing method hints in parens if any, except essential tags
        s = re.sub(r"\s+", " ", s)
        return s

    @classmethod
    def match_canonical(cls, test_name: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Returns (canonical_code, canonical_name, standard_unit)
        """
        cleaned = cls.clean_name(test_name)
        
        # 1. Exact match on aliases
        for code, info in CANONICAL_PARAMETERS.items():
            for alias in info["aliases"]:
                if cleaned == alias.lower():
                    return code, info["name"], info["standard_unit"]

        # 2. Substring / starts with match
        for code, info in CANONICAL_PARAMETERS.items():
            for alias in info["aliases"]:
                if cleaned.startswith(alias.lower()) or alias.lower() in cleaned:
                    return code, info["name"], info["standard_unit"]

        return None, None, None

    @staticmethod
    def normalize_unit_and_value(value_numeric: Optional[float], original_unit: Optional[str], canonical_code: Optional[str]) -> Tuple[Optional[float], Optional[str]]:
        """
        Deterministic unit conversion. Retains 100% precision.
        """
        if value_numeric is None:
            return None, original_unit

        if not original_unit:
            return value_numeric, original_unit

        u = original_unit.strip().lower()

        # Handle G% -> g/dL (standard in Indian hematology)
        if u in ["g%", "gm%"]:
            return value_numeric, "g/dL"

        # Handle mg% -> mg/dL
        if u in ["mg%"]:
            return value_numeric, "mg/dL"

        # Handle gm/dL -> g/dL
        if u in ["gm/dl", "gms/dl"]:
            return value_numeric, "g/dL"

        # Handle % of total Hb -> %
        if "%" in u:
            return value_numeric, "%"

        # Handle mm after 1hr -> mm/hr
        if "mm" in u and "hr" in u:
            return value_numeric, "mm/hr"

        # Default: keep original unit & value
        return value_numeric, original_unit
