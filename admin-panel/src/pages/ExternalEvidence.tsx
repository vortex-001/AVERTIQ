import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { Server, RefreshCw, ShieldCheck } from 'lucide-react';

export const ExternalEvidence: React.FC = () => {
  const {
    data: sources = [],
    isLoading: sourcesLoading,
    refetch: refetchSources,
    isFetching,
  } = useQuery({
    queryKey: ['externalSourcesStatus'],
    queryFn: () => api.getSourceStatuses(),
    refetchInterval: 15000,
  });

  const { data: evidenceItems = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ['allEvidenceItems'],
    queryFn: () => api.getEvidence(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <Server className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
            <span>External Evidence &amp; Source Status</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Real-time telemetry feeds, API health monitoring, and sensor corroboration logs
          </p>
        </div>

        <button
          onClick={() => refetchSources()}
          disabled={isFetching}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>{isFetching ? 'Pinging...' : 'Ping Telemetry Sources'}</span>
        </button>
      </div>

      {/* Telemetry Sources Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((src) => (
          <div
            key={src.id}
            className="glass-panel p-4 rounded-xl space-y-3 shadow-lg"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    src.is_healthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <h3 className="text-sm font-bold leading-tight" style={{ color: 'var(--color-text)' }}>
                  {src.source_name}
                </h3>
              </div>
              <span
                className="font-mono text-xs px-2 py-0.5 rounded"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {src.latency_ms > 0 ? `${src.latency_ms} ms` : 'Active'}
              </span>
            </div>

            <p className="text-xs" style={{ color: 'var(--color-text)' }}>
              {src.status_message}
            </p>

            <div
              className="flex items-center justify-between pt-2 text-[10px] font-mono"
              style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              <span>Pinged: {new Date(src.last_ping_at).toLocaleTimeString()}</span>
              <span className={src.is_healthy ? 'text-emerald-500 font-semibold' : 'text-amber-500 font-semibold'}>
                {src.is_healthy ? 'Operational' : 'Simulated / Degraded'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Retrieved Telemetry Observation Stream */}
      <div className="glass-panel p-5 rounded-xl space-y-4 shadow-xl" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h2 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Ingested Telemetry Evidence Stream ({evidenceItems.length})</span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Corroborating and conflicting sensor records linked to active incidents
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {evidenceItems.length === 0 ? (
            <div className="text-center py-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No evidence observations recorded yet.
            </div>
          ) : (
            evidenceItems.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-lg space-y-2 text-xs"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <EvidenceBadge
                    relationship={ev.relationship_to_incident}
                    source={ev.source}
                    isStale={ev.is_stale}
                  />
                  <div className="flex items-center space-x-3 text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                    <span>
                      Observed: {ev.observation_time ? new Date(ev.observation_time).toLocaleString() : 'Recent'}
                    </span>
                    <span>Confidence: {(ev.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="text-sm font-semibold font-mono" style={{ color: 'var(--color-text)' }}>
                  {ev.measurement_value}
                </div>

                {ev.limitations_note && (
                  <p className="text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>
                    Limitation: {ev.limitations_note}
                  </p>
                )}

                {ev.incident_id && (
                  <div
                    className="pt-2 flex items-center justify-between text-[11px]"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      Linked to Incident #{ev.incident_id.slice(0, 8)}
                    </span>
                    <a
                      href={`/incidents/${ev.incident_id}`}
                      className="font-medium hover:underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      View Incident →
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
