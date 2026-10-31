from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_coordinator_or_admin, get_current_user_optional
from app.models.models import Incident, Report, ReviewAction, User, IncidentEtaHistory
from app.schemas.schemas import (
    IncidentResponse,
    IncidentDetailResponse,
    IncidentUpdateRequest,
    IncidentReviewRequest,
    IncidentMergeRequest,
    IncidentUnmergeRequest,
    IncidentEtaAssignRequest,
    IncidentResponseStatusUpdateRequest,
    IncidentEtaHistoryItem,
)
from app.services.geocoding import haversine_distance_km
from app.api.v1.websocket import broadcast

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    incident_type: Optional[str] = Query(None, description="flood, fire, earthquake, etc."),
    priority_level: Optional[str] = Query(None, description="high, medium, low, unconfirmed"),
    status_filter: Optional[str] = Query(None, alias="status", description="triaged, under_review, resolved, closed"),
    verification_status: Optional[str] = Query(None, description="unchecked, partially_corroborated, human_verified"),
    response_status: Optional[str] = Query(None, description="received, under_review, verified, response_assigned, team_dispatched, team_en_route, rescue_in_progress, resolved"),
    is_demo: Optional[bool] = Query(None, description="Filter demo records (True, False, or None for all)"),
    lat: Optional[float] = Query(None, description="Center latitude for radius search"),
    lon: Optional[float] = Query(None, description="Center longitude for radius search"),
    radius_km: Optional[float] = Query(None, description="Radius in kilometers"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if priority_level:
        query = query.filter(Incident.priority_level == priority_level)
    if status_filter:
        query = query.filter(Incident.status == status_filter)
    if verification_status:
        query = query.filter(Incident.verification_status == verification_status)
    if response_status:
        query = query.filter(Incident.response_status == response_status)
    if is_demo is not None:
        query = query.filter(Incident.is_demo == is_demo)

    all_items = query.order_by(Incident.priority_score.desc(), Incident.created_at.desc()).all()

    # Apply geospatial radius filtering if requested
    if lat is not None and lon is not None and radius_km is not None:
        filtered = []
        for inc in all_items:
            if inc.latitude is not None and inc.longitude is not None:
                dist = haversine_distance_km(lat, lon, inc.latitude, inc.longitude)
                if dist <= radius_km:
                    filtered.append(inc)
            elif inc.latitude is None:
                # Include unlocated in review views unless filtered
                pass
        return filtered[skip:skip + limit]

    return all_items[skip:skip + limit]

@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    payload: IncidentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_or_admin)
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    changes = {}
    for field, val in payload.model_dump(exclude_unset=True).items():
        old_val = getattr(incident, field)
        if old_val != val:
            setattr(incident, field, val)
            changes[field] = {"old": old_val, "new": val}

    if changes:
        # Record audit log
        audit = ReviewAction(
            entity_type="incident",
            entity_id=incident.id,
            reviewer_id=current_user.id,
            reviewer_name=current_user.full_name,
            action_type="update_fields",
            note="Manual incident field update",
            changes_json=changes
        )
        db.add(audit)
        incident.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(incident)

    return incident

