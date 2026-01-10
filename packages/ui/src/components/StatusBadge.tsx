import React from 'react';
import { cn } from '../utils/cn';

export interface StatusBadgeProps {
  status: 'live' | 'production' | 'development' | 'dev' | 'offline' | 'maintenance' | 'not_started';
  label?: string;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  label,
  pulse = true,
  size = 'md',
  className
}: StatusBadgeProps) {
  const statusConfig = {
    live: { color: 'bg-green-500', text: 'LIVE', textColor: 'text-green-400' },
    production: { color: 'bg-green-500', text: 'LIVE', textColor: 'text-green-400' },
    development: { color: 'bg-yellow-500', text: 'DEV', textColor: 'text-yellow-400' },
    dev: { color: 'bg-yellow-500', text: 'DEV', textColor: 'text-yellow-400' },
    offline: { color: 'bg-red-500', text: 'OFFLINE', textColor: 'text-red-400' },
    maintenance: { color: 'bg-orange-500', text: 'MAINT', textColor: 'text-orange-400' },
    not_started: { color: 'bg-gray-500', text: 'N/A', textColor: 'text-gray-400' }
  };

  const sizeConfig = {
    sm: { dot: 'w-2 h-2', text: 'text-xs' },
    md: { dot: 'w-2.5 h-2.5', text: 'text-sm' },
    lg: { dot: 'w-3 h-3', text: 'text-base' }
  };

  const config = statusConfig[status];
  const sizes = sizeConfig[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex">
        <span
          className={cn(
            'rounded-full',
            sizes.dot,
            config.color,
            pulse && status !== 'not_started' && 'animate-pulse'
          )}
        />
        {pulse && (status === 'live' || status === 'production') && (
          <span
            className={cn(
              'absolute inline-flex rounded-full opacity-75 animate-ping',
              sizes.dot,
              config.color
            )}
          />
        )}
      </span>
      <span className={cn('font-medium', sizes.text, config.textColor)}>
        {label || config.text}
      </span>
    </div>
  );
}
