import React from 'react';
import { cn } from '../utils/cn';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: string | number;
}

export interface ChartWidgetProps {
  type: 'line' | 'bar' | 'area' | 'pie';
  data: ChartDataPoint[];
  title: string;
  subtitle?: string;
  dataKey?: string;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const DEFAULT_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

export function ChartWidget({
  type,
  data,
  title,
  subtitle,
  dataKey = 'value',
  colors = DEFAULT_COLORS,
  height = 200,
  showLegend = false,
  className
}: ChartWidgetProps) {
  const tooltipStyle = {
    backgroundColor: '#1f2937',
    border: 'none',
    borderRadius: '8px',
    color: '#fff'
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], strokeWidth: 0 }}
              activeDot={{ r: 6, fill: colors[0] }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={data}>
            <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend />}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('bg-gray-900 rounded-lg p-4', className)}>
      <div className="mb-4">
        <h3 className="text-white font-semibold">{title}</h3>
        {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
