export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'coordinator' | 'viewer';
  is_active: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  incident_id?: string;
  original_text: string;
  source_channel: 'telegram' | 'web' | 'mobile';
  language?: string;
  language_mixture?: string;
  location_description?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_source: string;
  location_confidence: number;
  affected_people_count?: number | null;
  vulnerable_groups?: string;
  resource_requests?: string;
  image_url?: string;
  telegram_user_id?: string;
  telegram_message_id?: string;
  ai_extraction?: Record<string, any>;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  incident_id?: string;
  source: string;
  source_event_id?: string;
  observation_time?: string;
  retrieval_time: string;
  evidence_type: string;
  measurement_value?: string;
  unit?: string;
  relationship_to_incident: 'corroborating' | 'conflicting' | 'contextual';
  confidence_score: number;
  limitations_note?: string;
  is_stale: boolean;
  created_at: string;
}

export interface Incident {
  id: string;
  canonical_title: string;
  incident_type: 'flood' | 'fire' | 'earthquake' | 'cyclone' | 'landslide' | 'other' | string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_name?: string;
  location_accuracy_radius_m: number;
  is_location_confirmed: boolean;
  priority_score: number;
  priority_level: 'critical' | 'high' | 'medium' | 'low' | 'unconfirmed' | string;
  priority_explanation?: string;
  priority_factors?: Record<string, any>;
  status: 'open' | 'triaged' | 'under_review' | 'resolved' | 'closed' | string;
  verification_status: 'unchecked' | 'partially_corroborated' | 'conflicting_evidence' | 'human_verified' | 'unable_to_verify' | string;
  report_count: number;
  // Rescue & response fields
  estimated_response_minutes?: number | null;
  expected_arrival_at?: string | null;
  response_team_name?: string | null;
  response_notes?: string | null;
  response_status?: string;
  assigned_coordinator_id?: string | null;
  is_demo?: boolean;
  reports?: Report[];
  evidence_items?: EvidenceItem[];
  created_at: string;
  updated_at: string;
}

export interface SilentZoneCell {
  id: string;
  cell_code: string;
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
  center_lat: number;
  center_lon: number;
  hazard_score: number;
  report_count: number;
  reporting_density: number;
  reporting_deficit: number;
  vulnerability_score: number;
  data_coverage_score: number;
  silent_zone_risk: number;
  risk_category: 'critical' | 'high' | 'moderate' | 'low' | 'insufficient_evidence';
  hazard_summary?: string;
  explanation?: string;
  recommended_action: string;
  uncertainty_score: number;
  review_status: 'needs_verification' | 'verification_in_progress' | 'reviewed' | 'false_alert' | 'confirmed_concern';
  last_evaluated_at: string;
}

export interface ReviewAction {
  id: string;
  entity_type: string;
  entity_id: string;
  reviewer_name: string;
  action_type: string;
  note?: string;
  changes_json?: Record<string, any>;
  created_at: string;
}

export interface SourceStatus {
  id: string;
  source_name: string;
  is_healthy: boolean;
  last_ping_at: string;
  last_success_at: string;
  status_message: string;
  latency_ms: number;
}

export interface DashboardSummary {
  total_reports: number;
  mobile_reports: number;
  telegram_reports: number;
  unique_incidents: number;
  high_priority_incidents: number;
  reports_awaiting_review: number;
  potential_silent_zones: number;
  duplicate_groups: number;
  unverified_incidents: number;
  external_sources: SourceStatus[];
  incidents_by_type: Record<string, number>;
  incidents_by_priority: Record<string, number>;
}
