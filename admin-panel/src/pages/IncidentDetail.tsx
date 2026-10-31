import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { PriorityBadge } from '../components/PriorityBadge';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { IncidentMap } from '../components/IncidentMap';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  FileText,
  Split,
  Info,
} from 'lucide-react';

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reviewNote, setReviewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newVerification, setNewVerification] = useState('');

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incidentDetail', id],
    queryFn: () => api.getIncidentDetail(id!),
    enabled: !!id,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: any) => api.reviewIncident(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['incidentQueue'] });
      setReviewNote('');
    },
  });

  const unmergeMutation = useMutation({
    mutationFn: (reportId: string) =>
      api.unmergeReport({ report_id: reportId, reason: 'Unmerged by coordinator from incident detail' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['incidentQueue'] });
    },
  });

  if (isLoading || !incident) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ color: 'var(--color-text-muted)' }}>
        Loading incident details...
      </div>
    );
  }

  const handleReviewSubmit = (action: string) => {
    reviewMutation.mutate({
      action,
      status: newStatus || undefined,
      verification_status: newVerification || undefined,
      note: reviewNote || `Coordinator executed ${action}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/queue"
          className="flex items-center space-x-1.5 text-xs transition-all"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Review Queue</span>
        </Link>
        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
          ID: {incident.id}
        </span>
      </div>

      {/* Main Incident Overview Banner */}
      <div className="glass-panel p-6 rounded-xl space-y-4 shadow-xl" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className="px-2.5 py-0.5 rounded text-xs font-mono uppercase"
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                }}
              >
                {incident.incident_type}
              </span>
              <PriorityBadge level={incident.priority_level} score={incident.priority_score} />
              <span
                className="px-2 py-0.5 rounded text-xs font-mono uppercase"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {incident.verification_status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight mt-2" style={{ color: 'var(--color-text)' }}>
              {incident.canonical_title}
            </h1>
            <div className="flex items-center space-x-4 text-xs pt-1" style={{ color: 'var(--color-text-muted)' }}>
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                <span>
                  {incident.location_name ||
                    (incident.latitude
                      ? `${incident.latitude.toFixed(4)}, ${incident.longitude?.toFixed(4)}`
                      : 'Physical location unconfirmed')}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>First reported {new Date(incident.created_at).toLocaleString()}</span>
              </span>
            </div>
          </div>

          {/* Quick Approval / Rejection Box */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleReviewSubmit('approve')}
              disabled={reviewMutation.isPending}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all"
            >
              Verify Assessment
            </button>
            <button
              onClick={() => handleReviewSubmit('reject')}
              disabled={reviewMutation.isPending}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-600/20 hover:bg-rose-600/40 text-rose-500 border border-rose-500/40 transition-all"
            >
              Reject / Close
            </button>
          </div>
        </div>

        {/* Priority Intelligence Explanation */}
        {incident.priority_explanation && (
          <div
            className="p-4 rounded-lg text-xs space-y-1.5"
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
              border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
            }}
          >
            <div className="flex items-center space-x-1.5 font-bold" style={{ color: 'var(--color-primary)' }}>
              <Info className="w-4 h-4" />
              <span>Priority Intelligence Reasoning (Advisory)</span>
            </div>
            <p className="leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {incident.priority_explanation}
            </p>
          </div>
        )}
      </div>

      {/* Grid: Linked Citizen Reports vs External Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Linked Citizen Reports */}
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
            <div
              className="flex items-center justify-between mb-3 pb-2"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2
                className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                <FileText className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span>Linked Citizen Emergency Reports ({incident.reports?.length ?? 0})</span>
              </h2>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Multilingual Clustered
              </span>
            </div>

            <div className="space-y-3">
              {(incident.reports || []).map((rep) => (
                <div
                  key={rep.id}
                  className="p-3.5 rounded-lg space-y-2 text-xs"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono uppercase"
                        style={{
                          background: 'var(--color-bg)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {rep.source_channel}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        Language: {rep.language_mixture || rep.language}
                      </span>
                    </div>
                    {incident.report_count > 1 && (
                      <button
                        onClick={() => unmergeMutation.mutate(rep.id)}
                        disabled={unmergeMutation.isPending}
                        className="flex items-center space-x-1 text-[11px] text-amber-500 hover:text-amber-400 font-medium"
                      >
                        <Split className="w-3 h-3" />
                        <span>Unmerge</span>
                      </button>
                    )}
                  </div>

                  {/* Original text block */}
                  <div
                    className="p-2.5 rounded font-mono text-[11px]"
                    style={{
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    "{rep.original_text}"
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1" style={{ color: 'var(--color-text-muted)' }}>
                    <div>
                      <span className="block" style={{ color: 'var(--color-text-muted)' }}>Reported Location:</span>
                      <span style={{ color: 'var(--color-text)' }}>
                        {rep.location_description || 'None provided'}
                      </span>
                    </div>
                    <div>
                      <span className="block" style={{ color: 'var(--color-text-muted)' }}>Affected Headcount:</span>
                      <span style={{ color: 'var(--color-text)' }}>
                        {rep.affected_people_count ?? 'Unspecified'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: External Telemetry & Verification Evidence */}
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-xl" style={{ border: '1px solid var(--color-border)' }}>
            <div
              className="flex items-center justify-between mb-3 pb-2"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2
                className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>External Hazard Evidence Items ({incident.evidence_items?.length ?? 0})</span>
              </h2>
              <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Independent Feeds
              </span>
            </div>

            <div className="space-y-3">
              {(incident.evidence_items || []).length === 0 ? (
                <div
                  className="p-6 text-center text-xs rounded-lg border border-dashed"
                  style={{
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-muted)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  No external hazard observations attached to this incident yet.
                </div>
              ) : (
                incident.evidence_items!.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-lg space-y-2 text-xs"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <EvidenceBadge
                        relationship={ev.relationship_to_incident}
                        source={ev.source}
                        isStale={ev.is_stale}
                      />
                      <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                        Observed:{' '}
                        {ev.observation_time
                          ? new Date(ev.observation_time).toLocaleTimeString()
                          : 'Recent'}
                      </span>
                    </div>

                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {ev.measurement_value}
                    </div>

                    {ev.limitations_note && (
                      <p className="text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>
                        Note: {ev.limitations_note}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coordinator Action Log Input */}
          <div
            className="glass-panel p-4 rounded-xl space-y-3 text-xs"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3
              className="font-bold uppercase tracking-wider text-[11px]"
              style={{ color: 'var(--color-text)' }}
            >
              Coordinator Review Note &amp; Status Transition
            </h3>
            <textarea
              rows={2}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Record operational rationale, dispatch instructions, or verification notes..."
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)',
              }}
              className="w-full border rounded-lg p-2.5 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Action will be saved to immutable audit log
              </span>
              <button
                onClick={() => handleReviewSubmit('update_review')}
                disabled={reviewMutation.isPending || !reviewNote}
                className="px-3.5 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'var(--color-primary)' }}
              >
                Save Review Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
