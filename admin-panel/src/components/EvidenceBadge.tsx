import React from 'react';
import { CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react';

interface EvidenceBadgeProps {
  relationship: 'corroborating' | 'conflicting' | 'contextual' | string;
  source: string;
  isStale?: boolean;
}

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({ relationship, source, isStale }) => {
  let relBadge = (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <CheckCircle2 className="w-3 h-3" />
      <span>Corroborating</span>
    </span>
  );

  if (relationship === 'conflicting') {
    relBadge = (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <AlertTriangle className="w-3 h-3" />
        <span>Conflicting Evidence</span>
      </span>
    );
  } else if (relationship === 'contextual') {
    relBadge = (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-700/50 text-slate-300 border border-slate-600">
        <Info className="w-3 h-3" />
        <span>Contextual Telemetry</span>
      </span>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {relBadge}
      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
        {source}
      </span>
      {isStale && (
        <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <Clock className="w-2.5 h-2.5" />
          <span>STALE</span>
        </span>
      )}
    </div>
  );
};
