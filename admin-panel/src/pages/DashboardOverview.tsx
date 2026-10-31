import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { PriorityBadge } from '../components/PriorityBadge';
import { IncidentMap } from '../components/IncidentMap';
import {
  AlertOctagon,
  FileText,
  Radio,
  Layers,
  Clock,
  ExternalLink,
  RefreshCw,
  Flame,
  Droplets,
  AlertTriangle,
  Server,
  Smartphone,
  Send,
  Zap,
  Timer,
  Users,
} from 'lucide-react';

// Dispatch targets by severity (configurable)
const DISPATCH_TARGETS: Record<string, { minutes: number; label: string; color: string; bg: string }> = {
  critical: { minutes: 2,  label: 'Dispatch IMMEDIATELY',   color: '#DC2626', bg: '#FEF2F2' },
  high:     { minutes: 5,  label: 'Dispatch within 5 min',  color: '#D97706', bg: '#FFFBEB' },
  medium:   { minutes: 15, label: 'Dispatch within 15 min', color: '#2B6777', bg: '#EBF4F6' },
  low:      { minutes: 30, label: 'Dispatch within 30 min', color: '#52AB98', bg: '#F0FBF8' },
};

function getElapsedMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function DispatchTargetRow({ inc }: { inc: any }) {
  const target = DISPATCH_TARGETS[inc.priority_level] || DISPATCH_TARGETS.low;
  const elapsed = getElapsedMinutes(inc.created_at);
  const exceeded = elapsed > target.minutes && !inc.estimated_response_minutes;
  const assigned = !!inc.estimated_response_minutes;

  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-xl text-xs"
      style={{
        background: exceeded ? '#FEF2F2' : 'var(--color-card-bg)',
        border: `1px solid ${exceeded ? '#FCA5A5' : 'var(--color-border)'}`,
      }}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
          {inc.canonical_title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
            style={{ background: target.bg, color: target.color }}
          >
            {inc.priority_level}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {target.label}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        {assigned ? (
          <span className="text-[10px] font-bold text-[#52AB98]">
            ✓ ETA: {inc.estimated_response_minutes}m
          </span>
        ) : exceeded ? (
          <span className="text-[10px] font-bold text-red-600">
            ⚠ {elapsed}m / {target.minutes}m OVERDUE
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {elapsed}m elapsed
          </span>
        )}
      </div>
    </div>
  );
}

