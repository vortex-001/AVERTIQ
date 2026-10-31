import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { History, UserCheck, Clock } from 'lucide-react';

export const ReviewHistory: React.FC = () => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['reviewHistoryLogs'],
    queryFn: () => api.getReviewHistory(),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center space-x-2" style={{ color: 'var(--color-text)' }}>
          <History className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <span>Coordinator Audit Trail &amp; Action History</span>
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Immutable operational log of coordinator verifications, manual coordinate overrides, and duplicate merges
        </p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden shadow-xl" style={{ border: '1px solid var(--color-border)' }}>
        {isLoading ? (
          <div className="text-center py-12 text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading audit log...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No review actions recorded yet.
          </div>
        ) : (
          <div>
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 text-xs space-y-2 transition-colors"
                style={{ borderTop: '1px solid var(--color-border)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold flex items-center space-x-1" style={{ color: 'var(--color-text)' }}>
                      <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />
                      <span>{item.reviewer_name}</span>
                    </span>
                    <span
                      className="font-mono text-[10px] uppercase px-2 py-0.5 rounded"
                      style={{
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {item.action_type}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      Entity: {item.entity_type} #{item.entity_id.slice(0, 8)}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono flex items-center space-x-1" style={{ color: 'var(--color-text-muted)' }}>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                  </span>
                </div>

                {item.note && (
                  <p
                    className="text-xs p-2.5 rounded"
                    style={{
                      color: 'var(--color-text)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    "{item.note}"
                  </p>
                )}

                {item.changes_json && Object.keys(item.changes_json).length > 0 && (
                  <div className="text-[11px] font-mono pt-1" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Field modifications: </span>
                    <span style={{ color: 'var(--color-primary)' }}>{JSON.stringify(item.changes_json)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
