import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { cn } from '@/lib/cn';

export interface ThemeToggleProps {
  /** Optional custom class name */
  className?: string;
  /** Whether to show text label beside icon */
  showLabel?: boolean;
  /** Visual variant */
  variant?: 'button' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  showLabel = false,
  variant = 'button',
}) => {
  const { theme, toggleTheme, setTheme } = useThemeStore();
  const isDark = theme === 'dark';

  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'inline-flex items-center p-1 rounded-xl bg-gray-100 dark:bg-[#0E131C] border border-gray-200/80 dark:border-[#1F2837] transition-colors',
          className
        )}
        role="group"
        aria-label="Select color theme"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
            !isDark
              ? 'bg-white text-gray-900 shadow-xs border border-gray-200/60 font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
          aria-pressed={!isDark}
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
            isDark
              ? 'bg-[#141A24] text-emerald-400 shadow-xs border border-[#1F2837] font-semibold'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          )}
          aria-pressed={isDark}
        >
          <Moon className="h-3.5 w-3.5 text-emerald-400" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      id="theme-toggle-button"
      className={cn(
        'group relative flex items-center justify-center p-2 rounded-xl transition-all duration-200 cursor-pointer select-none',
        'bg-white/80 dark:bg-[#141A24] hover:bg-gray-100 dark:hover:bg-[#1A2331]',
        'border border-gray-200/90 dark:border-[#1F2837] shadow-xs',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500/50',
        className
      )}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-pressed={isDark}
    >
      <div className="relative flex items-center justify-center w-5 h-5">
        {/* Sun Icon for Light Mode */}
        <Sun
          className={cn(
            'h-4.5 w-4.5 text-amber-500 transition-all duration-300 transform',
            isDark
              ? 'opacity-0 rotate-90 scale-50 pointer-events-none absolute'
              : 'opacity-100 rotate-0 scale-100'
          )}
          aria-hidden="true"
        />

        {/* Moon Icon for Dark Mode */}
        <Moon
          className={cn(
            'h-4.5 w-4.5 text-emerald-400 transition-all duration-300 transform',
            isDark
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50 pointer-events-none absolute'
          )}
          aria-hidden="true"
        />
      </div>

      {showLabel && (
        <span className="ml-2 text-xs font-medium text-gray-700 dark:text-slate-300">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
