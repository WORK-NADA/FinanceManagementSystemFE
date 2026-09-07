import { forwardRef, useRef, type InputHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { selectInputText } from '@/lib/fieldAutoSelect';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
  autoSelectOnFocus?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, wrapperClassName, className, id, autoSelectOnFocus = true, onFocus, onMouseUp, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const justFocusedRef = useRef(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoSelectOnFocus && !props.readOnly && !props.disabled) {
        if (e.target.type !== 'date' && e.target.type !== 'checkbox' && e.target.type !== 'radio' && e.target.type !== 'file') {
          justFocusedRef.current = true;
          selectInputText(e.currentTarget);
        }
      }
      onFocus?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
      if (justFocusedRef.current) {
        justFocusedRef.current = false;
        selectInputText(e.currentTarget);
      }
      onMouseUp?.(e);
    };

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-sub)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3 text-[var(--color-text-muted)]">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'form-control',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'error',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            onFocus={handleFocus}
            onMouseUp={handleMouseUp}
            {...props}
          />
          {rightIcon && (
            <span className="pointer-events-none absolute right-3 text-[var(--color-text-muted)]">
              {rightIcon}
            </span>
          )}
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--color-text-muted)]">{hint}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-[var(--color-danger)] flex items-center gap-1.5 mt-1 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
