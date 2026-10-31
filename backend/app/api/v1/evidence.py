from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import EvidenceItem
from app.schemas.schemas import EvidenceItemResponse

router = APIRouter(prefix="/evidence", tags=["Evidence"])

@router.get("", response_model=List[EvidenceItemResponse])
def list_evidence(
    incident_id: Optional[str] = Query(None, description="Filter by incident ID"),
    source: Optional[str] = Query(None, description="open-meteo, usgs, gdacs"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(EvidenceItem)
    if incident_id:
        query = query.filter(EvidenceItem.incident_id == incident_id)
    if source:
        query = query.filter(EvidenceItem.source == source)
    return query.order_by(EvidenceItem.retrieval_time.desc()).offset(skip).limit(limit).all()
