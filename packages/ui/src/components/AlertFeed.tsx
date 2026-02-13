import React from 'react';
import { cn } from '../utils/cn';
import { formatRelativeTime } from '../utils/formatters';
import { AlertTriangle, AlertCircle, Info, Check, X } from 'lucide-react';

export interface Alert {
  id: string;
  appId: string;
  appName?: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

export interface AlertFeedProps {
  alerts: Alert[];
  maxItems?: number;
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  className?: string;
}

export function AlertFeed({
  alerts,
  maxItems = 5,
  onAcknowledge,
  onDismiss,
  className
}: AlertFeedProps) {
  const severityConfig = {
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
      iconColor: 'text-red-500',
      emoji: ''
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-l-yellow-500',
      iconColor: 'text-yellow-500',
      emoji: ''
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-500',
      emoji: ''
    }
  };

  const displayAlerts = alerts.slice(0, maxItems);

  if (displayAlerts.length === 0) {
    return (
      <div className={cn('bg-gray-900 rounded-lg p-4', className)}>
        <div className="flex items-center text-green-500">
          <Check className="w-5 h-5 mr-2" />
          <span>All systems operational</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {displayAlerts.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              'rounded-lg p-3 border-l-4 transition-all duration-200',
              config.bgColor,
              config.borderColor,
              alert.acknowledged && 'opacity-60'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <Icon className={cn('w-5 h-5 mr-2 mt-0.5 flex-shrink-0', config.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">
                    {alert.appName && (
                      <span className="text-orange-400">{alert.appName}: </span>
                    )}
                    {alert.message}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {formatRelativeTime(alert.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center ml-2 space-x-1">
                {!alert.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="Acknowledge"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {alerts.length > maxItems && (
        <p className="text-gray-500 text-sm text-center py-2">
          +{alerts.length - maxItems} more alerts
        </p>
      )}
    </div>
  );
}
