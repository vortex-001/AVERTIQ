from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# ==================== User & Auth Schemas ====================
class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== Report Schemas ====================
class ReportCreate(BaseModel):
    original_text: str = Field(..., min_length=2, description="The emergency message text")
    source_channel: str = Field("web", description="'web' or 'telegram'")
    language: Optional[str] = "en"
    location_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_people_count: Optional[int] = None
    vulnerable_groups: Optional[str] = None
    resource_requests: Optional[str] = None
    image_url: Optional[str] = None

class ReportResponse(BaseModel):
    id: str
    incident_id: Optional[str] = None
    original_text: str
    source_channel: str
    language: Optional[str] = None
    language_mixture: Optional[str] = None
    location_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_source: str
    location_confidence: float
    affected_people_count: Optional[int] = None
    vulnerable_groups: Optional[str] = None
    resource_requests: Optional[str] = None
    image_url: Optional[str] = None
    telegram_user_id: Optional[str] = None
    telegram_message_id: Optional[str] = None
    ai_extraction: Dict[str, Any] = {}
    is_demo: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== Evidence Schemas ====================
class EvidenceItemResponse(BaseModel):
    id: str
    incident_id: Optional[str] = None
    source: str
    source_event_id: Optional[str] = None
    observation_time: Optional[datetime] = None
    retrieval_time: datetime
    evidence_type: str
    measurement_value: Optional[str] = None
    unit: Optional[str] = None
    relationship_to_incident: str
    confidence_score: float
    limitations_note: Optional[str] = None
    is_stale: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== Incident Schemas ====================
class IncidentResponse(BaseModel):
    id: str
    canonical_title: str
    incident_type: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    location_accuracy_radius_m: float
    is_location_confirmed: bool
    priority_score: float
    priority_level: str
    priority_explanation: Optional[str] = None
    priority_factors: Dict[str, Any] = {}
    status: str
    verification_status: str
    report_count: int
    estimated_response_minutes: Optional[int] = None
    expected_arrival_at: Optional[datetime] = None
    assigned_coordinator_id: Optional[str] = None
    response_team_name: Optional[str] = None
    response_notes: Optional[str] = None
    response_status: Optional[str] = "received"
    is_demo: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class IncidentDetailResponse(IncidentResponse):
    reports: List[ReportResponse] = []
    evidence_items: List[EvidenceItemResponse] = []

class IncidentUpdateRequest(BaseModel):
    canonical_title: Optional[str] = None
    incident_type: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    is_location_confirmed: Optional[bool] = None
    priority_level: Optional[str] = None
    status: Optional[str] = None
    verification_status: Optional[str] = None

class IncidentReviewRequest(BaseModel):
    action: str = Field(..., description="approve, reject, edit, change_status, verify_evidence")
    verification_status: Optional[str] = None
    status: Optional[str] = None
    note: Optional[str] = None
    new_latitude: Optional[float] = None
    new_longitude: Optional[float] = None
    new_location_name: Optional[str] = None

class IncidentMergeRequest(BaseModel):
    target_incident_id: str
    source_incident_ids: List[str]
    reason: Optional[str] = None

class IncidentUnmergeRequest(BaseModel):
    report_id: str
    reason: Optional[str] = None

# ==================== Rescue Time & ETA Schemas ====================
class IncidentEtaAssignRequest(BaseModel):
    estimated_response_minutes: int = Field(..., ge=1, le=1440, description="Estimated rescue response time in minutes (1 - 1440)")
    response_team_name: Optional[str] = Field(None, max_length=255, description="Name of dispatched or assigned rescue team")
    assigned_coordinator_id: Optional[str] = Field(None, max_length=100)
    response_notes: Optional[str] = Field(None, description="Operational notes or instructions for the rescue team/citizen")
    update_lifecycle_status: Optional[str] = Field("response_assigned", description="Lifecycle stage: response_assigned, team_dispatched, team_en_route, rescue_in_progress, resolved")

class IncidentResponseStatusUpdateRequest(BaseModel):
    response_status: str = Field(..., description="received, under_review, verified, response_assigned, team_dispatched, team_en_route, rescue_in_progress, resolved, closed, rejected")
    response_team_name: Optional[str] = None
    response_notes: Optional[str] = None

class IncidentEtaHistoryItem(BaseModel):
    id: str
    incident_id: str
    changed_by: str
    old_eta_minutes: Optional[int] = None
    new_eta_minutes: Optional[int] = None
    expected_arrival_at: Optional[datetime] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    response_team_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CitizenRescueTrackingResponse(BaseModel):
    report_id: str
    incident_id: Optional[str] = None
    canonical_title: Optional[str] = None
    incident_type: Optional[str] = None
    location_name: Optional[str] = None
    priority_level: Optional[str] = None
    response_status: str = "received"
    timeline_stage: int = 1  # 1 to 7
    estimated_response_minutes: Optional[int] = None
    expected_arrival_at: Optional[datetime] = None
    response_team_name: Optional[str] = None
    response_notes: Optional[str] = None
    history: List[IncidentEtaHistoryItem] = []

# ==================== Silent-Zone Schemas ====================
class SilentZoneCellResponse(BaseModel):
    id: str
    cell_code: str
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float
    center_lat: float
    center_lon: float
    hazard_score: float
    report_count: int
    reporting_density: float
    reporting_deficit: float
    vulnerability_score: float
    data_coverage_score: float
    silent_zone_risk: float
    risk_category: str
    hazard_summary: Optional[str] = None
    explanation: Optional[str] = None
    recommended_action: str
    uncertainty_score: float
    review_status: str
    last_evaluated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SilentZoneReviewRequest(BaseModel):
    cell_id: str
    action: str = Field(..., description="needs_verification, verification_in_progress, reviewed, false_alert, confirmed_concern")
    note: Optional[str] = None

# ==================== Audit & Dashboard Schemas ====================
class ReviewActionResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    reviewer_name: str
    action_type: str
    note: Optional[str] = None
    changes_json: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SourceStatusResponse(BaseModel):
    id: str
    source_name: str
    is_healthy: bool
    last_ping_at: datetime
    last_success_at: datetime
    status_message: str
    latency_ms: float

    model_config = ConfigDict(from_attributes=True)

class DashboardSummaryResponse(BaseModel):
    total_reports: int
    mobile_reports: int = 0
    telegram_reports: int = 0
    unique_incidents: int
    high_priority_incidents: int
    reports_awaiting_review: int
    potential_silent_zones: int
    duplicate_groups: int
    unverified_incidents: int
    external_sources: List[SourceStatusResponse]
    incidents_by_type: Dict[str, int]
    incidents_by_priority: Dict[str, int]
