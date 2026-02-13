import React from 'react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { ChevronRight, ExternalLink } from 'lucide-react';

export interface AppStatusCardProps {
  id: string;
  name: string;
  icon: string;
  status: 'live' | 'production' | 'development' | 'dev' | 'offline' | 'maintenance' | 'not_started';
  priority?: string;
  metrics?: {
    users?: number;
    uptime?: number;
  };
  onClick?: () => void;
  onExternalLink?: () => void;
  className?: string;
}

export function AppStatusCard({
  id,
  name,
  icon,
  status,
  priority,
  metrics,
  onClick,
  onExternalLink,
  className
}: AppStatusCardProps) {
  return (
    <div
      className={cn(
        'bg-gray-800 rounded-lg p-3 flex items-center justify-between',
        'hover:bg-gray-700 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{name}</span>
            {priority && (
              <span className="text-xs text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
                {priority}
              </span>
            )}
          </div>
          {metrics && (
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              {metrics.users !== undefined && (
                <span>{metrics.users.toLocaleString()} users</span>
              )}
              {metrics.uptime !== undefined && (
                <span>{metrics.uptime}% uptime</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <StatusBadge status={status} size="sm" />
        {onExternalLink && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExternalLink();
            }}
            className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        {onClick && (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </div>
    </div>
  );
}
