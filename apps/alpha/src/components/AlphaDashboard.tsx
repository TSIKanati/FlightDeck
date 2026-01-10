'use client';

import React, { useState, useMemo } from 'react';
import { useAppsStore, AppData } from '@/stores/appsStore';
import { useAuthStore, User } from '@/stores/authStore';
import { EnterpriseOverview } from './EnterpriseOverview';
import { AppFleetStatus } from './AppFleetStatus';
import { AlertsPanel } from './AlertsPanel';
import { ResourceMonitor } from './ResourceMonitor';
import { CrossProjectAnalytics } from './CrossProjectAnalytics';
import { QuickActionsPanel } from './QuickActionsPanel';
import { AppFlightDeck } from './AppFlightDeck';
import {
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  ChevronLeft
} from 'lucide-react';

interface AlphaDashboardProps {
  user: User;
}

export function AlphaDashboard({ user }: AlphaDashboardProps) {
  const { logout } = useAuthStore();
  const { apps, alerts, selectedAppId, setSelectedApp } = useAppsStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const unacknowledgedAlerts = useMemo(
    () => alerts.filter((a) => !a.acknowledged),
    [alerts]
  );

  const aggregatedMetrics = useMemo(() => {
    const activeApps = apps.filter((a) => a.status === 'production');
    return {
      totalApps: apps.length,
      activeApps: activeApps.length,
      totalUsers: apps.reduce((sum, app) => sum + app.metrics.users, 0),
      totalRevenue: apps.reduce((sum, app) => sum + app.metrics.revenue, 0),
      avgUptime: activeApps.length > 0
        ? activeApps.reduce((sum, app) => sum + app.metrics.uptime, 0) / activeApps.length
        : 0,
      totalSessions: apps.reduce((sum, app) => sum + app.metrics.sessionsToday, 0)
    };
  }, [apps]);

  // If an app is selected, show its FlightDeck
  if (selectedAppId) {
    const selectedApp = apps.find((a) => a.id === selectedAppId);
    if (selectedApp) {
      return (
        <AppFlightDeck
          app={selectedApp}
          onBack={() => setSelectedApp(null)}
          user={user}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Alpha FlightDeck</h1>
                <p className="text-sm text-gray-500">TSI Enterprise Command Center</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unacknowledgedAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unacknowledgedAlerts.length}
                </span>
              )}
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-800">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.email.split('@')[0]}</p>
                <p className="text-xs text-orange-500">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 max-w-[1800px] mx-auto">
        {/* Enterprise Overview */}
        <section className="mb-8">
          <EnterpriseOverview metrics={aggregatedMetrics} />
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* App Fleet Status - 2 columns */}
          <div className="lg:col-span-2">
            <AppFleetStatus
              apps={apps}
              onAppSelect={setSelectedApp}
            />
          </div>

          {/* Alerts Panel - 1 column */}
          <div>
            <AlertsPanel />
          </div>
        </div>

        {/* Resource Monitor */}
        <section className="mb-8">
          <ResourceMonitor />
        </section>

        {/* Cross Project Analytics */}
        <section className="mb-8">
          <CrossProjectAnalytics apps={apps} />
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActionsPanel />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-4 text-center text-gray-600 text-sm">
        TSI FlightDeck v1.0.0 • TSIKanati Enterprise • {new Date().getFullYear()}
      </footer>
    </div>
  );
}