@router.post("/{incident_id}/review", response_model=IncidentResponse)
def review_incident(
    incident_id: str,
    payload: IncidentReviewRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Coordinator review action: approve, reject, edit_location, change_status.
    Stores complete audit record.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    reviewer_id = current_user.id if current_user else "anonymous-coordinator"
    reviewer_name = current_user.full_name if current_user else "Human Coordinator"

    changes = {}
    if payload.action == "approve":
        incident.status = "under_review"
        incident.verification_status = "human_verified"
        changes["verification_status"] = "human_verified"
    elif payload.action == "reject":
        incident.status = "closed"
        incident.verification_status = "unable_to_verify"
        changes["status"] = "closed"
    elif payload.action == "edit_location":
        if payload.new_latitude is not None and payload.new_longitude is not None:
            changes["latitude"] = {"old": incident.latitude, "new": payload.new_latitude}
            changes["longitude"] = {"old": incident.longitude, "new": payload.new_longitude}
            incident.latitude = payload.new_latitude
            incident.longitude = payload.new_longitude
            incident.is_location_confirmed = True
        if payload.new_location_name:
            incident.location_name = payload.new_location_name

    if payload.verification_status:
        incident.verification_status = payload.verification_status
        changes["verification_status"] = payload.verification_status
    if payload.status:
        incident.status = payload.status
        changes["status"] = payload.status

    audit = ReviewAction(
        entity_type="incident",
        entity_id=incident.id,
        reviewer_id=reviewer_id,
        reviewer_name=reviewer_name,
        action_type=payload.action,
        note=payload.note or f"Action {payload.action} recorded",
        changes_json=changes
    )
    db.add(audit)
    incident.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    return incident

@router.post("/merge", response_model=IncidentResponse)
@router.post("/{incident_id}/merge", response_model=IncidentResponse)
def merge_incidents(
    payload: IncidentMergeRequest,
    incident_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    target_id = incident_id or payload.target_incident_id
    target = db.query(Incident).filter(Incident.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target incident not found")

    reviewer_name = current_user.full_name if current_user else "Human Coordinator"

    merged_ids = []
    for s_id in payload.source_incident_ids:
        if s_id == target.id:
            continue
        src = db.query(Incident).filter(Incident.id == s_id).first()
        if src:
            # Re-link all reports to target incident
            reports_to_move = db.query(Report).filter(Report.incident_id == src.id).all()
            for r in reports_to_move:
                r.incident_id = target.id
                target.report_count += 1
            src.status = "closed"
            merged_ids.append(src.id)

    audit = ReviewAction(
        entity_type="incident",
        entity_id=target.id,
        reviewer_name=reviewer_name,
        action_type="merge_duplicates",
        note=payload.reason or f"Merged incidents {merged_ids} into {target.id}",
        changes_json={"merged_source_ids": merged_ids}
    )
    db.add(audit)
    db.commit()
    db.refresh(target)
    return target

@router.post("/unmerge", response_model=IncidentResponse)
@router.post("/{incident_id}/unmerge", response_model=IncidentResponse)
def unmerge_report(
    payload: IncidentUnmergeRequest,
    incident_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    report = db.query(Report).filter(Report.id == payload.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    old_incident_id = report.incident_id
    if not old_incident_id:
        raise HTTPException(status_code=400, detail="Report is not linked to any incident")

    old_incident = db.query(Incident).filter(Incident.id == old_incident_id).first()
    if old_incident and old_incident.report_count > 1:
        old_incident.report_count -= 1

    # Create new distinct incident for this report
    new_inc = Incident(
        canonical_title=f"Unmerged: {report.original_text[:40]}...",
        incident_type="other" if not report.ai_extraction else report.ai_extraction.get("incident_type", "other"),
        description=report.original_text,
        latitude=report.latitude,
        longitude=report.longitude,
        location_name=report.location_description,
        is_location_confirmed=(report.location_source in ["explicit_reporter", "web_form_map"]),
        report_count=1,
        status="triaged",
        verification_status="unchecked",
        priority_score=35.0,
        priority_level="medium" if report.latitude is not None else "unconfirmed",
        priority_explanation="Unmerged from duplicate cluster by coordinator for separate evaluation."
    )
    db.add(new_inc)
    db.flush()

    report.incident_id = new_inc.id

    reviewer_name = current_user.full_name if current_user else "Human Coordinator"
    audit = ReviewAction(
        entity_type="incident",
        entity_id=new_inc.id,
        reviewer_name=reviewer_name,
        action_type="unmerge_report",
        note=payload.reason or f"Unmerged report {report.id} from incident {old_incident_id}",
        changes_json={"old_incident_id": old_incident_id, "new_incident_id": new_inc.id}
    )
    db.add(audit)
    db.commit()
    db.refresh(new_inc)
    return new_inc

# ==================== Rescue Time (ETA) & Lifecycle Operations ====================

@router.post("/{incident_id}/assign-eta", response_model=IncidentResponse)
async def assign_incident_eta(
    incident_id: str,
    payload: IncidentEtaAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_or_admin)
):
    """
    Assign or update the Estimated Rescue Response Time (ETA in minutes) for an incident.
    Calculates expected arrival datetime, sets response status, records ETA audit history,
    and broadcasts live update to connected citizens & responders over WebSocket.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    from datetime import timedelta
    now = datetime.now(timezone.utc)
    arrival_time = now + timedelta(minutes=payload.estimated_response_minutes)

    old_eta = incident.estimated_response_minutes
    old_status = incident.response_status or "received"
    new_status = payload.update_lifecycle_status or "response_assigned"

    incident.estimated_response_minutes = payload.estimated_response_minutes
    incident.expected_arrival_at = arrival_time
    if payload.response_team_name:
        incident.response_team_name = payload.response_team_name
    if payload.assigned_coordinator_id:
        incident.assigned_coordinator_id = payload.assigned_coordinator_id
    else:
        incident.assigned_coordinator_id = current_user.id
    if payload.response_notes:
        incident.response_notes = payload.response_notes
    incident.response_status = new_status
    incident.updated_at = now

    # Record history log
    history = IncidentEtaHistory(
        incident_id=incident.id,
        changed_by=current_user.full_name or current_user.email,
        old_eta_minutes=old_eta,
        new_eta_minutes=payload.estimated_response_minutes,
        expected_arrival_at=arrival_time,
        old_status=old_status,
        new_status=new_status,
        response_team_name=incident.response_team_name,
        notes=payload.response_notes,
        created_at=now
    )
    db.add(history)

    # Record review action audit
    audit = ReviewAction(
        entity_type="incident",
        entity_id=incident.id,
        reviewer_id=current_user.id,
        reviewer_name=current_user.full_name,
        action_type="assign_eta",
        note=f"Assigned ETA: {payload.estimated_response_minutes}m. Status: {new_status}. Team: {incident.response_team_name or 'N/A'}",
        changes_json={
            "old_eta": old_eta,
            "new_eta": payload.estimated_response_minutes,
            "expected_arrival": arrival_time.isoformat(),
            "response_status": new_status
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    # Collect linked report IDs for citizen app cross-resolution
    linked_report_ids = [r.id for r in incident.reports]
    primary_report_id = linked_report_ids[0] if linked_report_ids else None

    # Broadcast event via WebSocket to Flutter citizen apps and responders
    await broadcast({
        "type": "eta_updated",
        "incident_id": incident.id,
        "report_id": primary_report_id,
        "report_ids": linked_report_ids,
        "estimated_response_minutes": incident.estimated_response_minutes,
        "expected_arrival_at": arrival_time.isoformat(),
        "response_status": incident.response_status,
        "response_team_name": incident.response_team_name,
        "response_notes": incident.response_notes,
    })

    return incident

@router.patch("/{incident_id}/response-status", response_model=IncidentResponse)
async def update_incident_response_status(
    incident_id: str,
    payload: IncidentResponseStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_coordinator_or_admin)
):
    """
    Advance or update the emergency response lifecycle stage.
    Stages: received -> under_review -> verified -> response_assigned -> team_dispatched -> team_en_route -> rescue_in_progress -> resolved
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    now = datetime.now(timezone.utc)
    old_status = incident.response_status or "received"

    incident.response_status = payload.response_status
    if payload.response_team_name:
        incident.response_team_name = payload.response_team_name
    if payload.response_notes:
        incident.response_notes = payload.response_notes
    incident.updated_at = now

    history = IncidentEtaHistory(
        incident_id=incident.id,
        changed_by=current_user.full_name or current_user.email,
        old_eta_minutes=incident.estimated_response_minutes,
        new_eta_minutes=incident.estimated_response_minutes,
        expected_arrival_at=incident.expected_arrival_at,
        old_status=old_status,
        new_status=payload.response_status,
        response_team_name=incident.response_team_name,
        notes=payload.response_notes,
        created_at=now
    )
    db.add(history)

    audit = ReviewAction(
        entity_type="incident",
        entity_id=incident.id,
        reviewer_id=current_user.id,
        reviewer_name=current_user.full_name,
        action_type="update_response_status",
        note=f"Advanced response lifecycle from {old_status} to {payload.response_status}",
        changes_json={"old_status": old_status, "new_status": payload.response_status}
    )
    db.add(audit)
    db.commit()
    db.refresh(incident)

    # Collect linked report IDs for citizen app cross-resolution
    linked_report_ids = [r.id for r in incident.reports]
    primary_report_id = linked_report_ids[0] if linked_report_ids else None

    await broadcast({
        "type": "status_update",
        "incident_id": incident.id,
        "report_id": primary_report_id,
        "report_ids": linked_report_ids,
        "status": incident.response_status,
        "response_status": incident.response_status,
        "response_team_name": incident.response_team_name,
        "response_notes": incident.response_notes,
        "estimated_response_minutes": incident.estimated_response_minutes,
        "expected_arrival_at": incident.expected_arrival_at.isoformat() if incident.expected_arrival_at else None,
    })

    return incident

@router.get("/{incident_id}/eta-history", response_model=List[IncidentEtaHistoryItem])
def get_incident_eta_history(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """
    Retrieve full audit trail of ETA changes and response stage updates for an incident.
    """
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return db.query(IncidentEtaHistory).filter(IncidentEtaHistory.incident_id == incident_id).order_by(IncidentEtaHistory.created_at.desc()).all()

