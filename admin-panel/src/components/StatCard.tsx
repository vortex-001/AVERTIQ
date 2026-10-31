import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'danger' | 'warning' | 'purple' | 'cyan' | 'slate';
}

const VARIANT_STYLES: Record<string, { borderColor: string; iconBg: string; iconColor: string; valueColor: string }> = {
  danger:  { borderColor: '#FCA5A5', iconBg: '#FEF2F2',  iconColor: '#DC2626', valueColor: '#DC2626' },
  warning: { borderColor: '#FCD34D', iconBg: '#FFFBEB',  iconColor: '#D97706', valueColor: '#D97706' },
  purple:  { borderColor: '#C4B5FD', iconBg: '#F5F3FF',  iconColor: '#7C3AED', valueColor: '#7C3AED' },
  cyan:    { borderColor: '#93C5FD', iconBg: '#EFF6FF',  iconColor: '#2563EB', valueColor: '#2563EB' },
  slate:   { borderColor: 'var(--color-border)', iconBg: 'var(--color-input-bg)', iconColor: 'var(--color-text-muted)', valueColor: 'var(--color-text)' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'slate',
}) => {
  const vs = VARIANT_STYLES[variant] || VARIANT_STYLES.slate;

  return (
    <div
      className="glass-card p-4 rounded-xl transition-all duration-200 hover:shadow-md"
      style={{ border: `1px solid ${vs.borderColor}` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </span>
        <div
          className="p-2 rounded-lg shrink-0"
          style={{ background: vs.iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: vs.iconColor }} />
        </div>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-black font-mono tracking-tight" style={{ color: vs.valueColor }}>
          {value}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
