import { type ReactNode } from 'react';
import { Card, CardContent } from './Card';
import { cn } from '@/lib/cn';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function KpiCard({ title, value, icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-sub)] truncate">
              {title}
            </p>
            <p className="mt-2 text-3xl font-serif font-semibold text-[var(--color-text-main)]">
              {value}
            </p>
          </div>
          {icon && (
            <div className="p-3 bg-gray-50 dark:bg-slate-800/80 rounded-xl text-[var(--color-primary)] dark:text-emerald-400">
              {icon}
            </div>
          )}
        </div>
        
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span
              className={cn(
                "font-medium",
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                trend.isPositive === undefined && "text-gray-600 dark:text-slate-400"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="ml-2 text-[var(--color-text-muted)] truncate">
              {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
