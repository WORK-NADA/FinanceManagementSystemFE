import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Info } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getStockTransactions, createStockAdjustment, getActiveStocks 
} from '../api/stock';
import { 
  stockTransactionSchema,
  type RequestStockTransactionDTO
} from '../types/stock';
import { 
  Button, Modal, Input, Select, Badge, PageHeader, ErrorState, Skeleton, Pagination, CopyableSequence
} from '@/components';
import { formatDate } from '@/lib';

const MOVEMENT_TYPE_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'blue' | 'purple' | 'indigo' }
> = {
  PURCHASE_IN: { label: 'Purchase In', variant: 'info' },
  SALE_OUT: { label: 'Sale Out', variant: 'blue' },
  CANCEL_PURCHASE_OUT: { label: 'Cancel Purchase', variant: 'warning' },
  CANCEL_SALE_IN: { label: 'Cancel Sale', variant: 'success' },
  ADJUSTMENT_IN: { label: 'Adjustment In', variant: 'default' },
  ADJUSTMENT_OUT: { label: 'Adjustment Out', variant: 'default' },
};

export default function StockTransactions() {
  const queryClient = useQueryClient();
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  
  // Filters state
  const [page, setPage] = useState(0);
  const size = 15;
  const [filters, setFilters] = useState({
    stockId: '',
    type: '',
    referenceNumber: '',
  });

  // Debounce the reference number text input (300 ms) to avoid firing
  // one API request per keystroke.
  const [debouncedRef, setDebouncedRef] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedRef(filters.referenceNumber), 300);
    return () => clearTimeout(timer);
  }, [filters.referenceNumber]);

  // The query uses debouncedRef, not the raw filter value.
  const queryFilters = { stockId: filters.stockId, type: filters.type, referenceNumber: debouncedRef };

  const { data: pageData, isLoading, isError, error } = useQuery({
    queryKey: ['stock-transactions', page, queryFilters],
    queryFn: () => getStockTransactions({ page, size, ...queryFilters }),
  });

  const { data: activeStocks } = useQuery({
    queryKey: ['stocks', 'active'],
    queryFn: getActiveStocks,
  });

  const { 
    register, 
    handleSubmit, 
    reset, 
    control,
    formState: { errors } 
  } = useForm<RequestStockTransactionDTO>({
    resolver: zodResolver(stockTransactionSchema),
    defaultValues: { transactionType: 'ADJUSTMENT_IN', quantity: 0, remarks: '' }
  });

  const adjMutation = useMutation({
    mutationFn: createStockAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      handleCloseAdjModal();
    }
  });

  const handleOpenAdjModal = () => {
    reset({ transactionType: 'ADJUSTMENT_IN', quantity: 0, remarks: '' });
    setIsAdjModalOpen(true);
  };

  const handleCloseAdjModal = () => {
    setIsAdjModalOpen(false);
    reset();
  };

  const stockOptions = useMemo(() => {
    return activeStocks?.map(s => ({ label: s.rawMaterial, value: s.publicId })) || [];
  }, [activeStocks]);

  const typeOptions = [
    { label: 'All Types', value: '' },
    { label: 'Purchase In', value: 'PURCHASE_IN' },
    { label: 'Cancel Purchase', value: 'CANCEL_PURCHASE_OUT' },
    { label: 'Sale Out', value: 'SALE_OUT' },
    { label: 'Cancel Sale', value: 'CANCEL_SALE_IN' },
    { label: 'Adjustment In', value: 'ADJUSTMENT_IN' },
    { label: 'Adjustment Out', value: 'ADJUSTMENT_OUT' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock In / Out History"
        action={
          <Button onClick={handleOpenAdjModal} className="gap-2">
            <Plus className="h-4 w-4" /> Manual Stock Adjustment
          </Button>
        }
      />

      <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Select 
            label="Item / Material"
            value={filters.stockId}
            onChange={(e) => { setFilters(f => ({ ...f, stockId: e.target.value })); setPage(0); }}
            options={[{ label: 'All Items', value: '' }, ...stockOptions]}
          />
        </div>
        <div className="flex-1 w-full">
          <Select 
            label="Movement Type"
            value={filters.type}
            onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(0); }}
            options={typeOptions}
          />
        </div>
        <div className="flex-1 w-full">
          <Input 
            label="Bill / Invoice / Ref #"
            placeholder="Search by reference number..."
            value={filters.referenceNumber}
            onChange={(e) => { setFilters(f => ({ ...f, referenceNumber: e.target.value })); setPage(0); }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load stock transactions'} />
      ) : (
        <div className="w-full space-y-4">
          <div className="space-y-3">
            {/* Column Header Guide Bar */}
          <div className="hidden md:grid grid-cols-[100px_minmax(150px,1.2fr)_minmax(120px,1.5fr)_110px_minmax(90px,1fr)_minmax(100px,1.3fr)] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Date</div>
            <div className="min-w-0">Reference / Doc #</div>
            <div className="min-w-0">Item / Material Name</div>
            <div className="min-w-0">Movement Type</div>
            <div className="min-w-0 text-right">Quantity In / Out</div>
            <div className="min-w-0">Reason / Notes</div>
          </div>

          {/* List of Floating Cards */}
          {pageData?.content.map((t) => {
            const isAuto = ['PURCHASE_IN', 'SALE_OUT', 'CANCEL_PURCHASE_OUT', 'CANCEL_SALE_IN'].includes(t.transactionType);
            const isIn = t.transactionType.endsWith('_IN');
            const meta = MOVEMENT_TYPE_CONFIG[t.transactionType] || {
              label: t.transactionType.replace(/_/g, ' '),
              variant: isAuto ? ('info' as const) : ('default' as const),
            };

            return (
              <div
                key={t.publicId}
                className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all grid grid-cols-1 md:grid-cols-[100px_minmax(150px,1.2fr)_minmax(120px,1.5fr)_110px_minmax(90px,1fr)_minmax(100px,1.3fr)] items-center gap-3 px-5 py-3.5 w-full"
              >
                <div className="min-w-0 text-sm font-medium text-gray-600 dark:text-slate-300 whitespace-nowrap">
                  {formatDate(t.transactionDate)}
                </div>
                  <div className="min-w-0">
                    <CopyableSequence value={t.referenceNumber}>
                      <span className="inline-flex items-center gap-1.5 dark:text-slate-300">
                        {t.referenceNumber}
                        {isAuto && (
                          <span title="System Generated">
                            <Info className="h-3 w-3 text-blue-500 dark:text-sky-400" />
                          </span>
                        )}
                      </span>
                    </CopyableSequence>
                  </div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={t.rawMaterial}>
                    {t.rawMaterial}
                  </div>
                  <div>
                    <Badge variant={meta.variant} className="text-[10px]">
                      {meta.label}
                    </Badge>
                  </div>
                  <div className={`text-right text-sm font-bold tabular-nums ${isIn ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {isIn ? '+' : '-'}{t.quantity} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{t.unit}</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400 truncate" title={t.remarks}>
                    {t.remarks || '—'}
                  </div>
                </div>
              );
            })}

            {(!pageData || pageData.content.length === 0) && (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
                No transactions found matching the criteria.
              </div>
            )}
          </div>

          {pageData && pageData.totalPages > 1 && (
            <div className="mt-4 p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex justify-center">
              <Pagination
                currentPage={pageData.number}
                totalPages={pageData.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* New Adjustment Modal */}
      <Modal isOpen={isAdjModalOpen} onClose={handleCloseAdjModal} title="Manual Stock Adjustment">
        <form onSubmit={handleSubmit((d) => adjMutation.mutate(d))} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Select Item / Material *</label>
            <Controller
              name="stockPublicId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={[{ label: 'Choose an item...', value: '' }, ...stockOptions]}
                  error={errors.stockPublicId?.message}
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Stock Adjustment Type *</label>
            <select 
              {...register('transactionType')} 
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="ADJUSTMENT_IN">Add Stock (+ In)</option>
              <option value="ADJUSTMENT_OUT">Reduce Stock (- Out)</option>
            </select>
          </div>

          <Input 
            label="Quantity *"
            type="number" step="0.01" 
            {...register('quantity', { valueAsNumber: true })} 
            error={errors.quantity?.message} 
          />

          <Input 
            label="Reason / Notes for Adjustment"
            placeholder="e.g. Physical inventory count correction, damaged goods"
            {...register('remarks')} 
            error={errors.remarks?.message} 
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button type="button" variant="outline" onClick={handleCloseAdjModal}>Cancel</Button>
            <Button type="submit" isLoading={adjMutation.isPending}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
