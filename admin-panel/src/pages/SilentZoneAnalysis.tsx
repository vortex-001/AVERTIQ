import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { SilentZoneCell } from '../types';
import { IncidentMap } from '../components/IncidentMap';
import { Radio, Info } from 'lucide-react';

export const SilentZoneAnalysis: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<SilentZoneCell | null>(null);
  const [reviewModalCell, setReviewModalCell] = useState<SilentZoneCell | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('verification_in_progress');
  const [reviewNote, setReviewNote] = useState<string>('');

  const { data: cells = [], isLoading } = useQuery({
    queryKey: ['silentZonesTelemetry'],
    queryFn: () => api.getSilentZones(),
    refetchInterval: 20000,
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { cell_id: string; action: string; note?: string }) =>
      api.reviewSilentZone(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['silentZonesTelemetry'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setReviewModalCell(null);
      setReviewNote('');
    },
  });

  const filteredCells = cells.filter((c) =>
    selectedCategory ? c.risk_category === selectedCategory : true
  );

  const criticalCells = cells.filter((c) => c.risk_category === 'critical');
  const highCells = cells.filter((c) => c.risk_category === 'high');

  const handleCellReview = () => {
    if (!reviewModalCell) return;
    reviewMutation.mutate({
      cell_id: reviewModalCell.id,
      action: reviewStatus,
      note: reviewNote || `Coordinator set status to ${reviewStatus}`,
    });
  };

  const getRiskBadgeStyle = (category: string) => {
    if (category === 'critical') return 'bg-red-500/20 text-red-600 border border-red-500/40';
    if (category === 'high') return 'bg-amber-500/20 text-amber-600 border border-amber-500/40';
    if (category === 'moderate') return 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/40';
    return '';
  };

  const inputStyle = {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    borderColor: 'var(--color-border)',
  };

  return (
    <div className="space-y-6">
      {/* Title & Core Concept Callout */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
            <Radio className="w-6 h-6 text-purple-500 animate-pulse" />
            <span>Silent-Zone Risk Detection Engine</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Identifies severe hazard exposure combined with abnormal citizen reporting deficits (power blackouts &amp; isolated populations)
          </p>
        </div>

        {/* Filter by Category */}
        <div className="flex items-center space-x-3">
          <select
            aria-label="Filter by risk category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={inputStyle}
            className="border text-xs rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="">All Risk Categories ({cells.length})</option>
            <option value="critical">Critical Silent Zones ({criticalCells.length})</option>
            <option value="high">High Risk Deficit ({highCells.length})</option>
            <option value="moderate">Moderate Risk</option>
            <option value="low">Low Risk / Baseline</option>
            <option value="insufficient_evidence">Insufficient Evidence</option>
          </select>
        </div>
      </div>

      {/* Explanatory Formula Banner */}
      <div
        className="glass-panel p-4 rounded-xl text-xs space-y-2"
        style={{ border: '1px solid color-mix(in srgb, purple 40%, var(--color-border))' }}
      >
        <div className="flex items-center space-x-2 font-bold text-purple-500">
          <Info className="w-4 h-4" />
          <span>Explainable Formula &amp; Decision Boundary:</span>
        </div>
        <p className="leading-relaxed font-mono text-[11px]" style={{ color: 'var(--color-text)' }}>
          Silent-Zone Risk = 0.45 × Hazard Exposure + 0.35 × Reporting Deficit + 0.15 × Vulnerability - Data Coverage Adjustment
        </p>
        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          ⚠️ <strong>Principle:</strong> If hazard indicators are zero, zero citizen reports is normal (Deficit = 0). A high silent-zone score is ONLY produced when credible telemetry indicates danger but reports are absent or blocked.
        </p>
      </div>

      {/* Map & Grid Cards View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Map with Silent Zone Polygon Grid */}
        <div
          className="glass-panel p-4 rounded-xl space-y-3 h-[500px]"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
            Spatial Grid Coverage Map
          </h2>
          <div className="h-[430px] w-full">
            <IncidentMap
              incidents={[]}
              silentZones={cells}
              showSilentZones={true}
            />
          </div>
        </div>

        {/* Right: Grid Cells Explorer (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div
            className="glass-panel rounded-xl overflow-hidden shadow-xl"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <div
              className="p-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>
                Active Geographic Grid Cells ({filteredCells.length})
              </h2>
              <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
                5.5km × 5.5km Quadrants
              </span>
            </div>

            <div className="max-h-[440px] overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading grid cells...</div>
              ) : filteredCells.length === 0 ? (
                <div className="text-center py-8 text-xs" style={{ color: 'var(--color-text-muted)' }}>No cells match the selected filter.</div>
              ) : (
                filteredCells.map((cell) => (
                  <div
                    key={cell.id}
                    className="p-4 transition-colors space-y-2 text-xs"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                            {cell.cell_code}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getRiskBadgeStyle(cell.risk_category)}`}
                            style={
                              !['critical', 'high', 'moderate'].includes(cell.risk_category)
                                ? { background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }
                                : {}
                            }
                          >
                            {cell.risk_category.replace('_', ' ')} ({cell.silent_zone_risk.toFixed(1)} pts)
                          </span>
                        </div>
                        <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          Center: {cell.center_lat.toFixed(4)}°N, {cell.center_lon.toFixed(4)}°E • Reports: {cell.report_count}
                        </p>
                      </div>

                      {/* Coordinator Verify Action */}
                      <button
                        onClick={() => {
                          setReviewModalCell(cell);
                          setReviewStatus(cell.review_status);
                        }}
                        className="px-2.5 py-1 rounded font-medium transition-all"
                        style={{
                          background: 'var(--color-surface)',
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        Review Zone
                      </button>
                    </div>

                    {/* Hazard & Deficit Metrics Bar */}
                    <div
                      className="grid grid-cols-3 gap-2 p-2 rounded-lg text-[11px]"
                      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                      <div>
                        <span className="block" style={{ color: 'var(--color-text-muted)' }}>Hazard Score:</span>
                        <span className="font-mono font-bold" style={{ color: 'var(--color-text)' }}>
                          {cell.hazard_score.toFixed(1)} / 100
                        </span>
                      </div>
                      <div>
                        <span className="block" style={{ color: 'var(--color-text-muted)' }}>Reporting Deficit:</span>
                        <span className="font-mono font-bold text-amber-500">
                          {cell.reporting_deficit.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="block" style={{ color: 'var(--color-text-muted)' }}>Review State:</span>
                        <span className="font-mono capitalize" style={{ color: 'var(--color-primary)' }}>
                          {cell.review_status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Explanation */}
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text)' }}>
                      {cell.explanation}
                    </p>

                    <div
                      className="text-[10px] flex items-center justify-between pt-1.5"
                      style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                    >
                      <span>
                        <strong>Action:</strong> {cell.recommended_action}
                      </span>
                      <span>Uncertainty: {(cell.uncertainty_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Silent Zone Modal */}
      {reviewModalCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="glass-panel p-6 rounded-xl max-w-md w-full space-y-4 shadow-2xl"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>
              Coordinator Verification: {reviewModalCell.cell_code}
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Update field verification state and record operational action
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Verification Status
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  style={inputStyle}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="needs_verification">Needs Verification</option>
                  <option value="verification_in_progress">Verification in Progress (Field Team Dispatched)</option>
                  <option value="reviewed">Reviewed / Monitored</option>
                  <option value="confirmed_concern">Confirmed Concern (Ground Threat Real)</option>
                  <option value="false_alert">False Alert (Sensor Outlier / Safe)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Coordinator Rationale Note
                </label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. District SDRF radio contact initiated; floodgate overflow confirmed..."
                  style={inputStyle}
                  className="w-full border rounded-lg p-2.5 resize-none"
                />
              </div>
            </div>

            <div
              className="flex items-center justify-end space-x-3 pt-3"
              style={{ borderTop: '1px solid var(--color-border)' }}
            >
              <button
                onClick={() => setReviewModalCell(null)}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCellReview}
                disabled={reviewMutation.isPending}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {reviewMutation.isPending ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
