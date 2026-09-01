import { forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { InputProps } from './Input';

/**
 * DatePicker — a styled wrapper around <input type="date">.
 * Accepts the same props as Input.
 */
export const DatePicker = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, wrapperClassName, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-sub)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            ref={ref}
            id={inputId}
            type="date"
            className={cn(
              'form-control pl-9',
              error && 'error',
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
        {error && <p role="alert" className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';
