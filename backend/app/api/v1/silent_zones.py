from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user_optional
from app.models.models import SilentZoneCell, ReviewAction, User
from app.schemas.schemas import SilentZoneCellResponse, SilentZoneReviewRequest
from app.services.silent_zone_engine import evaluate_all_silent_zones

router = APIRouter(prefix="/zones", tags=["Silent Zones"])

@router.get("/silent-risk", response_model=List[SilentZoneCellResponse])
async def get_silent_risk_zones(db: Session = Depends(get_db)):
    """
    Returns spatial grid cells with evaluated hazard scores, reporting deficits,
    risk classification, and explanation of why flagged.
    """
    cells = await evaluate_all_silent_zones(db)
    return cells

@router.post("/review", response_model=SilentZoneCellResponse)
def review_silent_zone_cell(
    payload: SilentZoneReviewRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Allows coordinator to mark silent zones as:
    needs_verification, verification_in_progress, reviewed, false_alert, confirmed_concern
    """
    cell = db.query(SilentZoneCell).filter(SilentZoneCell.id == payload.cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Silent zone cell not found")

    old_status = cell.review_status
    cell.review_status = payload.action

    reviewer_name = current_user.full_name if current_user else "Human Coordinator"
    audit = ReviewAction(
        entity_type="silent_zone",
        entity_id=cell.id,
        reviewer_name=reviewer_name,
        action_type=f"zone_review_{payload.action}",
        note=payload.note or f"Cell review status changed from {old_status} to {payload.action}",
        changes_json={"old_status": old_status, "new_status": payload.action}
    )
    db.add(audit)
    db.commit()
    db.refresh(cell)
    return cell
