from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import Incident, Report, ReportEmbedding, EvidenceItem
from app.services.ai_extractor import extract_incident_intelligence
from app.services.geocoding import resolve_location_from_text, geocode_query_online
from app.services.deduplication import generate_multilingual_embedding, evaluate_duplicate_match
from app.services.priority_engine import calculate_priority_score
from app.services.external_evidence import fetch_open_meteo_rainfall

async def process_incoming_report(
    db: Session,
    original_text: str,
    source_channel: str,
    explicit_lat: Optional[float] = None,
    explicit_lon: Optional[float] = None,
    location_desc: Optional[str] = None,
    affected_count: Optional[int] = None,
    vulnerable_groups: Optional[str] = None,
    resource_requests: Optional[str] = None,
    image_url: Optional[str] = None,
    telegram_user_id: Optional[str] = None,
    telegram_message_id: Optional[str] = None,
    raw_metadata: Optional[Dict[str, Any]] = None,
) -> Report:
    """
    Unified end-to-end processing pipeline for emergency reports.
    Both Telegram and Web channel feed this exact pipeline.
    """
    # 1. Idempotency check for Telegram / webhook retries
    if telegram_user_id and telegram_message_id:
        existing = db.query(Report).filter(
            Report.telegram_user_id == telegram_user_id,
            Report.telegram_message_id == telegram_message_id
        ).first()
        if existing:
            return existing

    # 2. AI Intelligence Extraction
    ai_data = await extract_incident_intelligence(original_text)
    
    # Merge extracted details if user didn't explicitly provide them
    incident_type = ai_data.get("incident_type", "other")
    extracted_affected = affected_count if affected_count is not None else ai_data.get("affected_people_count")
    extracted_vulnerable = vulnerable_groups or ai_data.get("vulnerable_groups")
    extracted_resources = resource_requests or ai_data.get("resource_requests")
    urgency = ai_data.get("preliminary_urgency", "medium")

    # 3. Location Resolution Priority:
    # 1. Coordinates explicitly provided (GPS/web form picker)
    # 2. Geocoded landmark from text
    # 3. None (unconfirmed)
    final_lat = None
    final_lon = None
    location_source = "unconfirmed"
    location_confidence = 0.0
    accuracy_m = 1000.0
    location_name = location_desc

    if explicit_lat is not None and explicit_lon is not None:
        final_lat = explicit_lat
        final_lon = explicit_lon
        location_source = "explicit_reporter" if source_channel == "telegram" else "web_form_map"
        location_confidence = 0.95
        accuracy_m = 50.0
    else:
        # Try landmark resolution
        text_to_search = f"{original_text} {location_desc or ''}"
        landmark_res = resolve_location_from_text(text_to_search)
        if landmark_res:
            final_lat, final_lon, accuracy_m, location_name, location_source = landmark_res
            location_confidence = 0.75
        elif location_desc:
            online_res = await geocode_query_online(location_desc)
            if online_res:
                final_lat, final_lon, accuracy_m, location_name, location_source = online_res
                location_confidence = 0.70

    # 4. Generate Multilingual Embedding
    embedding_vec = generate_multilingual_embedding(original_text)

    # 5. Semantic Deduplication Check
    open_incidents = db.query(Incident).filter(Incident.status.in_(["triaged", "under_review", "open"])).all()
    matched_incident = None

    for inc in open_incidents:
        match_result = evaluate_duplicate_match(
            report_text=original_text,
            report_type=incident_type,
            report_lat=final_lat,
            report_lon=final_lon,
            report_time=datetime.now(timezone.utc),
            existing_incident_title=inc.canonical_title,
            existing_incident_type=inc.incident_type,
            existing_lat=inc.latitude,
            existing_lon=inc.longitude,
            existing_time=inc.created_at,
        )
        if match_result["is_duplicate"]:
            matched_incident = inc
            break

    # 6. Create or Link to Incident
    if matched_incident:
        target_incident = matched_incident
        target_incident.report_count += 1
        
        # If existing incident was missing coordinates, but new report has them, update!
        if target_incident.latitude is None and final_lat is not None:
            target_incident.latitude = final_lat
            target_incident.longitude = final_lon
            target_incident.location_name = location_name or target_incident.location_name
            target_incident.is_location_confirmed = True
    else:
        # Create new canonical incident
        title = f"{incident_type.title()} reported"
        if location_name:
            title += f" near {location_name}"
            
        target_incident = Incident(
            canonical_title=title,
            incident_type=incident_type,
            description=original_text,
            latitude=final_lat,
            longitude=final_lon,
            location_name=location_name,
            location_accuracy_radius_m=accuracy_m,
            is_location_confirmed=(location_source in ["explicit_reporter", "web_form_map"]),
            report_count=1,
            status="triaged",
            verification_status="unchecked"
        )
        db.add(target_incident)
        db.flush() # get target_incident.id

    # 7. Create Report Record
    report = Report(
        incident_id=target_incident.id,
        original_text=original_text,
        source_channel=source_channel,
        language=ai_data.get("language", "en"),
        language_mixture=ai_data.get("language_mixture"),
        location_description=location_name or location_desc,
        latitude=final_lat,
        longitude=final_lon,
        location_source=location_source,
        location_confidence=location_confidence,
        affected_people_count=extracted_affected,
        vulnerable_groups=extracted_vulnerable,
        resource_requests=extracted_resources,
        image_url=image_url,
        telegram_user_id=telegram_user_id,
        telegram_message_id=telegram_message_id,
        raw_metadata=raw_metadata or {},
        ai_extraction=ai_data,
    )
    db.add(report)
    db.flush()

    # Save embedding
    rep_embed = ReportEmbedding(
        report_id=report.id,
        embedding_json=embedding_vec
    )
    db.add(rep_embed)

    # 8. External Hazard Evidence Query (Open-Meteo)
    corrob_evidence_count = 0
    if final_lat is not None and final_lon is not None:
        weather_ev = await fetch_open_meteo_rainfall(final_lat, final_lon)
        if weather_ev:
            evidence_rec = EvidenceItem(
                incident_id=target_incident.id,
                source=weather_ev["source"],
                source_event_id=weather_ev["source_event_id"],
                observation_time=weather_ev["observation_time"],
                evidence_type=weather_ev["evidence_type"],
                measurement_value=weather_ev["measurement_value"],
                unit=weather_ev["unit"],
                relationship_to_incident=weather_ev["relationship_to_incident"],
                confidence_score=weather_ev["confidence_score"],
                limitations_note=weather_ev["limitations_note"],
                raw_payload=weather_ev["raw_payload"]
            )
            db.add(evidence_rec)
            if weather_ev["relationship_to_incident"] == "corroborating":
                corrob_evidence_count += 1

    # 9. Priority Engine Calculation
    priority_calc = calculate_priority_score(
        incident_type=target_incident.incident_type,
        threat_severity_str=urgency,
        affected_people_count=extracted_affected,
        vulnerable_groups=extracted_vulnerable,
        report_count=target_incident.report_count,
        corroborating_evidence_count=corrob_evidence_count,
        is_location_confirmed=target_incident.is_location_confirmed,
        has_coordinates=(target_incident.latitude is not None and target_incident.longitude is not None),
    )
    target_incident.priority_score = priority_calc["priority_score"]
    target_incident.priority_level = priority_calc["priority_level"]
    target_incident.priority_explanation = priority_calc["priority_explanation"]
    target_incident.priority_factors = priority_calc["priority_factors"]

    db.commit()
    db.refresh(report)
    return report
