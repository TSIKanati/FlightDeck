'use client';

import React from 'react';
import { useAppsStore } from '@/stores/appsStore';
import { AlertTriangle, AlertCircle, Info, Check, X, CheckCircle } from 'lucide-react';

export function AlertsPanel() {
  const { alerts, acknowledgeAlert, dismissAlert } = useAppsStore();

  const severityConfig = {
    critical: {
      icon: AlertCircle,
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-l-yellow-500',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500',
      iconColor: 'text-blue-500'
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return date.toLocaleDateString();
  };

  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Priority Alerts</h2>
        <span className="text-xs text-gray-500">
          {activeAlerts.length} active
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-green-500">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span>All systems operational</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {activeAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`rounded-lg p-3 border-l-4 transition-all duration-200 ${config.bgColor} ${config.borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start flex-1">
                    <Icon className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        <span className="text-orange-400">{alert.appName}: </span>
                        {alert.message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatTime(alert.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center ml-2 space-x-1">
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                      title="Acknowledge"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {acknowledgedAlerts.length > 0 && (
            <>
              <div className="border-t border-gray-800 my-3" />
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">
                Acknowledged
              </p>
              {acknowledgedAlerts.slice(0, 3).map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className="rounded-lg p-3 bg-gray-800/50 opacity-60"
                  >
                    <div className="flex items-start">
                      <Icon className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-400 text-sm">
                          <span className="text-gray-500">{alert.appName}: </span>
                          {alert.message}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
