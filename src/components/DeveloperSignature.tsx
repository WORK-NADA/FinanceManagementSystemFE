import React from 'react';
import { Code2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DeveloperSignatureProps {
  className?: string;
  variant?: 'badge' | 'subtle' | 'card' | 'on-dark';
  showIcon?: boolean;
  onDark?: boolean;
}

/**
 * Enterprise developer attribution signature for 'व्यापार'
 * "Crafted & Developed by Urvi Gondaliya & Harsh Nada"
 */
export const DeveloperSignature: React.FC<DeveloperSignatureProps> = ({
  className,
  variant = 'badge',
  showIcon = true,
  onDark = false,
}) => {
  const isOnDark = onDark || variant === 'on-dark' || Boolean(className && /(text-white|bg-white\/10|on-dark)/.test(className));

  if (variant === 'subtle') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs select-none",
          isOnDark ? "text-slate-300" : "text-slate-500 dark:text-slate-400",
          className
        )}
      >
        {showIcon && (
          <Code2
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isOnDark ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"
            )}
            aria-hidden="true"
          />
        )}
        <span>Crafted &amp; Developed by</span>
        <span
          className={cn(
            "font-semibold transition-colors",
            isOnDark
              ? "text-white hover:text-emerald-300"
              : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400"
          )}
        >
          Urvi Gondaliya
        </span>
        <span className={isOnDark ? "text-slate-400 font-normal" : "text-slate-400 dark:text-slate-500 font-normal"}>&amp;</span>
        <span
          className={cn(
            "font-semibold transition-colors",
            isOnDark
              ? "text-white hover:text-emerald-300"
              : "text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400"
          )}
        >
          Harsh Nada
        </span>
      </div>
    );
  }

  // Default: Premium distinctive product signature pill badge
  return (
    <div
      className={cn(
        "group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all duration-200 select-none",
        isOnDark
          ? "bg-white/10 border border-white/15 shadow-md hover:border-emerald-400/40 text-white"
          : "bg-white/85 dark:bg-[#121824]/90 backdrop-blur-xs border border-slate-200/90 dark:border-slate-800/90 shadow-2xs hover:border-emerald-500/40 dark:hover:border-emerald-500/40",
        className
      )}
    >
      {showIcon && (
        <Code2
          className={cn(
            "h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform duration-200",
            isOnDark ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400"
          )}
          aria-hidden="true"
        />
      )}
      
      <span
        className={cn(
          "text-[11px] sm:text-xs font-normal tracking-normal whitespace-nowrap",
          isOnDark ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
        )}
      >
        Crafted &amp; Developed by
      </span>

      <span
        className={cn(
          "h-3 w-px mx-0.5 shrink-0",
          isOnDark ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700/80"
        )}
        aria-hidden="true"
      />

      <div className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap">
        <span
          className={cn(
            "transition-colors",
            isOnDark
              ? "text-white group-hover:text-emerald-300"
              : "text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
          )}
        >
          Urvi Gondaliya
        </span>
        <span
          className={cn(
            "font-normal text-[10px] sm:text-[11px]",
            isOnDark ? "text-slate-300" : "text-slate-400 dark:text-slate-500"
          )}
        >
          &amp;
        </span>
        <span
          className={cn(
            "transition-colors",
            isOnDark
              ? "text-white group-hover:text-emerald-300"
              : "text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
          )}
        >
          Harsh Nada
        </span>
      </div>
    </div>
  );
};

export default DeveloperSignature;
