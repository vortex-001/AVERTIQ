import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../services/api';
import {
  Clock,
  Send,
  AlertTriangle,
  CheckCircle,
  Truck,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  Info,
  Map as MapIcon
} from 'lucide-react';

interface Incident {
  id: string;
  canonical_title: string;
  incident_type: string;
  description?: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  priority_level: string;
  priority_score: number;
  status: string;
  verification_status: string;
  estimated_response_minutes?: number;
  expected_arrival_at?: string;
  response_team_name?: string;
  response_status?: string;
  response_notes?: string;
  is_demo: boolean;
  created_at: string;
}

interface EtaHistoryItem {
  id: string;
  changed_by: string;
  old_eta_minutes?: number;
  new_eta_minutes?: number;
  expected_arrival_at?: string;
  old_status?: string;
  new_status?: string;
  response_team_name?: string;
  notes?: string;
  created_at: string;
}

const PRESET_TEAMS = [
  'Punjab NDRF 7th Battalion Unit A',
  'State Disaster Response Force (SDRF) Team 1',
  'Emergency Medical & Trauma Ambulance 108',
  'Punjab Fire Services Quick Tender',
  'Civil Defence Search & Rescue Taskforce',
  'Flood Evacuation & Inflatable Boat Unit',
  'District Rapid Response Team (RRT)'
];

