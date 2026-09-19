import React from 'react';
import { Code2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DeveloperSignatureProps {
  className?: string;
  variant?: 'badge' | 'subtle' | 'card';
  showIcon?: boolean;
}

/**
 * Enterprise developer attribution signature for 'व्यापार'
 * "Crafted & Developed by Urvi Gondaliya & Harsh Nada"
 */
export const DeveloperSignature: React.FC<DeveloperSignatureProps> = ({
  className,
  variant = 'badge',
  showIcon = true,
}) => {
  if (variant === 'subtle') {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 select-none",
          className
        )}
      >
        {showIcon && (
          <Code2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        )}
        <span>Crafted &amp; Developed by</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          Urvi Gondaliya
        </span>
        <span className="text-slate-400 dark:text-slate-500 font-normal">&amp;</span>
        <span className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          Harsh Nada
        </span>
      </div>
    );
  }

  // Default: Premium distinctive product signature pill badge
  return (
    <div
      className={cn(
        "group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full",
        "bg-white/85 dark:bg-[#121824]/90 backdrop-blur-xs",
        "border border-slate-200/90 dark:border-slate-800/90",
        "shadow-2xs hover:border-emerald-500/40 dark:hover:border-emerald-500/40",
        "transition-all duration-200 select-none",
        className
      )}
    >
      {showIcon && (
        <Code2
          className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform duration-200"
          aria-hidden="true"
        />
      )}
      
      <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-normal tracking-normal whitespace-nowrap">
        Crafted &amp; Developed by
      </span>

      <span className="h-3 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5 shrink-0" aria-hidden="true" />

      <div className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold whitespace-nowrap">
        <span className="text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
          Urvi Gondaliya
        </span>
        <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px] sm:text-[11px]">&amp;</span>
        <span className="text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
          Harsh Nada
        </span>
      </div>
    </div>
  );
};

export default DeveloperSignature;
