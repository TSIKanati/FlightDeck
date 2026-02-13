import React from 'react';
import { cn } from '../utils/cn';
import { LucideIcon } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  const variantStyles = {
    default: 'bg-gray-800 hover:bg-gray-700 text-gray-300',
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={cn(
              'flex items-center px-3 py-2 rounded-lg text-sm font-medium',
              'transition-all duration-200',
              variantStyles[action.variant || 'default'],
              (action.disabled || action.loading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {action.loading ? (
              <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <Icon className="w-4 h-4 mr-2" />
            )}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
