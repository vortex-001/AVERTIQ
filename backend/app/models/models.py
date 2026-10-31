import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="coordinator", nullable=False)  # admin, coordinator, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    canonical_title = Column(String(255), nullable=False)
    incident_type = Column(String(50), index=True, nullable=False)  # flood, earthquake, fire, cyclone, landslide, other
    description = Column(Text, nullable=True)
    
    # Location tracking
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    location_name = Column(String(255), nullable=True)
    location_accuracy_radius_m = Column(Float, default=1000.0)
    is_location_confirmed = Column(Boolean, default=False)
    
    # Priority & Intelligence
    priority_score = Column(Float, default=0.0, index=True)  # 0 to 100
    priority_level = Column(String(50), default="low", index=True)  # high, medium, low, unconfirmed
    priority_explanation = Column(Text, nullable=True)
    priority_factors = Column(JSON, default=dict)
    
    # Workflow
    status = Column(String(50), default="triaged", index=True)  # triaged, under_review, resolved, closed
    verification_status = Column(String(50), default="unchecked", index=True)  # unchecked, partially_corroborated, conflicting_evidence, human_verified, unable_to_verify
    report_count = Column(Integer, default=1)
    
    # Rescue & Response Management
    estimated_response_minutes = Column(Integer, nullable=True)
    expected_arrival_at = Column(DateTime(timezone=True), nullable=True)
    assigned_coordinator_id = Column(String(100), nullable=True)
    response_team_name = Column(String(255), nullable=True)
    response_notes = Column(Text, nullable=True)
    response_status = Column(String(50), default="received", index=True) # received, under_review, verified, response_assigned, team_dispatched, team_en_route, rescue_in_progress, resolved, closed, rejected
    is_demo = Column(Boolean, default=False, index=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    reports = relationship("Report", back_populates="incident")
    evidence_items = relationship("EvidenceItem", back_populates="incident", cascade="all, delete-orphan")
    eta_history = relationship("IncidentEtaHistory", back_populates="incident", cascade="all, delete-orphan", order_by="desc(IncidentEtaHistory.created_at)")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    
    original_text = Column(Text, nullable=False)
    source_channel = Column(String(50), nullable=False)  # telegram, web
    language = Column(String(50), default="en")  # hi, pa, en, mixed
    language_mixture = Column(String(100), nullable=True)
    
    # Geocoding & coordinates
    location_description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True, index=True)
    longitude = Column(Float, nullable=True, index=True)
    location_source = Column(String(50), default="unconfirmed")  # explicit_reporter, web_form_map, geocoded_landmark, human_confirmed, unconfirmed
    location_confidence = Column(Float, default=0.0)
    
    # Details extracted
    affected_people_count = Column(Integer, nullable=True)
    vulnerable_groups = Column(String(255), nullable=True)
    resource_requests = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    
    # Telegram idempotency & metadata
    telegram_user_id = Column(String(100), nullable=True, index=True)
    telegram_message_id = Column(String(100), nullable=True, index=True)
    raw_metadata = Column(JSON, default=dict)
    ai_extraction = Column(JSON, default=dict)
    is_demo = Column(Boolean, default=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    incident = relationship("Incident", back_populates="reports")
    embedding = relationship("ReportEmbedding", back_populates="report", uselist=False, cascade="all, delete-orphan")

class ReportEmbedding(Base):
    __tablename__ = "report_embeddings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id", ondelete="CASCADE"), unique=True, nullable=False)
    embedding_json = Column(JSON, nullable=False)  # Stored as list of floats for universal database compatibility
    created_at = Column(DateTime(timezone=True), default=utc_now)

    report = relationship("Report", back_populates="embedding")

class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    
    source = Column(String(100), nullable=False)  # open-meteo, usgs, gdacs, nasa-firms, sachet
    source_event_id = Column(String(255), nullable=True)
    observation_time = Column(DateTime(timezone=True), nullable=True)
    retrieval_time = Column(DateTime(timezone=True), default=utc_now)
    
    evidence_type = Column(String(100), nullable=False)  # rainfall, seismic, flood_alert, fire_hotspot
    measurement_value = Column(String(255), nullable=True)
    unit = Column(String(50), nullable=True)
    relationship_to_incident = Column(String(50), default="corroborating")  # corroborating, conflicting, contextual
    confidence_score = Column(Float, default=0.7)
    limitations_note = Column(Text, nullable=True)
    is_stale = Column(Boolean, default=False)
    raw_payload = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    incident = relationship("Incident", back_populates="evidence_items")

class SilentZoneCell(Base):
    __tablename__ = "silent_zone_cells"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cell_code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Boundary box
    min_lat = Column(Float, nullable=False)
    max_lat = Column(Float, nullable=False)
    min_lon = Column(Float, nullable=False)
    max_lon = Column(Float, nullable=False)
    center_lat = Column(Float, nullable=False)
    center_lon = Column(Float, nullable=False)
    
    # Silent-Zone Scoring Factors
    hazard_score = Column(Float, default=0.0)         # 0 - 100
    report_count = Column(Integer, default=0)
    reporting_density = Column(Float, default=0.0)
    reporting_deficit = Column(Float, default=0.0)     # high hazard + 0 reports = high deficit
    vulnerability_score = Column(Float, default=20.0) # default baseline
    data_coverage_score = Column(Float, default=85.0) # sensor coverage confidence
    
    silent_zone_risk = Column(Float, default=0.0)     # Combined score
    risk_category = Column(String(50), default="low") # critical, high, moderate, low, insufficient_evidence
    
    hazard_summary = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    recommended_action = Column(String(255), default="Human verification required")
    uncertainty_score = Column(Float, default=0.3)
    
    # Workflow
    review_status = Column(String(50), default="needs_verification")  # needs_verification, verification_in_progress, reviewed, false_alert, confirmed_concern
    last_evaluated_at = Column(DateTime(timezone=True), default=utc_now)

class ReviewAction(Base):
    __tablename__ = "review_actions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    entity_type = Column(String(50), nullable=False)  # incident, report, silent_zone
    entity_id = Column(String(36), nullable=False, index=True)
    
    reviewer_id = Column(String(36), nullable=True)
    reviewer_name = Column(String(255), default="Coordinator")
    action_type = Column(String(50), nullable=False)  # approve, reject, edit_location, merge, unmerge, change_status, verify_zone, dismiss_zone
    note = Column(Text, nullable=True)
    changes_json = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ExternalSourceStatus(Base):
    __tablename__ = "external_source_statuses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_name = Column(String(100), unique=True, nullable=False)
    is_healthy = Column(Boolean, default=True)
    last_ping_at = Column(DateTime(timezone=True), default=utc_now)
    last_success_at = Column(DateTime(timezone=True), default=utc_now)
    status_message = Column(String(255), default="Operational")
    latency_ms = Column(Float, default=120.0)

class IncidentEtaHistory(Base):
    __tablename__ = "incident_eta_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by = Column(String(255), nullable=False, default="Admin")
    old_eta_minutes = Column(Integer, nullable=True)
    new_eta_minutes = Column(Integer, nullable=True)
    expected_arrival_at = Column(DateTime(timezone=True), nullable=True)
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    response_team_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    incident = relationship("Incident", back_populates="eta_history")
