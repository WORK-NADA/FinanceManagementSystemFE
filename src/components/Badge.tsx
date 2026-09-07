import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'blue' | 'purple' | 'indigo';
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-100 dark:bg-[#182232] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-[#26354A]',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
  info: 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-400 border-sky-200 dark:border-sky-800/50',
  blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  purple: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
  indigo: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50',
};

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors focus:outline-none',
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
