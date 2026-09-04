import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BASE_DIR.parent
STORAGE_DIR = WORKSPACE_DIR / "storage"
DOCUMENTS_DIR = STORAGE_DIR / "documents"
DB_PATH = STORAGE_DIR / "health_records.db"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "Family Health Records & Longitudinal Health Analysis"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    STORAGE_DIR: Path = STORAGE_DIR
    DOCUMENTS_DIR: Path = DOCUMENTS_DIR
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()
