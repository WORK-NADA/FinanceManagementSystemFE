import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3 w-full", className)}>
      {/* Mobile view (< sm) */}
      <div className="flex sm:hidden items-center justify-between w-full gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1 min-h-[38px] px-3 text-xs"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Prev</span>
        </Button>

        <p className="text-xs text-gray-700 dark:text-slate-300 font-medium">
          <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatNumber(currentPage + 1)}</span>
          <span className="mx-1 text-gray-400">/</span>
          <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatNumber(totalPages)}</span>
        </p>

        <Button
          variant="outline"
          size="sm"
          className="gap-1 min-h-[38px] px-3 text-xs"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop view (sm+) */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Page <span className="font-medium text-gray-900 dark:text-white tabular-nums">{formatNumber(currentPage + 1)}</span> of{' '}
            <span className="font-medium text-gray-900 dark:text-white tabular-nums">{formatNumber(totalPages)}</span>
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <Button
              variant="outline"
              size="icon"
              className="rounded-r-none min-h-[36px] min-w-[36px]"
              disabled={currentPage === 0}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-l-none min-h-[36px] min-w-[36px]"
              disabled={currentPage >= totalPages - 1}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
