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
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-0"
      style={{ zIndex: zIndex ?? 50 }}
    >
      <div 
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div 
        ref={modalRef}
        className={cn(
          "relative z-10 w-full transform overflow-hidden rounded-2xl bg-white dark:bg-[#171F2C] text-left align-middle shadow-2xl border border-gray-100 dark:border-[#283548] transition-all sm:my-8 sm:w-full",
          !hasCustomMaxWidth && "max-w-lg sm:max-w-lg",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F2837] bg-gray-50/50 dark:bg-[#111722] px-6 py-4">
          <h3 className="text-lg font-serif font-semibold leading-6 text-gray-900 dark:text-slate-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#1F2837] hover:text-gray-500 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F7B5C] cursor-pointer"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
