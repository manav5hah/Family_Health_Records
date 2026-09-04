from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.models.models import Family, Person, Document, Observation, AuditLog
from app.api.v1 import persons, documents, observations, analytics, doctor_visit

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(persons.router, prefix=settings.API_V1_STR, tags=["Family & Persons"])
app.include_router(documents.router, prefix=settings.API_V1_STR, tags=["Documents"])
app.include_router(observations.router, prefix=settings.API_V1_STR, tags=["Observations"])
app.include_router(analytics.router, prefix=settings.API_V1_STR, tags=["Analytics & Trends"])
app.include_router(doctor_visit.router, prefix=settings.API_V1_STR, tags=["Doctor Visit Mode"])

# Serve frontend static assets if built
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "message": "Family Health Records & Longitudinal Health Analysis API",
            "docs": f"{settings.API_V1_STR}/docs"
        }