export const RescueAssignmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterDemo, setFilterDemo] = useState<'all' | 'demo' | 'live'>('all');

  // Selected incident for ETA modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [teamName, setTeamName] = useState<string>('');
  const [responseNotes, setResponseNotes] = useState<string>('');
  const [nextStage, setNextStage] = useState<string>('response_assigned');
  const [history, setHistory] = useState<EtaHistoryItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/incidents?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error('Failed to load incidents for rescue assignment', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const openAssignModal = async (inc: Incident) => {
    setSelectedIncident(inc);
    setEtaMinutes(inc.estimated_response_minutes || 25);
    setTeamName(inc.response_team_name || PRESET_TEAMS[0]);
    setResponseNotes(inc.response_notes || '');
    setNextStage(inc.response_status === 'received' ? 'response_assigned' : inc.response_status || 'response_assigned');

    try {
      const res = await fetch(`${API_BASE}/incidents/${inc.id}/eta-history`);
      if (res.ok) {
        const histData = await res.json();
        setHistory(histData);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.warn('Could not fetch ETA history', err);
      setHistory([]);
    }
  };

  const handleSaveEta = async () => {
    if (!selectedIncident) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('avertiq_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/incidents/${selectedIncident.id}/assign-eta`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          estimated_response_minutes: etaMinutes,
          response_team_name: teamName || 'Emergency Response Unit',
          update_lifecycle_status: nextStage,
          response_notes: responseNotes || undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        showToast(`Rescue Team & ETA successfully assigned (${etaMinutes}m)`);
        setSelectedIncident(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.detail || 'Failed to update rescue assignment');
      }
    } catch (err) {
      console.error('Error assigning ETA', err);
      showToast('Network error while assigning ETA');
    } finally {
      setSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Filter logic
  const filtered = incidents.filter((inc) => {
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = inc.canonical_title?.toLowerCase().includes(q);
      const matchLoc = inc.location_name?.toLowerCase().includes(q);
      const matchTeam = inc.response_team_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchTeam) return false;
    }
    if (filterSeverity !== 'all' && inc.priority_level !== filterSeverity) return false;
    if (filterStage !== 'all' && inc.response_status !== filterStage) return false;
    if (filterDemo === 'demo' && !inc.is_demo) return false;
    if (filterDemo === 'live' && inc.is_demo) return false;
    return true;
  });

  // Metrics
  const totalCount = incidents.length;
  const pendingEta = incidents.filter((i) => !i.estimated_response_minutes).length;
  const assignedEta = incidents.filter((i) => i.estimated_response_minutes && i.response_status !== 'resolved').length;
  const dispatched = incidents.filter((i) => i.response_status === 'team_dispatched' || i.response_status === 'team_en_route').length;
  const inProgress = incidents.filter((i) => i.response_status === 'rescue_in_progress').length;
  const resolved = incidents.filter((i) => i.response_status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-[#2B6777] text-white px-4 py-3 rounded-xl shadow-2xl border border-[#C8D8E4] animate-bounce">
          <CheckCircle className="w-5 h-5 text-[#52AB98]" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black tracking-tight text-[#19242E]">
              Rescue Team Management
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[#52AB98]/20 text-[#2B6777] border border-[#52AB98]/40">
              Live Operations
            </span>
          </div>
          <p className="text-sm text-[#4A5568] mt-1 font-medium">
            Dispatch triage coordinators assign response units, set verified ETA clocks, update rescue lifecycle milestones, and push instant real-time synchronization to the Citizen Mobile App.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/map')}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#2B6777] border border-[#C8D8E4] shadow-sm transition-all text-xs font-bold"
          >
            <MapIcon className="w-4 h-4 text-[#2B6777]" />
            <span>Open Tactical Map</span>
          </button>

          <button
            onClick={fetchIncidents}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#2B6777] hover:bg-[#204e5a] text-white shadow-md transition-all text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Incidents</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#C8D8E4] shadow-sm">
          <span className="text-xs font-bold text-[#4A5568] uppercase tracking-wider">Total Active</span>
          <p className="text-2xl font-black text-[#19242E] mt-1">{totalCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-amber-300 shadow-sm">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending ETA</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{pendingEta}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-sky-300 shadow-sm">
          <span className="text-xs font-bold text-[#2B6777] uppercase tracking-wider">ETA Assigned</span>
          <p className="text-2xl font-black text-[#2B6777] mt-1">{assignedEta}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-indigo-300 shadow-sm">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Dispatched / En Route</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{dispatched}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-orange-300 shadow-sm">
          <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Rescue In Progress</span>
          <p className="text-2xl font-black text-orange-600 mt-1">{inProgress}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#52AB98] shadow-sm">
          <span className="text-xs font-bold text-[#52AB98] uppercase tracking-wider">Resolved</span>
          <p className="text-2xl font-black text-[#52AB98] mt-1">{resolved}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white border border-[#C8D8E4] shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#718096]" />
          <input
            type="text"
            placeholder="Search by title, location, team..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[#F2F2F2] text-[#19242E] placeholder-[#718096] border border-[#C8D8E4] focus:outline-none focus:border-[#2B6777]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Severity */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white text-[#19242E] border border-[#C8D8E4] font-medium focus:outline-none focus:border-[#2B6777]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Lifecycle Stage */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-white text-[#19242E] border border-[#C8D8E4] font-medium focus:outline-none focus:border-[#2B6777]"
          >
            <option value="all">All Response Stages</option>
            <option value="received">1. Received</option>
            <option value="under_review">2. Under Review</option>
            <option value="response_assigned">3. Response Assigned</option>
            <option value="team_dispatched">4. Team Dispatched</option>
            <option value="team_en_route">5. Team En Route</option>
            <option value="rescue_in_progress">6. Rescue In Progress</option>
            <option value="resolved">7. Resolved</option>
          </select>

          {/* Demo Filter */}
          <div className="flex items-center rounded-xl bg-[#F2F2F2] border border-[#C8D8E4] p-1 text-xs">
            <button
              onClick={() => setFilterDemo('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterDemo === 'all' ? 'bg-[#2B6777] text-white shadow-sm' : 'text-[#4A5568] hover:text-[#19242E]'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterDemo('demo')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterDemo === 'demo' ? 'bg-[#2B6777] text-white shadow-sm' : 'text-[#4A5568] hover:text-[#19242E]'}`}
            >
              Demo Data
            </button>
            <button
              onClick={() => setFilterDemo('live')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${filterDemo === 'live' ? 'bg-[#2B6777] text-white shadow-sm' : 'text-[#4A5568] hover:text-[#19242E]'}`}
            >
              Live Only
            </button>
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="bg-white rounded-xl border border-[#C8D8E4] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#718096]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#2B6777]" />
            <p className="text-sm font-semibold">Loading rescue operations queue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#718096]">
            <Info className="w-8 h-8 mx-auto mb-2 text-[#4A5568]" />
            <p className="text-sm font-semibold">No incidents match the active filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#19242E]">
              <thead className="bg-[#F2F2F2] text-[#4A5568] uppercase text-[11px] font-bold border-b border-[#C8D8E4]">
                <tr>
                  <th className="py-3 px-4">Emergency Incident</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Response Status</th>
                  <th className="py-3 px-3">Assigned ETA</th>
                  <th className="py-3 px-3">Rescue Team</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8D8E4]">
                {filtered.map((inc) => {
                  const severityBadge =
                    inc.priority_level === 'critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : inc.priority_level === 'high'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : inc.priority_level === 'medium'
                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300';

                  const statusDisplay = (inc.response_status || 'received').replace('_', ' ').toUpperCase();

                  return (
                    <tr key={inc.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#19242E] truncate">{inc.canonical_title}</span>
                          {inc.is_demo && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#718096] truncate mt-0.5">{inc.description || 'No description provided'}</p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1 text-[#4A5568]">
                          <MapPin className="w-3.5 h-3.5 text-[#2B6777] shrink-0" />
                          <span className="truncate max-w-[140px] font-medium">{inc.location_name || 'Coordinates recorded'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${severityBadge}`}>
                          {inc.priority_level}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E2E8F0] text-[#19242E] border border-[#CBD5E1]">
                          {statusDisplay}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {inc.estimated_response_minutes ? (
                          <div className="flex items-center space-x-1.5 text-[#52AB98] font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{inc.estimated_response_minutes} mins</span>
                          </div>
                        ) : (
                          <span className="text-[#718096] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[#19242E] font-medium truncate max-w-[130px] block">
                          {inc.response_team_name || 'Pending assignment'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/map?incidentId=${inc.id}`)}
                            title="View on Map"
                            className="p-1.5 rounded-lg bg-[#F2F2F2] hover:bg-[#E2E8F0] text-[#2B6777] border border-[#C8D8E4] transition-all"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openAssignModal(inc)}
                            className="px-3 py-1.5 text-xs rounded-lg bg-[#2B6777] hover:bg-[#204e5a] text-white font-bold transition-all shadow-sm flex items-center space-x-1"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Assign Team / ETA</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ETA Assignment & Response Stage Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-[#C8D8E4] shadow-2xl p-6 text-[#19242E] space-y-5 animate-in fade-in duration-200">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-[#C8D8E4] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#19242E] flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-[#2B6777]" />
                  <span>Assign Response Team & ETA</span>
                </h3>
                <p className="text-xs text-[#718096] mt-0.5 truncate max-w-md font-medium">
                  {selectedIncident.canonical_title}
                </p>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-[#718096] hover:text-[#19242E] p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4 text-xs">
              {/* ETA Minutes Slider & Input */}
              <div className="p-3.5 rounded-xl bg-[#F2F2F2] border border-[#C8D8E4]">
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-[#19242E]">
                    Estimated Response / Arrival Time (Minutes)
                  </label>
                  <span className="font-black text-[#2B6777] text-sm">
                    {etaMinutes} minutes
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="5"
                    max="180"
                    step="5"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(Number(e.target.value))}
                    className="w-full h-2 bg-[#C8D8E4] rounded-lg appearance-none cursor-pointer accent-[#2B6777]"
                  />
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(Number(e.target.value))}
                    className="w-20 px-2 py-1 bg-white border border-[#C8D8E4] rounded-lg text-center font-bold text-[#19242E] focus:outline-none focus:border-[#2B6777]"
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#718096] mt-1 font-medium">
                  <span>Urgent (10-15m)</span>
                  <span>Standard (20-40m)</span>
                  <span>Extended / Rural (60m+)</span>
                </div>
              </div>

              {/* Milestone Lifecycle Stage */}
              <div>
                <label className="font-bold text-[#19242E] block mb-1.5">
                  Update Lifecycle Response Stage
                </label>
                <select
                  value={nextStage}
                  onChange={(e) => setNextStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-[#19242E] border border-[#C8D8E4] font-medium focus:outline-none focus:border-[#2B6777]"
                >
                  <option value="response_assigned">3. Response Assigned (ETA Allocated)</option>
                  <option value="team_dispatched">4. Team Dispatched (Left Depot / Base)</option>
                  <option value="team_en_route">5. Team En Route (Navigating to Scene)</option>
                  <option value="rescue_in_progress">6. Rescue In Progress (On-Site Operations)</option>
                  <option value="resolved">7. Rescue Completed / Resolved</option>
                </select>
              </div>

              {/* Response Team Selection */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-[#19242E]">
                    Assigned Rescue / Medical Response Unit
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) setTeamName(e.target.value);
                    }}
                    className="text-[11px] text-[#2B6777] font-bold bg-transparent border-0 cursor-pointer focus:outline-none"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose Preset Team...</option>
                    {PRESET_TEAMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Punjab NDRF 7th Battalion Unit A"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-[#19242E] border border-[#C8D8E4] font-medium focus:outline-none focus:border-[#2B6777]"
                />
              </div>

              {/* Public Instructions & Notes */}
              <div>
                <label className="font-bold text-[#19242E] block mb-1.5">
                  Response Instructions & Public Notes (Visible in Citizen App)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Stay at highest accessible floor. Life jackets and medical teams deployed from nearest district center."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-[#19242E] border border-[#C8D8E4] font-medium focus:outline-none focus:border-[#2B6777]"
                />
              </div>

              {/* Historical Changes log preview */}
              {history.length > 0 && (
                <div className="p-3 rounded-xl bg-[#F2F2F2] border border-[#C8D8E4] space-y-1.5 max-h-24 overflow-y-auto">
                  <span className="text-[10px] font-bold text-[#4A5568] uppercase tracking-wider block">
                    ETA Change Audit Trail
                  </span>
                  {history.map((h) => (
                    <div key={h.id} className="text-[11px] text-[#4A5568] flex items-center justify-between">
                      <span className="font-medium">{h.changed_by}: Assigned {h.new_eta_minutes}m ({h.new_status})</span>
                      <span className="text-[10px] text-[#718096]">
                        {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end items-center space-x-3 pt-3 border-t border-[#C8D8E4]">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#4A5568] hover:text-[#19242E] hover:bg-[#F2F2F2] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveEta}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2B6777] hover:bg-[#204e5a] text-white shadow-md transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Broadcasting...' : 'Save & Broadcast ETA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
