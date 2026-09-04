from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import Family, Person
from app.schemas.schemas import PersonCreate, PersonResponse

router = APIRouter()

@router.get("/families/default")
def get_or_create_default_family(db: Session = Depends(get_db)):
    family = db.query(Family).first()
    if not family:
        family = Family(name="Shah Family Health Records")
        db.add(family)
        db.commit()
        db.refresh(family)

        # Seed initial family member from sample report: Mrs. Gira K Shah
        default_person = Person(
            family_id=family.id,
            name="Mrs. Gira K Shah",
            relationship_type="Mother",
            gender="Female",
            dob="51 Years",
            blood_group="B+"
        )
        db.add(default_person)
        db.commit()
        db.refresh(family)

    members = db.query(Person).filter(Person.family_id == family.id).all()
    return {
        "id": family.id,
        "name": family.name,
        "members": members
    }

@router.get("/persons", response_model=List[PersonResponse])
def list_persons(db: Session = Depends(get_db)):
    # Ensure default family exists
    get_or_create_default_family(db)
    return db.query(Person).all()

@router.post("/persons", response_model=PersonResponse)
def create_person(payload: PersonCreate, db: Session = Depends(get_db)):
    family = db.query(Family).first()
    if not family:
        family = Family(name="My Family")
        db.add(family)
        db.commit()
        db.refresh(family)

    person = Person(
        family_id=payload.family_id or family.id,
        name=payload.name,
        relationship_type=payload.relationship_type,
        gender=payload.gender,
        dob=payload.dob,
        blood_group=payload.blood_group,
        notes=payload.notes
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person

@router.get("/persons/{person_id}", response_model=PersonResponse)
def get_person(person_id: str, db: Session = Depends(get_db)):
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person
