import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from '../store/toastStore';

export interface CopyButtonProps {
  value?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showToast?: boolean;
  title?: string;
  className?: string;
}

export function CopyButton({
  value,
  size = 'sm',
  showToast = true,
  title = 'Copy sequence number',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  if (!value || value === '—' || value === '-') {
    return null;
  }

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
  };

  const buttonPaddings = {
    xs: 'p-0.5',
    sm: 'p-1',
    md: 'p-1.5',
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      if (showToast) {
        toast.success(`Copied ${value} to clipboard`);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : title}
        aria-label={copied ? 'Copied' : title}
        className={`inline-flex items-center justify-center rounded transition-all duration-150 print:hidden cursor-pointer shrink-0 ${buttonPaddings[size]} ${
          copied
            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700'
            : 'text-gray-400 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-[#1E293B] active:scale-95'
        } ${className}`}
      >
        {copied ? (
          <Check className={`${iconSizes[size]} text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-200`} />
        ) : (
          <Copy className={`${iconSizes[size]} transition-colors`} />
        )}
      </button>

      {/* Floating micro-pill indicator on copied */}
      {copied && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-medium rounded shadow-md pointer-events-none whitespace-nowrap z-30 animate-in fade-in zoom-in-90 duration-150">
          Copied!
        </span>
      )}
    </div>
  );
}

export interface CopyableSequenceProps {
  value?: string | null;
  children?: React.ReactNode;
  className?: string;
  badgeClassName?: string;
  plainText?: boolean;
  size?: 'xs' | 'sm' | 'md';
  showToast?: boolean;
  title?: string;
}

export function CopyableSequence({
  value,
  children,
  className = '',
  badgeClassName,
  plainText = false,
  size = 'sm',
  showToast = true,
  title = 'Copy sequence number',
}: CopyableSequenceProps) {
  if (!value || value === '—' || value === '-') {
    return <span className={badgeClassName || 'text-gray-400 font-mono text-xs'}>—</span>;
  }

  const defaultBadgeClass =
    'font-mono text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-[#182232] px-2 py-0.5 rounded border border-slate-200/90 dark:border-[#26354A] inline-flex items-center transition-all duration-150 group-hover/seq:border-emerald-400/60 group-hover/seq:bg-emerald-50/50 dark:group-hover/seq:bg-emerald-950/30 shadow-2xs';

  return (
    <div className={`inline-flex items-center gap-1.5 max-w-full min-w-0 group/seq select-none ${className}`}>
      {plainText ? (
        <span
          className={`truncate min-w-0 transition-colors duration-150 group-hover/seq:text-emerald-700 dark:group-hover/seq:text-emerald-400 ${badgeClassName || 'font-mono text-xs font-medium text-gray-800 dark:text-slate-200'}`}
          title={typeof value === 'string' ? value : undefined}
        >
          {children || value}
        </span>
      ) : (
        <span
          className={`truncate min-w-0 ${badgeClassName || defaultBadgeClass}`}
          title={typeof value === 'string' ? value : undefined}
        >
          {children || value}
        </span>
      )}
      <CopyButton
        value={value}
        size={size}
        showToast={showToast}
        title={title}
        className="shrink-0 opacity-70 group-hover/seq:opacity-100 group-hover/seq:scale-110 transition-all duration-200"
      />
    </div>
  );
}
