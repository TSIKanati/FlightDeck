import React from 'react';
import { cn } from '../utils/cn';
import { StatusBadge } from './StatusBadge';
import { LayoutDashboard, ChevronRight } from 'lucide-react';

export interface SidebarApp {
  id: string;
  name: string;
  icon: string;
  status: 'live' | 'production' | 'development' | 'dev' | 'offline' | 'maintenance' | 'not_started';
  priority?: string;
}

export interface SidebarProps {
  apps: SidebarApp[];
  activeAppId?: string;
  onAppSelect: (appId: string) => void;
  onAlphaClick?: () => void;
  collapsed?: boolean;
  className?: string;
}

export function Sidebar({
  apps,
  activeAppId,
  onAppSelect,
  onAlphaClick,
  collapsed = false,
  className
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'bg-gray-900 border-r border-gray-800 flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        'transition-all duration-300',
        className
      )}
    >
      {/* Alpha FlightDeck Link */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onAlphaClick}
          className={cn(
            'w-full flex items-center p-3 rounded-lg',
            'bg-orange-600 hover:bg-orange-700 text-white',
            'transition-all duration-200'
          )}
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="ml-3 font-semibold">Alpha FlightDeck</span>
              <ChevronRight className="w-4 h-4 ml-auto" />
            </>
          )}
        </button>
      </div>

      {/* App List */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {apps.map((app) => (
            <button
              key={app.id}
              onClick={() => onAppSelect(app.id)}
              className={cn(
                'w-full flex items-center p-2 rounded-lg transition-all duration-200',
                activeAppId === app.id
                  ? 'bg-gray-800 text-orange-500'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )}
            >
              <span className="text-xl flex-shrink-0">{app.icon}</span>
              {!collapsed && (
                <>
                  <div className="ml-3 flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{app.name}</span>
                      {app.priority && (
                        <span className="text-xs text-gray-600">{app.priority}</span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={app.status} size="sm" pulse={false} />
                </>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        {!collapsed && (
          <p className="text-xs text-gray-600 text-center">
            TSI FlightDeck v1.0.0
          </p>
        )}
      </div>
    </aside>
  );
}
