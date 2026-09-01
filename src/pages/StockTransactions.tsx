import { useState, useMemo } from 'react';
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, 
  Button, Modal, Input, Select, Badge, PageHeader, ErrorState, Skeleton, Pagination 
} from '@/components';
import { formatDate } from '@/lib';

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

  const { data: pageData, isLoading, isError, error } = useQuery({
    queryKey: ['stock-transactions', page, filters],
    queryFn: () => getStockTransactions({ page, size, ...filters }),
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
    { label: 'Adjustment In', value: 'ADJUSTMENT_IN' },
    { label: 'Adjustment Out', value: 'ADJUSTMENT_OUT' },
    { label: 'Purchase In', value: 'PURCHASE_IN' },
    { label: 'Sale Out', value: 'SALE_OUT' },
    { label: 'Sale Return In', value: 'SALE_RETURN_IN' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Transactions"
        action={
          <Button onClick={handleOpenAdjModal} className="gap-2">
            <Plus className="h-4 w-4" /> New Adjustment
          </Button>
        }
      />

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <Select 
            label="Filter by Stock"
            value={filters.stockId}
            onChange={(e) => { setFilters(f => ({ ...f, stockId: e.target.value })); setPage(0); }}
            options={[{ label: 'All Stocks', value: '' }, ...stockOptions]}
          />
        </div>
        <div className="flex-1 w-full">
          <Select 
            label="Transaction Type"
            value={filters.type}
            onChange={(e) => { setFilters(f => ({ ...f, type: e.target.value })); setPage(0); }}
            options={typeOptions}
          />
        </div>
        <div className="flex-1 w-full">
          <Input 
            label="Reference Number"
            placeholder="Search by Ref #..."
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead>Raw Material</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData?.content.map((t) => {
                const isAuto = ['PURCHASE_IN', 'SALE_OUT', 'SALE_RETURN_IN'].includes(t.transactionType);
                const isIn = t.transactionType.endsWith('_IN');
                
                return (
                  <TableRow key={t.publicId}>
                    <TableCell className="text-gray-500 whitespace-nowrap">
                      {formatDate(t.transactionDate)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.referenceNumber}
                      {isAuto && (
                        <span className="ml-2 inline-flex" title="System Generated">
                          <Info className="h-3 w-3 text-blue-400" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.rawMaterial}</TableCell>
                    <TableCell>
                      <Badge variant={isAuto ? 'info' : 'default'} className="text-[10px]">
                        {t.transactionType.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                      {isIn ? '+' : '-'}{t.quantity} <span className="text-xs text-gray-500">{t.unit}</span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[200px] truncate" title={t.remarks}>
                      {t.remarks || '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
              {(!pageData || pageData.content.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No transactions found matching the criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {pageData && pageData.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
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
      <Modal isOpen={isAdjModalOpen} onClose={handleCloseAdjModal} title="New Stock Adjustment">
        <form onSubmit={handleSubmit((d) => adjMutation.mutate(d))} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Raw Material *</label>
            <Controller
              name="stockPublicId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={[{ label: 'Select a stock item...', value: '' }, ...stockOptions]}
                  error={errors.stockPublicId?.message}
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type *</label>
            <select 
              {...register('transactionType')} 
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="ADJUSTMENT_IN">Add Stock (In)</option>
              <option value="ADJUSTMENT_OUT">Remove Stock (Out)</option>
            </select>
          </div>

          <Input 
            label="Quantity *"
            type="number" step="0.01" 
            {...register('quantity', { valueAsNumber: true })} 
            error={errors.quantity?.message} 
          />

          <Input 
            label="Remarks / Reason"
            {...register('remarks')} 
            error={errors.remarks?.message} 
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseAdjModal}>Cancel</Button>
            <Button type="submit" isLoading={adjMutation.isPending}>
              Submit Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
