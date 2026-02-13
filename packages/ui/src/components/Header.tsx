import React from 'react';
import { cn } from '../utils/cn';
import { Bell, Settings, User, ChevronLeft } from 'lucide-react';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  user?: {
    email: string;
    role: string;
  };
  notificationCount?: number;
  onBack?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
  onProfile?: () => void;
  className?: string;
}

export function Header({
  title,
  subtitle,
  icon,
  user,
  notificationCount = 0,
  onBack,
  onNotifications,
  onSettings,
  onProfile,
  className
}: HeaderProps) {
  return (
    <header className={cn('bg-gray-900 border-b border-gray-800 px-6 py-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-3">
            {icon && <span className="text-3xl">{icon}</span>}
            <div>
              <h1 className="text-xl font-bold text-white">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onNotifications && (
            <button
              onClick={onNotifications}
              className="relative p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}

          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {user && onProfile && (
            <button
              onClick={onProfile}
              className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:text-orange-500 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <User className="w-5 h-5" />
              <span className="text-sm">{user.email.split('@')[0]}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
