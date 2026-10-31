import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { PriorityBadge } from '../components/PriorityBadge';
import { Incident } from '../types';
import { Copy, Split, Languages, MapPin, Clock, Sparkles } from 'lucide-react';

export const DuplicateGroups: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedToMerge, setSelectedToMerge] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidentsWithDuplicates'],
    queryFn: () => api.getIncidents(),
  });

  const duplicateClusters = incidents.filter((i) => i.report_count > 1);
  const singleIncidents = incidents.filter((i) => i.report_count === 1);

  const mergeMutation = useMutation({
    mutationFn: (payload: { target_incident_id: string; source_incident_ids: string[]; reason?: string }) =>
      api.mergeIncidents(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentsWithDuplicates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setSelectedToMerge([]);
      setMergeTargetId('');
    },
  });

  const unmergeMutation = useMutation({
    mutationFn: (reportId: string) =>
      api.unmergeReport({ report_id: reportId, reason: 'Manual coordinator unmerge' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentsWithDuplicates'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const handleMergeSubmit = () => {
    if (!mergeTargetId || selectedToMerge.length === 0) return;
    mergeMutation.mutate({
      target_incident_id: mergeTargetId,
      source_incident_ids: selectedToMerge,
      reason: 'Coordinator manual merge across duplicate clusters',
    });
  };

  const toggleSelectForMerge = (id: string) => {
    setSelectedToMerge((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <Copy className="w-6 h-6 text-amber-500" />
            <span>Multilingual Duplicate Clusters</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Cross-lingual semantic deduplication linking Hindi, Punjabi, and English citizen reports to canonical events
          </p>
        </div>

        {/* Merge Tool Trigger if selected */}
        {selectedToMerge.length > 0 && (
          <div className="flex items-center space-x-3 p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <span className="text-xs text-amber-600 font-medium">
              {selectedToMerge.length} incident(s) selected
            </span>
            <select
              aria-label="Select canonical merge target"
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
              className="border text-xs rounded px-2 py-1"
            >
              <option value="">Select Canonical Target</option>
              {incidents
                .filter((i) => selectedToMerge.includes(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    Target: {i.canonical_title.slice(0, 30)}...
                  </option>
                ))}
            </select>
            <button
              onClick={handleMergeSubmit}
              disabled={!mergeTargetId || mergeMutation.isPending}
              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {mergeMutation.isPending ? 'Merging...' : 'Merge Now'}
            </button>
          </div>
        )}
      </div>

      {/* Cross-Lingual Concept Demonstration Banner */}
      <div
        className="glass-panel p-4 rounded-xl text-xs space-y-2"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center space-x-2 font-semibold" style={{ color: 'var(--color-primary)' }}>
          <Languages className="w-4 h-4" />
          <span>Cross-Lingual AI Alignment Example:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {[
            { label: 'Hinglish Report:', text: '"Flood aa gaya hai, pul ke paas paani badh raha hai."' },
            { label: 'Punjabi Report:', text: '"Pul de kol paani chadh reha hai, 15 bande phanse hoye ne."' },
            { label: 'English Report:', text: '"The water is rising beside the bridge, urgent boat needed."' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-2.5 rounded text-[11px]"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <span className="block text-[10px] font-mono mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {item.label}
              </span>
              <p style={{ color: 'var(--color-text)' }}>{item.text}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          ✓ Mapped to identical canonical event via concept embeddings (cosine similarity &gt; 0.85) and spatial proximity (within 300m).
        </p>
      </div>

      {/* Active Clusters List */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
          Clustered Canonical Incidents ({duplicateClusters.length})
        </h2>

        {isLoading ? (
          <div className="p-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading clusters...</div>
        ) : duplicateClusters.length === 0 ? (
          <div
            className="p-8 text-center glass-panel rounded-xl text-xs"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            No multi-report clusters currently formed.
          </div>
        ) : (
          duplicateClusters.map((inc) => (
            <div
              key={inc.id}
              className="glass-panel p-5 rounded-xl space-y-4 shadow-lg"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono uppercase"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      {inc.incident_type}
                    </span>
                    <PriorityBadge level={inc.priority_level} score={inc.priority_score} />
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      {inc.report_count} Reports Merged
                    </span>
                  </div>
                  <h3 className="text-base font-bold mt-1" style={{ color: 'var(--color-text)' }}>
                    <Link to={`/incidents/${inc.id}`} className="hover:underline">
                      {inc.canonical_title}
                    </Link>
                  </h3>
                  <div className="flex items-center space-x-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                      <span>{inc.location_name || 'Coordinates located'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Updated {new Date(inc.updated_at).toLocaleTimeString()}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <label className="flex items-center space-x-2 text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={selectedToMerge.includes(inc.id)}
                      onChange={() => toggleSelectForMerge(inc.id)}
                      className="rounded"
                    />
                    <span>Select for Merge</span>
                  </label>
                  <Link
                    to={`/incidents/${inc.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    View Details
                  </Link>
                </div>
              </div>

              {/* Linked Reports Cards */}
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                {(inc.reports || []).map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-lg space-y-2 text-xs"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className="font-mono uppercase px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                      >
                        {rep.source_channel}
                      </span>
                      <button
                        onClick={() => unmergeMutation.mutate(rep.id)}
                        disabled={unmergeMutation.isPending}
                        className="text-amber-500 hover:underline flex items-center space-x-1 font-semibold"
                      >
                        <Split className="w-3 h-3" />
                        <span>Unmerge</span>
                      </button>
                    </div>
                    <p
                      className="font-mono text-[11px] line-clamp-3 p-2 rounded"
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                    >
                      "{rep.original_text}"
                    </p>
                    <div className="text-[10px] flex items-center justify-between" style={{ color: 'var(--color-text-muted)' }}>
                      <span>Lang: {rep.language_mixture || rep.language}</span>
                      <span>{new Date(rep.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
