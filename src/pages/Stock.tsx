import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, AlertTriangle, Search, Boxes, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getStocks, searchStock, createStock, updateStock
} from '../api/stock';
import { 
  stockSchema,
  type RequestStockDTO, type ResponseStockDTO
} from '../types/stock';
import { Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState } from '@/components';
import { formatNumber } from '@/lib';
import { toast } from '../store/toastStore';

export default function Stock() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingStock, setEditingStock] = useState<ResponseStockDTO | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom debounce logic since we can't be sure useDebounce exists
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: rawStocks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['stocks', debouncedSearch],
    queryFn: () => debouncedSearch ? searchStock(debouncedSearch) : getStocks(),
  });

  const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RequestStockDTO>({
    resolver: zodResolver(stockSchema),
    defaultValues: { unit: 'KG', minimumStockLevel: 0 }
  });

  const mutation = useMutation({
    mutationFn: (data: RequestStockDTO) => 
      editingStock ? updateStock(editingStock.publicId, data) : createStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingStock ? 'Stock item updated.' : 'Stock item added.');
    },
    onError: (error: any) => {
      if (error.code === 'VALIDATION_ERROR' && error.fieldErrors) {
        Object.keys(error.fieldErrors).forEach((key) => {
          setError(key as any, { type: 'server', message: error.fieldErrors[key] });
        });
      } else {
        toast.error(error?.message || 'Failed to save stock item.');
      }
    }
  });

  const handleOpenModal = (stock?: ResponseStockDTO) => {
    if (stock) {
      setEditingStock(stock);
      reset(stock);
    } else {
      setEditingStock(null);
      reset({ unit: 'KG', minimumStockLevel: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingStock(null);
  };

  const filteredStocks = useMemo(() => {
    const list = rawStocks ?? [];
    if (!searchTerm.trim()) return list;
    const term = searchTerm.trim().toLowerCase();
    return list.filter((s) => {
      // 1. Raw Material Name matching (case-insensitive substring)
      const nameMatch = s.rawMaterial?.toLowerCase().includes(term);

      // 2. Current Quantity matching (numeric substring or formatted with unit)
      const qtyStr = s.currentQuantity != null ? String(s.currentQuantity).toLowerCase() : '';
      const qtyWithUnit = `${qtyStr} ${s.unit ?? ''}`.toLowerCase();
      const qtyMatch = qtyStr.includes(term) || qtyWithUnit.includes(term);

      return Boolean(nameMatch || qtyMatch);
    });
  }, [rawStocks, searchTerm]);

  const { ref: stockMinLevelRegisterRef, ...stockMinLevelRegisterProps } = register('minimumStockLevel', { 
    setValueAs: (v) => (v === '' || isNaN(Number(v)) ? 0 : Number(v)) 
  });

  const totalItems = rawStocks?.length ?? 0;
  const lowStockCount = rawStocks?.filter(s => s.isLowStock).length ?? 0;
  const healthyCount = totalItems - lowStockCount;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock & Inventory"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Stock Item
          </Button>
        }
      />

      {/* KPI Ribbon (Ledger Benchmark) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Tracked Items</span>
            <Boxes className="h-4 w-4 text-blue-500 dark:text-sky-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-blue-700 dark:text-sky-400 mt-1 tabular-nums">
            {formatNumber(totalItems)} Items
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Total items tracked</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sufficient Stock</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {formatNumber(healthyCount)} Items
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Above minimum safe quantity</span>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs transition-all ${
          lowStockCount > 0
            ? 'bg-rose-50/50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-900/40'
            : 'bg-white dark:bg-[#141A24] border-gray-200/90 dark:border-[#1F2837]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              lowStockCount > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'
            }`}>Low Stock Warnings</span>
            <ShieldAlert className={`h-4 w-4 ${
              lowStockCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
            }`} />
          </div>
          <p className={`text-xl sm:text-2xl font-serif font-bold mt-1 tabular-nums ${
            lowStockCount > 0 ? 'text-rose-800 dark:text-rose-200' : 'text-slate-800 dark:text-slate-100'
          }`}>
            {formatNumber(lowStockCount)} {lowStockCount === 1 ? 'Item' : 'Items'}
          </p>
          <span className={`text-[11px] ${
            lowStockCount > 0 ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-slate-400 dark:text-slate-500'
          }`}>
            {lowStockCount > 0 ? 'Reorder recommended soon' : 'All stock levels healthy'}
          </span>
        </div>
      </div>

      {/* Search / Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
        <div className="text-sm font-medium text-gray-500 dark:text-slate-400">
          Showing: <strong className="text-gray-900 dark:text-slate-100 font-semibold tabular-nums">{formatNumber(filteredStocks.length)}</strong> items
        </div>

        <div className="w-full sm:w-80">
          <Input 
            placeholder="Search by item name or quantity..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-gray-400 dark:text-slate-400" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load stocks'} onRetry={() => refetch()} />
      ) : filteredStocks.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'No items match your search' : 'No stock items yet'}
          description={searchTerm ? 'Try a different item name or quantity.' : 'Add your first item to track inventory.'}
          action={
            !searchTerm && (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add Stock Item
              </Button>
            )
          }
        />
      ) : (
        <div className="w-full space-y-3">
          {/* Column Header Guide Bar */}
          <div className="hidden md:grid grid-cols-[minmax(140px,2fr)_minmax(120px,1.2fr)_minmax(100px,1fr)_80px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Item / Material Name</div>
            <div className="min-w-0">Current Quantity</div>
            <div className="min-w-0">Minimum Safe Level</div>
            <div className="min-w-0 text-right pr-2">Actions</div>
          </div>

          {/* List of Floating Cards */}
          {filteredStocks.map((s) => (
            <div
              key={s.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all w-full overflow-hidden"
            >
              {/* Desktop View (md:grid) */}
              <div className="hidden md:grid grid-cols-[minmax(140px,2fr)_minmax(120px,1.2fr)_minmax(100px,1fr)_80px] items-center gap-3 px-5 py-3.5 w-full">
                <div className="min-w-0 font-semibold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2 truncate">
                  <span className="truncate">{s.rawMaterial}</span>
                  {s.isLowStock && (
                    <Badge variant="danger" className="gap-1 text-[10px] shrink-0">
                      <AlertTriangle className="h-3 w-3" /> Low Stock
                    </Badge>
                  )}
                </div>
                <div className="text-sm">
                  <span className={`font-bold tabular-nums ${s.isLowStock ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{formatNumber(s.currentQuantity)}</span>{' '}
                  <span className="text-gray-500 dark:text-slate-400 text-xs">{s.unit}</span>
                </div>
                <div className="text-sm">
                  <span className="tabular-nums font-medium text-gray-700 dark:text-slate-300">{formatNumber(s.minimumStockLevel)}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    onClick={() => handleOpenModal(s)}
                    title="Edit Item"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Mobile View (md:hidden) */}
              <div className="md:hidden p-3.5 space-y-2.5 w-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 font-semibold text-sm text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <span className="truncate">{s.rawMaterial}</span>
                    {s.isLowStock && (
                      <Badge variant="danger" className="gap-1 text-[10px] shrink-0">
                        <AlertTriangle className="h-3 w-3" /> Low Stock
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors shrink-0"
                    onClick={() => handleOpenModal(s)}
                    title="Edit Item"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-gray-50/80 dark:bg-[#0E141E] p-2.5 rounded-xl border border-gray-100 dark:border-[#1E293B] text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Current Stock</span>
                    <span className={`font-bold tabular-nums break-words ${s.isLowStock ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {formatNumber(s.currentQuantity)} <span className="text-gray-500 dark:text-slate-400 font-normal">{s.unit}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Min Safe Level</span>
                    <span className="tabular-nums font-semibold text-gray-700 dark:text-slate-300 break-words">
                      {formatNumber(s.minimumStockLevel)} <span className="text-gray-500 dark:text-slate-400 font-normal">{s.unit}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStock ? "Edit Stock Item" : "Add Stock Item"}>
        <form onSubmit={handleSubmit((d) => mutation.mutate(editingStock ? { ...d, unit: editingStock.unit } : d))} className="space-y-4">
          <Input label="Material / Item Name *" {...register('rawMaterial')} error={errors.rawMaterial?.message} />
          
          {editingStock ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement (Locked)</label>
              <input
                type="text"
                disabled
                value={editingStock.unit}
                className="flex h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 cursor-not-allowed select-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement *</label>
              <select 
                {...register('unit')} 
                className="flex h-10 w-full rounded-lg border border-gray-200/90 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="KG">Kilograms (KG)</option>
                <option value="G">Grams (G)</option>
                <option value="TON">Tons (TON)</option>
              </select>
            </div>
          )}

          <Input 
            label="Alert Level (Minimum Safe Quantity) *" 
            type="number" 
            step="0.01" 
            min="0" 
            placeholder="0"
            {...stockMinLevelRegisterProps}
            ref={stockMinLevelRegisterRef}
            onFocus={(e) => {
              e.target.select();
            }}
            onClick={(e) => {
              (e.target as HTMLInputElement).select();
            }}
            onKeyDown={(e) => {
              const input = e.currentTarget;
              if (input.value === '0' && e.key >= '0' && e.key <= '9') {
                if (input.selectionStart === input.selectionEnd) {
                  input.value = '';
                }
              }
            }}
            error={errors.minimumStockLevel?.message} 
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingStock ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
