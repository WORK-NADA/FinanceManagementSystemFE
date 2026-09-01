import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:     'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-sm focus-visible:ring-[var(--color-primary)]',
  secondary:   'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm focus-visible:ring-[var(--color-accent)]',
  outline:     'border border-[var(--color-border)] bg-transparent hover:bg-gray-50 text-[var(--color-text-sub)] focus-visible:ring-[var(--color-primary)]',
  ghost:       'bg-transparent hover:bg-gray-100 text-[var(--color-text-sub)] focus-visible:ring-[var(--color-primary)]',
  destructive: 'bg-[var(--color-danger)] text-white hover:bg-red-600 shadow-sm focus-visible:ring-red-500',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm:   'h-8 px-3 text-xs',
  md:   'h-10 px-4 text-sm',
  lg:   'h-11 px-6 text-sm',
  icon: 'h-9 w-9 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        'cursor-pointer select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
