import React from 'react';

interface PriorityBadgeProps {
  level: 'critical' | 'high' | 'medium' | 'low' | 'unconfirmed' | string;
  score?: number;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ level, score, className = '' }) => {
  const normLevel = (level || 'unconfirmed').toLowerCase();

  const styles: Record<string, { bg: string; color: string; border: string; dot: string; label: string; pulse?: boolean }> = {
    critical:    { bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5', dot: '#DC2626', label: 'Critical', pulse: true },
    high:        { bg: '#FFFBEB', color: '#D97706', border: '#FCD34D', dot: '#D97706', label: 'High Priority' },
    medium:      { bg: '#EFF6FF', color: '#2563EB', border: '#93C5FD', dot: '#60A5FA', label: 'Medium Priority' },
    low:         { bg: '#F0FBF8', color: '#52AB98', border: '#6EE7B7', dot: '#52AB98', label: 'Low Priority' },
    unconfirmed: { bg: 'var(--color-input-bg)', color: 'var(--color-text-muted)', border: 'var(--color-border)', dot: 'var(--color-text-muted)', label: 'Unconfirmed' },
  };

  const s = styles[normLevel] || styles.unconfirmed;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${className}`}
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${s.pulse ? 'animate-pulse' : ''}`}
        style={{ background: s.dot }}
      />
      <span>{s.label}</span>
      {score !== undefined && (
        <span className="font-mono text-[10px] opacity-80 pl-1" style={{ borderLeft: '1px solid currentColor' }}>
          {score.toFixed(0)}
        </span>
      )}
    </span>
  );
};
