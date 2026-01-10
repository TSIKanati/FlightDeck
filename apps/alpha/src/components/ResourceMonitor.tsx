'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, MonitorSpeaker, Database } from 'lucide-react';

interface ResourceData {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

export function ResourceMonitor() {
  const [resources, setResources] = useState<ResourceData[]>([
    { label: 'CPU', value: 67, icon: Cpu, color: 'orange' },
    { label: 'Memory', value: 52, icon: HardDrive, color: 'blue' },
    { label: 'GPU', value: 78, icon: MonitorSpeaker, color: 'purple' },
    { label: 'Database', value: 34, icon: Database, color: 'green' }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setResources((prev) =>
        prev.map((r) => ({
          ...r,
          value: Math.max(10, Math.min(95, r.value + (Math.random() - 0.5) * 10))
        }))
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getBarColor = (value: number) => {
    if (value >= 90) return 'bg-red-500';
    if (value >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Resource Allocation</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {resources.map((resource) => (
          <div key={resource.label} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <resource.icon className={`w-4 h-4 text-${resource.color}-500`} />
                <span className="text-gray-400 text-sm">{resource.label}</span>
              </div>
              <span className="text-white font-medium">{Math.round(resource.value)}%</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarColor(resource.value)}`}
                style={{ width: `${resource.value}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts for high usage */}
      {resources.some((r) => r.value >= 80) && (
        <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-yellow-500 text-sm">
            <span className="font-medium">High Usage Alert:</span>{' '}
            {resources
              .filter((r) => r.value >= 80)
              .map((r) => `${r.label} at ${Math.round(r.value)}%`)
              .join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