export const DashboardOverview: React.FC = () => {
  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => api.getDashboardSummary(),
    refetchInterval: 15000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidentsList'],
    queryFn: () => api.getIncidents({ limit: 20 }),
    refetchInterval: 15000,
  });

  const { data: silentZones = [] } = useQuery({
    queryKey: ['silentZonesList'],
    queryFn: () => api.getSilentZones(),
  });

  const criticalSilentZones = silentZones.filter(
    (z) => z.risk_category === 'critical' || z.risk_category === 'high'
  );

  // Active incidents needing rescue assignment
  const pendingDispatch = incidents.filter(
    (inc) => !inc.estimated_response_minutes && inc.response_status !== 'resolved'
  );
  const criticalPending = pendingDispatch.filter((i) => i.priority_level === 'critical');

  return (
    <div className="space-y-5">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--color-text)' }}>
            Disaster Intelligence Operations
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Real-time multi-channel emergency monitoring & silent-zone risk detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>{isFetching ? 'Refreshing...' : 'Live Refresh'}</span>
          </button>
          <Link
            to="/map"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all"
            style={{ background: '#2B6777' }}
          >
            <span>Tactical Map</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Critical Alert Banner ──────────────────────────────────────────── */}
      {(criticalPending.length > 0 || criticalSilentZones.length > 0) && (
        <div
          className="p-4 rounded-xl"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5' }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg shrink-0">
              <Radio className="w-5 h-5 text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-red-700">
                  {criticalPending.length > 0
                    ? `⚠ ${criticalPending.length} CRITICAL INCIDENT(S) AWAITING RESCUE DISPATCH`
                    : `Silent-Zone Alert — ${criticalSilentZones.length} high-risk area(s)`}
                </span>
                <Link to="/rescue-assignment" className="text-xs text-red-600 hover:underline font-bold">
                  Assign Teams →
                </Link>
              </div>
              <p className="text-xs text-red-700 mt-0.5">
                {criticalPending.length > 0
                  ? 'Critical incidents must be dispatched immediately. Assign rescue units without delay.'
                  : criticalSilentZones[0]?.explanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard title="Total Reports"      value={summary?.total_reports ?? 0}            subtitle="All channels"         icon={FileText}    variant="slate" />
        <StatCard title="Mobile SOS"         value={summary?.mobile_reports ?? 0}           subtitle="Citizen App"          icon={Smartphone}  variant="cyan" />
        <StatCard title="Telegram"           value={summary?.telegram_reports ?? 0}         subtitle="Bot channel"          icon={Send}        variant="cyan" />
        <StatCard title="Incidents"          value={summary?.unique_incidents ?? 0}         subtitle="Deduplicated"         icon={Layers}      variant="slate" />
        <StatCard title="High Priority"      value={summary?.high_priority_incidents ?? 0}  subtitle="Critical threats"     icon={AlertOctagon} variant="danger" />
        <StatCard title="Silent Zones"       value={summary?.potential_silent_zones ?? 0}   subtitle="Coverage gaps"        icon={Radio}       variant="purple" />
        <StatCard title="Pending Dispatch"   value={pendingDispatch.length}                 subtitle="No team assigned"     icon={Timer}       variant="warning" />
        <StatCard title="Awaiting Review"    value={summary?.reports_awaiting_review ?? 0}  subtitle="Needs triage"         icon={Clock}       variant="slate" />
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left/Center: Map + Breakdown */}
        <div className="lg:col-span-2 space-y-5">
          {/* Map Panel */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  Tactical Situation Map
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Ludhiana & Sutlej River Basin — live incident markers
                </p>
              </div>
              <span
                className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg"
                style={{ background: '#EBF4F6', color: '#2B6777' }}
              >
                {incidents.filter((i) => i.latitude !== null).length} GPS Located
              </span>
            </div>
            <div className="h-[320px] w-full rounded-lg overflow-hidden">
              <IncidentMap
                incidents={incidents}
                silentZones={silentZones}
                showSilentZones={true}
              />
            </div>
          </div>

          {/* Type + Priority Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                By Hazard Type
              </h3>
              <div className="space-y-2">
                {Object.entries(summary?.incidents_by_type || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 capitalize" style={{ color: 'var(--color-text)' }}>
                      {type === 'flood' ? <Droplets className="w-3.5 h-3.5 text-blue-500" /> :
                       type === 'fire'  ? <Flame className="w-3.5 h-3.5 text-orange-500" /> :
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      {type}
                    </span>
                    <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
                By Urgency Level
              </h3>
              <div className="space-y-2">
                {Object.entries(summary?.incidents_by_priority || {}).map(([prio, count]) => (
                  <div key={prio} className="flex items-center justify-between text-xs">
                    <PriorityBadge level={prio} />
                    <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Priority Queue + Dispatch Targets + Source Health */}
        <div className="space-y-5">

          {/* Dispatch Priority Queue */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Dispatch Priority Queue
              </h2>
              <Link to="/rescue-assignment" className="text-[11px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                Assign Teams →
              </Link>
            </div>
            <div className="space-y-2">
              {incidents
                .filter((i) => i.response_status !== 'resolved')
                .slice(0, 6)
                .map((inc) => (
                  <DispatchTargetRow key={inc.id} inc={inc} />
                ))}
              {incidents.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                  No active incidents
                </p>
              )}
            </div>
          </div>

          {/* Dispatch Targets Reference */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
              <Timer className="w-3.5 h-3.5 inline mr-1.5 text-[#2B6777]" />
              Response Dispatch Targets
            </h3>
            <div className="space-y-1.5">
              {Object.entries(DISPATCH_TARGETS).map(([sev, t]) => (
                <div key={sev} className="flex items-center justify-between text-[11px]">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: t.bg, color: t.color }}>
                    {sev}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>{t.label}</span>
                </div>
              ))}
              <p className="text-[10px] mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>
                Configurable demonstration targets · Not official SLA
              </p>
            </div>
          </div>

          {/* External Telemetry Health */}
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
              <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <Server className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                Data Sources
              </h2>
              <Link to="/evidence" className="text-[11px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                Details →
              </Link>
            </div>
            <div className="space-y-2">
              {(summary?.external_sources || []).map((src) => (
                <div key={src.id} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-2 h-2 rounded-full ${src.is_healthy ? 'bg-[#52AB98]' : 'bg-amber-400'}`} />
                    <span className="truncate font-medium" style={{ color: 'var(--color-text)' }}>{src.source_name}</span>
                  </div>
                  <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {src.latency_ms > 0 ? `${src.latency_ms}ms` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
