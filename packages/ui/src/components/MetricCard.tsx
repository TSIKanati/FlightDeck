import React from 'react';
import { cn } from '../utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period?: string;
  };
  status?: 'healthy' | 'warning' | 'critical';
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  change,
  status,
  icon,
  subtitle,
  className,
  onClick
}: MetricCardProps) {
  const statusColors = {
    healthy: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500'
  };

  const changeColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  };

  const ChangeIcon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus
  };

  return (
    <div
      className={cn(
        'bg-gray-900 rounded-lg p-4 border-l-4 transition-all duration-200',
        status ? statusColors[status] : 'border-l-orange-500',
        onClick && 'cursor-pointer hover:bg-gray-800',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="text-orange-500 ml-4">{icon}</div>
        )}
      </div>

      {change && (
        <div className={cn('flex items-center mt-3', changeColors[change.direction])}>
          {React.createElement(ChangeIcon[change.direction], { className: 'w-4 h-4 mr-1' })}
          <span className="text-sm font-medium">
            {change.direction === 'up' ? '+' : change.direction === 'down' ? '' : ''}
            {change.value}%
          </span>
          {change.period && (
            <span className="text-gray-500 text-sm ml-1">{change.period}</span>
          )}
        </div>
      )}
    </div>
  );
}
