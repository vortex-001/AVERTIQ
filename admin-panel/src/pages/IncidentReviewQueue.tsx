import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { PriorityBadge } from '../components/PriorityBadge';
import { Incident } from '../types';
import {
  ClipboardCheck,
  Search,
  MapPin,
  Split,
} from 'lucide-react';

export const IncidentReviewQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editLat, setEditLat] = useState('');
  const [editLon, setEditLon] = useState('');
  const [editLocName, setEditLocName] = useState('');

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidentQueue', statusFilter, priorityFilter],
    queryFn: () =>
      api.getIncidents({
        status: statusFilter || undefined,
        priority_level: priorityFilter || undefined,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.reviewIncident(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentQueue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setEditingIncident(null);
    },
  });

  const handleApprove = (inc: Incident) => {
    reviewMutation.mutate({
      id: inc.id,
      payload: { action: 'approve', note: 'Approved by authorized coordinator.' },
    });
  };

  const handleReject = (inc: Incident) => {
    if (window.confirm('Reject this incident as invalid/unverifiable?')) {
      reviewMutation.mutate({
        id: inc.id,
        payload: { action: 'reject', note: 'Marked as rejected/closed by coordinator.' },
      });
    }
  };

  const handleSaveLocation = () => {
    if (!editingIncident) return;
    reviewMutation.mutate({
      id: editingIncident.id,
      payload: {
        action: 'edit_location',
        new_latitude: editLat ? parseFloat(editLat) : undefined,
        new_longitude: editLon ? parseFloat(editLon) : undefined,
        new_location_name: editLocName || undefined,
        note: `Coordinator adjusted coordinates: ${editLat}, ${editLon} (${editLocName})`,
      },
    });
  };

  const filteredIncidents = incidents.filter(
    (inc) =>
      inc.canonical_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.description && inc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inc.location_name && inc.location_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'var(--color-text-muted)' }}>
        Loading incidents...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <ClipboardCheck className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            <span>Incident Review Queue</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Coordinator triage desk for incident assessments, location confirmation, and evidence verification
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search reports or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)',
              }}
              className="border text-xs rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by workflow status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)',
            }}
            className="border text-xs rounded-lg px-2.5 py-2 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="triaged">Triaged (Pending Review)</option>
            <option value="under_review">Under Active Review</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed / Rejected</option>
          </select>

          <select
            aria-label="Filter by priority level"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)',
            }}
            className="border text-xs rounded-lg px-2.5 py-2 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
            <option value="unconfirmed">Unconfirmed</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div
        className="glass-panel rounded-xl overflow-hidden shadow-xl"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className="uppercase tracking-wider text-[10px]"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-muted)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <tr>
                <th className="py-3.5 px-4 font-semibold">Incident / Location</th>
                <th className="py-3.5 px-4 font-semibold">Type</th>
                <th className="py-3.5 px-4 font-semibold">Urgency &amp; Factors</th>
                <th className="py-3.5 px-4 font-semibold">Reports</th>
                <th className="py-3.5 px-4 font-semibold">Verification State</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No incidents match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    {/* Title & Location */}
                    <td className="py-3.5 px-4">
                      <div
                        className="font-semibold hover:underline"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <Link to={`/incidents/${inc.id}`}>{inc.canonical_title}</Link>
                      </div>
                      <div
                        className="flex items-center space-x-1.5 text-[11px] mt-0.5"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        <MapPin className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
                        <span>
                          {inc.location_name ||
                            (inc.latitude
                              ? `${inc.latitude.toFixed(4)}, ${inc.longitude?.toFixed(4)}`
                              : 'Location unconfirmed')}
                        </span>
                        {inc.is_location_confirmed && (
                          <span className="text-[10px] text-emerald-500 font-mono">(Confirmed)</span>
                        )}
                      </div>
                    </td>

                    {/* Hazard Type */}
                    <td className="py-3.5 px-4">
                      <span
                        className="capitalize font-mono px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {inc.incident_type}
                      </span>
                    </td>

                    {/* Priority & Factors */}
                    <td className="py-3.5 px-4">
                      <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
                    </td>

                    {/* Report count */}
                    <td className="py-3.5 px-4 font-mono" style={{ color: 'var(--color-text)' }}>
                      <span
                        className="px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {inc.report_count} msg(s)
                      </span>
                    </td>

                    {/* Verification Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase font-mono ${
                          inc.verification_status === 'human_verified'
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : inc.verification_status === 'conflicting_evidence'
                            ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                            : inc.verification_status === 'partially_corroborated'
                            ? 'bg-cyan-500/15 text-cyan-700 border border-cyan-500/30'
                            : ''
                        }`}
                        style={
                          !['human_verified', 'conflicting_evidence', 'partially_corroborated'].includes(
                            inc.verification_status
                          )
                            ? {
                                background: 'var(--color-surface)',
                                color: 'var(--color-text-muted)',
                                border: '1px solid var(--color-border)',
                              }
                            : {}
                        }
                      >
                        {inc.verification_status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleApprove(inc)}
                          title="Approve assessment as verified"
                          className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-600 border border-emerald-500/30 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setEditingIncident(inc);
                            setEditLat(inc.latitude?.toString() || '');
                            setEditLon(inc.longitude?.toString() || '');
                            setEditLocName(inc.location_name || '');
                          }}
                          title="Edit Location Coordinates"
                          className="px-2.5 py-1 rounded transition-all"
                          style={{
                            background: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          Edit Geo
                        </button>
                        <button
                          onClick={() => handleReject(inc)}
                          title="Reject / Close"
                          className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-600 border border-rose-500/30 transition-all"
                        >
                          Reject
                        </button>
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="px-2.5 py-1 rounded font-semibold transition-all inline-block text-white text-xs"
                          style={{ background: 'var(--color-primary)' }}
                        >
                          Inspect
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Coordinates Modal */}
      {editingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="glass-panel p-6 rounded-xl max-w-md w-full space-y-4 shadow-2xl"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              Edit Incident Location &amp; Coordinates
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Manually set or correct physical coordinates for #{editingIncident.id.slice(0, 8)}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label
                  className="block font-medium mb-1"
                  style={{ color: 'var(--color-text)' }}
                >
                  Location Landmark / Area
                </label>
                <input
                  type="text"
                  value={editLocName}
                  onChange={(e) => setEditLocName(e.target.value)}
                  placeholder="e.g. Sutlej River Bridge, Ludhiana"
                  style={{
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)',
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block font-medium mb-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    placeholder="30.9580"
                    style={{
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)',
                    }}
                    className="w-full border rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label
                    className="block font-medium mb-1"
                    style={{ color: 'var(--color-text)' }}
                  >
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editLon}
                    onChange={(e) => setEditLon(e.target.value)}
                    placeholder="75.8320"
                    style={{
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)',
                    }}
                    className="w-full border rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div
              className="flex items-center justify-end space-x-3 pt-3"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setEditingIncident(null)}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={reviewMutation.isPending}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {reviewMutation.isPending ? 'Saving...' : 'Save Coordinates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
