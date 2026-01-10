'use client';

import React from 'react';
import { AppData } from '@/stores/appsStore';
import { ChevronRight, ExternalLink } from 'lucide-react';

interface AppFleetStatusProps {
  apps: AppData[];
  onAppSelect: (appId: string) => void;
}

export function AppFleetStatus({ apps, onAppSelect }: AppFleetStatusProps) {
  const getStatusBadge = (status: AppData['status']) => {
    const configs = {
      production: { color: 'bg-green-500', text: 'LIVE', pulse: true },
      development: { color: 'bg-yellow-500', text: 'DEV', pulse: false },
      maintenance: { color: 'bg-orange-500', text: 'MAINT', pulse: true },
      offline: { color: 'bg-red-500', text: 'DOWN', pulse: true },
      not_started: { color: 'bg-gray-500', text: 'N/A', pulse: false }
    };
    return configs[status];
  };

  const priorityGroups = {
    'P0': apps.filter(a => a.priority === 'P0'),
    'P1': apps.filter(a => a.priority === 'P1'),
    'P2': apps.filter(a => a.priority === 'P2'),
    'P3+': apps.filter(a => ['P3', 'P4'].includes(a.priority))
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">App Fleet Status</h2>

      <div className="space-y-6">
        {Object.entries(priorityGroups).map(([priority, groupApps]) => (
          groupApps.length > 0 && (
            <div key={priority}>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                {priority} Priority
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groupApps.map((app) => {
                  const statusConfig = getStatusBadge(app.status);
                  return (
                    <button
                      key={app.id}
                      onClick={() => onAppSelect(app.id)}
                      className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all duration-200 group text-left"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{app.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{app.name}</span>
                            <span className="text-xs text-gray-600 bg-gray-700 px-1.5 py-0.5 rounded">
                              {app.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{app.metrics.users.toLocaleString()} users</span>
                            <span>{app.metrics.uptime}% uptime</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center gap-2">
                          <span className="relative flex">
                            <span className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                            {statusConfig.pulse && app.status === 'production' && (
                              <span className={`absolute w-2 h-2 rounded-full ${statusConfig.color} animate-ping`} />
                            )}
                          </span>
                          <span className={`text-xs font-medium ${
                            app.status === 'production' ? 'text-green-400' :
                            app.status === 'development' ? 'text-yellow-400' :
                            app.status === 'offline' ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {statusConfig.text}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
