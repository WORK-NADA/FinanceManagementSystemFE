import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
}

export function Modal({ isOpen, onClose, title, children, className, zIndex }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasCustomMaxWidth = className && /max-w-/.test(className);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
      style={{ zIndex: zIndex ?? 50 }}
    >
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div 
        ref={modalRef}
        className={cn(
          "relative z-10 w-full transform overflow-hidden rounded-2xl bg-white dark:bg-[#171F2C] text-left align-middle shadow-2xl border border-gray-100 dark:border-[#283548] transition-all my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col sm:max-h-[calc(100dvh-3rem)]",
          !hasCustomMaxWidth && "max-w-lg",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F2837] bg-gray-50/50 dark:bg-[#111722] px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <h3 className="text-base sm:text-lg font-serif font-semibold leading-6 text-gray-900 dark:text-slate-100 truncate pr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#1F2837] hover:text-gray-500 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F7B5C] cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-6 overflow-y-auto max-h-[calc(100dvh-6.5rem)] touch-pan-y">
          {children}
        </div>
      </div>
    </div>
  );
}
