'use client';

import React, { useState } from 'react';
import { AppData } from '@/stores/appsStore';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface CrossProjectAnalyticsProps {
  apps: AppData[];
}

type TabType = 'growth' | 'engagement' | 'revenue' | 'velocity';

export function CrossProjectAnalytics({ apps }: CrossProjectAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('growth');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'growth', label: 'Weekly Growth' },
    { id: 'engagement', label: 'User Engagement' },
    { id: 'revenue', label: 'Revenue Streams' },
    { id: 'velocity', label: 'Dev Velocity' }
  ];

  // Generate mock data for different views
  const growthData = [
    { label: 'Mon', value: 1200 },
    { label: 'Tue', value: 1350 },
    { label: 'Wed', value: 1100 },
    { label: 'Thu', value: 1500 },
    { label: 'Fri', value: 1700 },
    { label: 'Sat', value: 1400 },
    { label: 'Sun', value: 1600 }
  ];

  const engagementData = apps
    .filter((a) => a.status === 'production')
    .map((app) => ({
      label: app.name,
      value: app.metrics.sessionsToday
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const revenueData = apps
    .filter((a) => a.metrics.revenue > 0)
    .map((app) => ({
      label: app.name,
      value: app.metrics.revenue
    }))
    .sort((a, b) => b.value - a.value);

  const velocityData = [
    { label: 'Week 1', value: 145 },
    { label: 'Week 2', value: 189 },
    { label: 'Week 3', value: 234 },
    { label: 'Week 4', value: 278 }
  ];

  const colors = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

  const renderChart = () => {
    switch (activeTab) {
      case 'growth':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={growthData}>
              <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ fill: '#f97316', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#f97316' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'engagement':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={engagementData} layout="vertical">
              <XAxis type="number" stroke="#6b7280" fontSize={12} />
              <YAxis dataKey="label" type="category" stroke="#6b7280" fontSize={11} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {engagementData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'revenue':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <XAxis dataKey="label" stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={60} />
              <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'velocity':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={velocityData}>
              <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                formatter={(value: number) => [`${value} commits`, 'Commits']}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Cross-Project Analytics</h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        {renderChart()}
      </div>
    </div>
  );
}
