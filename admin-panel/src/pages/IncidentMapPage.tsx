import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { IncidentMap } from '../components/IncidentMap';
import { PriorityBadge } from '../components/PriorityBadge';
import { Incident } from '../types';
import { Filter, Radio, AlertTriangle, ChevronRight, X } from 'lucide-react';

export const IncidentMapPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedVerification, setSelectedVerification] = useState<string>('');
  const [searchRadius, setSearchRadius] = useState<number | undefined>(undefined);
  const [showSilentZones, setShowSilentZones] = useState<boolean>(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['mapIncidents', selectedType, selectedPriority, selectedVerification, searchRadius],
    queryFn: () =>
      api.getIncidents({
        incident_type: selectedType || undefined,
        priority_level: selectedPriority || undefined,
        verification_status: selectedVerification || undefined,
        lat: searchRadius ? 30.9010 : undefined,
        lon: searchRadius ? 75.8573 : undefined,
        radius_km: searchRadius,
      }),
    refetchInterval: 15000,
  });

  const { data: silentZones = [] } = useQuery({
    queryKey: ['silentZonesList'],
    queryFn: () => api.getSilentZones(),
  });

  const locatedIncidents = incidents.filter((i) => i.latitude !== null && i.longitude !== null);
  const unlocatedIncidents = incidents.filter((i) => i.latitude === null || i.longitude === null);

  const selectStyle = {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    borderColor: 'var(--color-border)',
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Configuration Bar */}
      <div
        className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
            <span>Map Filters:</span>
          </div>

          <select
            aria-label="Filter by incident type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={selectStyle}
            className="border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Hazard Types</option>
            <option value="flood">Flood</option>
            <option value="fire">Fire</option>
            <option value="earthquake">Earthquake</option>
            <option value="cyclone">Cyclone</option>
            <option value="landslide">Landslide</option>
          </select>

          <select
            aria-label="Filter by priority level"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={selectStyle}
            className="border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Urgency Levels</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
            <option value="unconfirmed">Unconfirmed</option>
          </select>

          <select
            aria-label="Filter by verification status"
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            style={selectStyle}
            className="border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">All Verification States</option>
            <option value="human_verified">Human Verified</option>
            <option value="partially_corroborated">Partially Corroborated</option>
            <option value="conflicting_evidence">Conflicting Evidence</option>
            <option value="unchecked">Unchecked</option>
          </select>

          <select
            aria-label="Filter by search radius"
            value={searchRadius ?? ''}
            onChange={(e) => setSearchRadius(e.target.value ? Number(e.target.value) : undefined)}
            style={selectStyle}
            className="border text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="">Full Monitoring Region</option>
            <option value="2">Within 2 km Radius</option>
            <option value="5">Within 5 km Radius</option>
            <option value="10">Within 10 km Radius</option>
          </select>
        </div>

        {/* Silent-Zone Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-xs cursor-pointer" style={{ color: 'var(--color-text)' }}>
            <input
              type="checkbox"
              checked={showSilentZones}
              onChange={(e) => setShowSilentZones(e.target.checked)}
              className="rounded"
            />
            <span className="flex items-center space-x-1">
              <Radio className="w-3.5 h-3.5 text-purple-500" />
              <span>Show Silent-Zone Grid</span>
            </span>
          </label>

          <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {locatedIncidents.length} on map
          </span>
        </div>
      </div>

      {/* Main Map View & Unlocated Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-230px)] min-h-[580px]">
        {/* Left Side: Interactive Map (3 cols) */}
        <div className="lg:col-span-3 relative h-full">
          <IncidentMap
            incidents={locatedIncidents}
            silentZones={silentZones}
            showSilentZones={showSilentZones}
            selectedIncidentId={selectedIncident?.id}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />

          {/* Floating Selected Incident Detail Drawer */}
          {selectedIncident && (
            <div
              className="absolute top-4 right-4 w-96 max-w-[calc(100%-2rem)] glass-panel p-4 rounded-xl shadow-2xl z-20 space-y-3"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--color-primary)' }}>
                    Incident #{selectedIncident.id.slice(0, 8)}
                  </span>
                  <h3 className="text-sm font-bold leading-snug" style={{ color: 'var(--color-text)' }}>
                    {selectedIncident.canonical_title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1 rounded-md transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <PriorityBadge
                  level={selectedIncident.priority_level}
                  score={selectedIncident.priority_score}
                />
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  {selectedIncident.report_count} linked report(s)
                </span>
              </div>

              <p className="text-xs line-clamp-3" style={{ color: 'var(--color-text)' }}>
                {selectedIncident.description}
              </p>

              {/* Priority Explanation */}
              {selectedIncident.priority_explanation && (
                <div
                  className="p-2.5 rounded-lg text-[11px]"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <span className="font-semibold block mb-1" style={{ color: 'var(--color-primary)' }}>
                    Priority Intelligence Breakdown:
                  </span>
                  <p className="leading-relaxed" style={{ color: 'var(--color-text)' }}>
                    {selectedIncident.priority_explanation}
                  </p>
                </div>
              )}

              <div
                className="flex items-center justify-between pt-2 text-xs"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>
                  Status: <strong style={{ color: 'var(--color-text)' }} className="capitalize">{selectedIncident.status}</strong>
                </span>
                <Link
                  to={`/incidents/${selectedIncident.id}`}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-white font-semibold transition-all text-xs"
                  style={{ background: 'var(--color-primary)' }}
                >
                  <span>Inspect Evidence</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Unlocated Incidents Tray (1 col) */}
        <div
          className="glass-panel p-4 rounded-xl flex flex-col h-full overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div
            className="flex items-center justify-between mb-3 pb-2"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                Unlocated Reports ({unlocatedIncidents.length})
              </h2>
            </div>
          </div>

          <p className="text-[11px] mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Emergency reports lacking physical coordinates. Retained in queue without misleading map pins.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {unlocatedIncidents.length === 0 ? (
              <div className="text-center py-10 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No unlocated incidents pending
              </div>
            ) : (
              unlocatedIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 rounded-lg text-xs space-y-1.5 transition-all"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid rgba(245,158,11,0.25)',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold line-clamp-1" style={{ color: 'var(--color-text)' }}>
                      {inc.canonical_title}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono text-amber-600 bg-amber-500/15 border border-amber-500/30 shrink-0 ml-1"
                    >
                      No Location
                    </span>
                  </div>
                  <p className="text-[11px] line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                    {inc.description}
                  </p>
                  <div
                    className="pt-2 flex items-center justify-between text-[10px]"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(inc.created_at).toLocaleTimeString()}
                    </span>
                    <Link
                      to={`/incidents/${inc.id}`}
                      className="font-semibold hover:underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Resolve Location →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
