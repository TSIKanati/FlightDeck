import React from 'react';
import { cn } from '../utils/cn';

export interface NavTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

export interface NavigationProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'tabs' | 'pills';
  className?: string;
}

export function Navigation({
  tabs,
  activeTab,
  onTabChange,
  variant = 'tabs',
  className
}: NavigationProps) {
  if (variant === 'pills') {
    return (
      <nav className={cn('flex flex-wrap gap-2', className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={cn(
                'ml-2 px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.id ? 'bg-orange-700' : 'bg-gray-700'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    );
  }

  return (
    <nav className={cn('border-b border-gray-800', className)}>
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
            )}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-600 text-white rounded-full">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
