from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Incident, Report, SilentZoneCell, ReviewAction
from app.schemas.schemas import DashboardSummaryResponse, ReviewActionResponse
from app.api.v1.sources import get_source_statuses
from app.seed.demo_data import seed_demo_dataset

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Computes real-time incident, report, silent-zone, and telemetry metrics from the database.
    """
    total_reports = db.query(Report).count()
    mobile_reports = db.query(Report).filter(Report.source_channel == "mobile").count()
    telegram_reports = db.query(Report).filter(Report.source_channel == "telegram").count()
    unique_incidents = db.query(Incident).count()
    high_priority_incidents = db.query(Incident).filter(Incident.priority_level == "high").count()
    reports_awaiting_review = db.query(Incident).filter(Incident.verification_status == "unchecked").count()
    potential_silent_zones = db.query(SilentZoneCell).filter(
        SilentZoneCell.risk_category.in_(["critical", "high"])
    ).count()
    
    # Incidents with >1 report constitute duplicate clusters
    duplicate_groups = db.query(Incident).filter(Incident.report_count > 1).count()
    unverified_incidents = db.query(Incident).filter(Incident.verification_status != "human_verified").count()

    # Breakdown by incident type
    type_counts = dict(
        db.query(Incident.incident_type, func.count(Incident.id)).group_by(Incident.incident_type).all()
    )
    # Breakdown by priority
    priority_counts = dict(
        db.query(Incident.priority_level, func.count(Incident.id)).group_by(Incident.priority_level).all()
    )

    external_sources = await get_source_statuses()

    return DashboardSummaryResponse(
        total_reports=total_reports,
        mobile_reports=mobile_reports,
        telegram_reports=telegram_reports,
        unique_incidents=unique_incidents,
        high_priority_incidents=high_priority_incidents,
        reports_awaiting_review=reports_awaiting_review,
        potential_silent_zones=potential_silent_zones,
        duplicate_groups=duplicate_groups,
        unverified_incidents=unverified_incidents,
        external_sources=external_sources,
        incidents_by_type=type_counts,
        incidents_by_priority=priority_counts
    )

@router.get("/review-history", response_model=List[ReviewActionResponse])
def get_review_history(db: Session = Depends(get_db)):
    """
    Audit log of coordinator reviews, verification actions, and merges.
    """
    return db.query(ReviewAction).order_by(ReviewAction.created_at.desc()).limit(100).all()

@router.post("/seed-demo")
def trigger_seed_demo(db: Session = Depends(get_db)):
    """
    Seeds realistic synthetic disaster intelligence data.
    """
    return seed_demo_dataset(db)

@router.post("/reset-demo")
def trigger_reset_demo(db: Session = Depends(get_db)):
    """
    Safely resets incident, report, and silent zone tables.
    """
    db.query(ReviewAction).delete()
    db.query(Report).delete()
    db.query(Incident).delete()
    db.query(SilentZoneCell).delete()
    db.commit()
    return {"status": "success", "message": "Demo data wiped cleanly."}
