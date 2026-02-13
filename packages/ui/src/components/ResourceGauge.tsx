import React from 'react';
import { cn } from '../utils/cn';

export interface ResourceGaugeProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  showPercent?: boolean;
  thresholds?: {
    warning: number;
    critical: number;
  };
  className?: string;
}

export function ResourceGauge({
  label,
  value,
  max = 100,
  unit = '%',
  showPercent = true,
  thresholds = { warning: 70, critical: 90 },
  className
}: ResourceGaugeProps) {
  const percent = Math.min((value / max) * 100, 100);

  const getColor = () => {
    if (percent >= thresholds.critical) return 'bg-red-500';
    if (percent >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">
          {showPercent ? `${Math.round(percent)}%` : `${value}${unit}`}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor())}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
