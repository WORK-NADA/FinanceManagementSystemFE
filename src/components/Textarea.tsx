import { forwardRef, useRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { selectInputText } from '@/lib/fieldAutoSelect';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  autoSelectOnFocus?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, wrapperClassName, className, id, autoSelectOnFocus = true, onFocus, onMouseUp, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const justFocusedRef = useRef(false);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      if (autoSelectOnFocus && !props.readOnly && !props.disabled) {
        justFocusedRef.current = true;
        selectInputText(e.currentTarget);
      }
      onFocus?.(e);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (justFocusedRef.current) {
        justFocusedRef.current = false;
        selectInputText(e.currentTarget);
      }
      onMouseUp?.(e);
    };

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[var(--color-text-sub)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={3}
          className={cn(
            'form-control h-auto resize-y py-2',
            error && 'error',
            className
          )}
          aria-invalid={!!error}
          onFocus={handleFocus}
          onMouseUp={handleMouseUp}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>}
        {error && <p role="alert" className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
