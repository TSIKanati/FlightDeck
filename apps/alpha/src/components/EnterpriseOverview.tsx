'use client';

import React from 'react';
import {
  LayoutGrid,
  Users,
  DollarSign,
  Activity,
  GitCommit,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface EnterpriseOverviewProps {
  metrics: {
    totalApps: number;
    activeApps: number;
    totalUsers: number;
    totalRevenue: number;
    avgUptime: number;
    totalSessions: number;
  };
}

export function EnterpriseOverview({ metrics }: EnterpriseOverviewProps) {
  const cards = [
    {
      title: 'APPS',
      value: `${metrics.activeApps}/${metrics.totalApps}`,
      subtitle: 'Active / Total',
      change: { value: 0, direction: 'neutral' as const },
      status: metrics.activeApps > 0 ? 'healthy' as const : 'warning' as const,
      icon: LayoutGrid,
      color: 'orange'
    },
    {
      title: 'USERS',
      value: formatNumber(metrics.totalUsers),
      subtitle: 'Across all apps',
      change: { value: 12.3, direction: 'up' as const },
      status: 'healthy' as const,
      icon: Users,
      color: 'green'
    },
    {
      title: 'REVENUE',
      value: formatCurrency(metrics.totalRevenue),
      subtitle: 'This month',
      change: { value: 8.7, direction: 'up' as const },
      status: 'healthy' as const,
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'UPTIME',
      value: `${metrics.avgUptime.toFixed(2)}%`,
      subtitle: 'Average across apps',
      change: { value: 0.1, direction: 'up' as const },
      status: metrics.avgUptime >= 99 ? 'healthy' as const : 'warning' as const,
      icon: Activity,
      color: 'purple'
    },
    {
      title: 'SESSIONS',
      value: formatNumber(metrics.totalSessions),
      subtitle: 'Today',
      change: { value: 23, direction: 'up' as const },
      status: 'healthy' as const,
      icon: GitCommit,
      color: 'cyan'
    }
  ];

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Enterprise Health Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className={`bg-gray-800 rounded-lg p-4 border-l-4 ${
              card.status === 'healthy' ? 'border-l-green-500' :
              card.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                <p className="text-gray-500 text-xs mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-2 rounded-lg bg-${card.color}-500/20`}>
                <card.icon className={`w-5 h-5 text-${card.color}-500`} />
              </div>
            </div>

            {card.change.direction !== 'neutral' && (
              <div className={`flex items-center mt-3 text-sm ${
                card.change.direction === 'up' ? 'text-green-500' : 'text-red-500'
              }`}>
                {card.change.direction === 'up' ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span className="font-medium">
                  {card.change.direction === 'up' ? '+' : '-'}{card.change.value}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return '$' + (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  }
  return '$' + value.toLocaleString();
}
