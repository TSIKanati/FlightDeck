'use client';

import React, { useState } from 'react';
import {
  Rocket,
  FileBarChart,
  GitBranch,
  Mail,
  Settings,
  RefreshCw
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'primary' | 'danger';
  onClick: () => Promise<void>;
}

export function QuickActionsPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{ id: string; success: boolean } | null>(null);

  const executeAction = async (action: QuickAction) => {
    setLoading(action.id);
    setLastAction(null);

    try {
      await action.onClick();
      setLastAction({ id: action.id, success: true });
    } catch {
      setLastAction({ id: action.id, success: false });
    } finally {
      setLoading(null);
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'deploy',
      label: 'Deploy All',
      icon: Rocket,
      variant: 'primary',
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 2000));
        console.log('Deploying all apps...');
      }
    },
    {
      id: 'export',
      label: 'Export Report',
      icon: FileBarChart,
      variant: 'default',
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 1500));
        console.log('Exporting report...');
      }
    },
    {
      id: 'sync',
      label: 'Sync GitHub',
      icon: GitBranch,
      variant: 'default',
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 1000));
        console.log('Syncing GitHub...');
      }
    },
    {
      id: 'digest',
      label: 'Team Digest',
      icon: Mail,
      variant: 'default',
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 1000));
        console.log('Sending team digest...');
      }
    },
    {
      id: 'refresh',
      label: 'Refresh Data',
      icon: RefreshCw,
      variant: 'default',
      onClick: async () => {
        await new Promise((r) => setTimeout(r, 500));
        window.location.reload();
      }
    },
    {
      id: 'config',
      label: 'Config',
      icon: Settings,
      variant: 'default',
      onClick: async () => {
        console.log('Opening config...');
      }
    }
  ];

  const variantStyles = {
    default: 'bg-gray-800 hover:bg-gray-700 text-gray-300',
    primary: 'bg-orange-600 hover:bg-orange-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>

      <div className="flex flex-wrap gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const isLoading = loading === action.id;
          const wasSuccessful = lastAction?.id === action.id && lastAction.success;
          const wasFailed = lastAction?.id === action.id && !lastAction.success;

          return (
            <button
              key={action.id}
              onClick={() => executeAction(action)}
              disabled={loading !== null}
              className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                variantStyles[action.variant]
              } ${loading !== null && loading !== action.id ? 'opacity-50 cursor-not-allowed' : ''} ${
                wasSuccessful ? 'ring-2 ring-green-500' : ''
              } ${wasFailed ? 'ring-2 ring-red-500' : ''}`}
            >
              {isLoading ? (
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

      {lastAction && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            lastAction.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}
        >
          {lastAction.success ? 'Action completed successfully!' : 'Action failed. Please try again.'}
        </div>
      )}
    </div>
  );
}
