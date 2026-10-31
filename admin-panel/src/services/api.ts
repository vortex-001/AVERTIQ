import {
  Incident,
  Report,
  EvidenceItem,
  SilentZoneCell,
  ReviewAction,
  SourceStatus,
  DashboardSummary,
  User,
} from '../types';

const rawBase = (import.meta as any).env?.VITE_API_BASE_URL;
export const API_BASE = rawBase ? `${rawBase.replace(/\/+$/, '')}/api/v1` : '/api/v1';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('avertiq_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Dashboard & Metrics
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to load dashboard metrics');
    return res.json();
  },

  async getReviewHistory(): Promise<ReviewAction[]> {
    const res = await fetch(`${API_BASE}/dashboard/review-history`);
    if (!res.ok) throw new Error('Failed to load review history');
    return res.json();
  },

  async seedDemoData(): Promise<any> {
    const res = await fetch(`${API_BASE}/dashboard/seed-demo`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo data');
    return res.json();
  },

  async resetDemoData(): Promise<any> {
    const res = await fetch(`${API_BASE}/dashboard/reset-demo`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  },

  // Incidents
  async getIncidents(params?: {
    incident_type?: string;
    priority_level?: string;
    status?: string;
    verification_status?: string;
    lat?: number;
    lon?: number;
    radius_km?: number;
    skip?: number;
    limit?: number;
  }): Promise<Incident[]> {
    const q = new URLSearchParams();
    if (params?.incident_type) q.append('incident_type', params.incident_type);
    if (params?.priority_level) q.append('priority_level', params.priority_level);
    if (params?.status) q.append('status', params.status);
    if (params?.verification_status) q.append('verification_status', params.verification_status);
    if (params?.lat !== undefined) q.append('lat', params.lat.toString());
    if (params?.lon !== undefined) q.append('lon', params.lon.toString());
    if (params?.radius_km !== undefined) q.append('radius_km', params.radius_km.toString());
    if (params?.skip !== undefined) q.append('skip', params.skip.toString());
    if (params?.limit !== undefined) q.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/incidents?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to load incidents');
    return res.json();
  },

  async getIncidentDetail(id: string): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${id}`);
    if (!res.ok) throw new Error(`Failed to load incident ${id}`);
    return res.json();
  },

  async reviewIncident(id: string, payload: {
    action: string;
    verification_status?: string;
    status?: string;
    note?: string;
    new_latitude?: number;
    new_longitude?: number;
    new_location_name?: string;
  }): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/${id}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit incident review');
    return res.json();
  },

  async mergeIncidents(payload: {
    target_incident_id: string;
    source_incident_ids: string[];
    reason?: string;
  }): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to merge incidents');
    return res.json();
  },

  async unmergeReport(payload: { report_id: string; reason?: string }): Promise<Incident> {
    const res = await fetch(`${API_BASE}/incidents/unmerge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to unmerge report');
    return res.json();
  },

  // Reports
  async submitReport(payload: {
    original_text: string;
    source_channel?: string;
    latitude?: number;
    longitude?: number;
    location_description?: string;
    affected_people_count?: number;
    vulnerable_groups?: string;
    resource_requests?: string;
    image_url?: string;
  }): Promise<Report> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit report');
    return res.json();
  },

  async getReports(params?: {
    incident_id?: string;
    language?: string;
    source_channel?: string;
    unlocated_only?: boolean;
  }): Promise<Report[]> {
    const q = new URLSearchParams();
    if (params?.incident_id) q.append('incident_id', params.incident_id);
    if (params?.language) q.append('language', params.language);
    if (params?.source_channel) q.append('source_channel', params.source_channel);
    if (params?.unlocated_only) q.append('unlocated_only', 'true');

    const res = await fetch(`${API_BASE}/reports?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to load reports');
    return res.json();
  },

  // Silent Zones
  async getSilentZones(): Promise<SilentZoneCell[]> {
    const res = await fetch(`${API_BASE}/zones/silent-risk`);
    if (!res.ok) throw new Error('Failed to load silent zone telemetry');
    return res.json();
  },

  async reviewSilentZone(payload: { cell_id: string; action: string; note?: string }): Promise<SilentZoneCell> {
    const res = await fetch(`${API_BASE}/zones/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit silent-zone review');
    return res.json();
  },

  // Evidence & Sources
  async getEvidence(incident_id?: string): Promise<EvidenceItem[]> {
    const q = incident_id ? `?incident_id=${incident_id}` : '';
    const res = await fetch(`${API_BASE}/evidence${q}`);
    if (!res.ok) throw new Error('Failed to load evidence items');
    return res.json();
  },

  async getSourceStatuses(): Promise<SourceStatus[]> {
    const res = await fetch(`${API_BASE}/sources/status`);
    if (!res.ok) throw new Error('Failed to load external source statuses');
    return res.json();
  },

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; role: string; user_id: string; full_name: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    localStorage.setItem('avertiq_token', data.access_token);
    localStorage.setItem('avertiq_user', JSON.stringify(data));
    return data;
  },

  logout() {
    localStorage.removeItem('avertiq_token');
    localStorage.removeItem('avertiq_user');
  },
};
