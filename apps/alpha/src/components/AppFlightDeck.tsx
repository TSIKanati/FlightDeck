'use client';

import React, { useState } from 'react';
import { AppData } from '@/stores/appsStore';
import { User } from '@/stores/authStore';
import {
  ChevronLeft,
  Settings,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  DollarSign,
  Clock,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AppFlightDeckProps {
  app: AppData;
  onBack: () => void;
  user: User;
}

export function AppFlightDeck({ app, onBack, user }: AppFlightDeckProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Generate mock time series data
  const timeSeriesData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    users: Math.floor(Math.random() * 200) + 50,
    sessions: Math.floor(Math.random() * 500) + 100
  }));

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'metrics', label: 'Metrics' },
    { id: 'logs', label: 'Logs' },
    { id: 'config', label: 'Config' }
  ];

  const getStatusColor = (status: AppData['status']) => {
    const colors = {
      production: 'text-green-500',
      development: 'text-yellow-500',
      maintenance: 'text-orange-500',
      offline: 'text-red-500',
      not_started: 'text-gray-500'
    };
    return colors[status];
  };

  const getStatusLabel = (status: AppData['status']) => {
    const labels = {
      production: 'LIVE',
      development: 'DEV',
      maintenance: 'MAINTENANCE',
      offline: 'OFFLINE',
      not_started: 'NOT STARTED'
    };
    return labels[status];
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <span className="text-3xl">{app.icon}</span>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-white">{app.name}</h1>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                    {app.priority}
                  </span>
                  <span className={`flex items-center gap-1 text-sm ${getStatusColor(app.status)}`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        app.status === 'production' ? 'bg-green-400' : 'bg-gray-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        app.status === 'production' ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                    </span>
                    {getStatusLabel(app.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{app.description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {app.url && (
              <a
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                <span className="text-sm">Open App</span>
              </a>
            )}
            <button className="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex space-x-1 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-[1600px] mx-auto">
        {/* Metric Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Active Users"
            value={app.metrics.users.toLocaleString()}
            change={5.2}
            icon={Users}
            color="orange"
          />
          <MetricCard
            title="Sessions Today"
            value={app.metrics.sessionsToday.toLocaleString()}
            change={12}
            icon={Activity}
            color="green"
          />
          <MetricCard
            title="Revenue"
            value={`$${(app.metrics.revenue / 1000).toFixed(1)}K`}
            change={8.7}
            icon={DollarSign}
            color="blue"
          />
          <MetricCard
            title="Uptime"
            value={`${app.metrics.uptime}%`}
            change={0.1}
            icon={Clock}
            color="purple"
            status={app.metrics.uptime >= 99 ? 'healthy' : 'warning'}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Users Over Time (24h)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={timeSeriesData}>
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Sessions Over Time (24h)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeSeriesData}>
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
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
                  dataKey="sessions"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Custom Metrics */}
        {Object.keys(app.metrics.customMetrics).length > 0 && (
          <section className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">App-Specific Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(app.metrics.customMetrics).map(([key, value]) => (
                <div key={key} className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wider">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions for this App */}
        <section className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              <Play className="w-4 h-4 mr-2" />
              Start
            </button>
            <button className="flex items-center px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors">
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </button>
            <button className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart
            </button>
            {app.githubRepo && (
              <a
                href={`https://github.com/${app.githubRepo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                GitHub
              </a>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// MetricCard sub-component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
  status?: 'healthy' | 'warning' | 'critical';
}

function MetricCard({ title, value, change, icon: Icon, color, status = 'healthy' }: MetricCardProps) {
  const statusBorder = {
    healthy: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500'
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-4 border-l-4 ${statusBorder[status]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-lg bg-${color}-500/20`}>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
      </div>
      <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        <span>{change >= 0 ? '+' : ''}{change}%</span>
      </div>
    </div>
  );
}
