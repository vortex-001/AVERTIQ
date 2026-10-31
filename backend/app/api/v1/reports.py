from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Report, Incident, IncidentEtaHistory
from app.schemas.schemas import ReportCreate, ReportResponse, CitizenRescueTrackingResponse, IncidentEtaHistoryItem
from app.services.ingestion import process_incoming_report
from app.api.v1.websocket import broadcast

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_emergency_report(
    payload: ReportCreate,
    db: Session = Depends(get_db)
):
    """
    Submit a citizen emergency report from the web submission portal.
    Stores raw input, runs AI extraction & multilingual classification, 
    resolves locations, and links or creates canonical incidents.
    After processing, broadcasts a new_report event to all WebSocket viewers.
    """
    report = await process_incoming_report(
        db=db,
        original_text=payload.original_text,
        source_channel=payload.source_channel or "web",
        explicit_lat=payload.latitude,
        explicit_lon=payload.longitude,
        location_desc=payload.location_description,
        affected_count=payload.affected_people_count,
        vulnerable_groups=payload.vulnerable_groups,
        resource_requests=payload.resource_requests,
        image_url=payload.image_url,
    )
    # Broadcast to all connected Viewer App clients (non-blocking best-effort)
    try:
        await broadcast({
            "type": "new_report",
            "report": {
                "id": str(report.id),
                "source_channel": report.source_channel,
                "priority_level": getattr(report, "priority_level", "medium"),
                "disaster_type": getattr(report, "disaster_type", "other"),
                "latitude": report.latitude,
                "longitude": report.longitude,
                "created_at": report.created_at.isoformat() if report.created_at else None,
            }
        })
    except Exception as exc:
        logger.warning(f"Failed to broadcast new_report: {exc}")
    return report

@router.get("", response_model=List[ReportResponse])
def list_reports(
    incident_id: Optional[str] = Query(None, description="Filter by canonical incident ID"),
    language: Optional[str] = Query(None, description="Filter by language code (hi, pa, en, mixed)"),
    source_channel: Optional[str] = Query(None, description="Filter by source (web, telegram)"),
    unlocated_only: bool = Query(False, description="Filter reports without coordinates"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieves reports with filtering and pagination.
    """
    query = db.query(Report)
    if incident_id:
        query = query.filter(Report.incident_id == incident_id)
    if language:
        query = query.filter(Report.language == language)
    if source_channel:
        query = query.filter(Report.source_channel == source_channel)
    if unlocated_only:
        query = query.filter(Report.latitude.is_(None))
        
    return query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()

@router.get("/{report_id}/response-status", response_model=CitizenRescueTrackingResponse)
def get_report_rescue_status(
    report_id: str,
    db: Session = Depends(get_db)
):
    """
    Allows citizens and field tracking apps to query real-time rescue status & ETA
    for a specific report they submitted. Returns the linked incident status,
    estimated response time in minutes, expected arrival timestamp, and response timeline stage (1 - 7).
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    incident = report.incident
    response_status = "received"
    estimated_minutes = None
    arrival_time = None
    team_name = None
    notes = None
    title = None
    inc_type = None
    loc_name = report.location_description
    priority_level = "medium"
    history_items = []

    if incident:
        response_status = incident.response_status or "received"
        estimated_minutes = incident.estimated_response_minutes
        arrival_time = incident.expected_arrival_at
        team_name = incident.response_team_name
        notes = incident.response_notes
        title = incident.canonical_title
        inc_type = incident.incident_type
        loc_name = incident.location_name or loc_name
        priority_level = incident.priority_level
        history_records = db.query(IncidentEtaHistory).filter(IncidentEtaHistory.incident_id == incident.id).order_by(IncidentEtaHistory.created_at.asc()).all()
        history_items = [IncidentEtaHistoryItem.model_validate(h) for h in history_records]

    # Map response_status to 7-stage visual timeline:
    # 1: Report Received
    # 2: Verified / Under Review
    # 3: Response Assigned
    # 4: Team Dispatched
    # 5: Team En Route
    # 6: Rescue In Progress
    # 7: Resolved
    stage_map = {
        "received": 1,
        "under_review": 2,
        "verified": 2,
        "response_assigned": 3,
        "team_dispatched": 4,
        "team_en_route": 5,
        "rescue_in_progress": 6,
        "resolved": 7,
        "closed": 7,
        "rejected": 0,
    }
    stage = stage_map.get(response_status, 1)

    return CitizenRescueTrackingResponse(
        report_id=report.id,
        incident_id=incident.id if incident else None,
        canonical_title=title,
        incident_type=inc_type,
        location_name=loc_name,
        priority_level=priority_level,
        response_status=response_status,
        timeline_stage=stage,
        estimated_response_minutes=estimated_minutes,
        expected_arrival_at=arrival_time,
        response_team_name=team_name,
        response_notes=notes,
        history=history_items
    )

