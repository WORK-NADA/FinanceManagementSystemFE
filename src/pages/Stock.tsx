import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getStocks, searchStock, createStock, updateStock, deactivateStock, activateStock, updateMinimumStockLevel
} from '../api/stock';
import { 
  stockSchema, minimumStockLevelSchema,
  type RequestStockDTO, type ResponseStockDTO, type RequestMinimumStockLevelDTO
} from '../types/stock';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Modal, Input, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState } from '@/components';
import { toast } from '../store/toastStore';

export default function Stock() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMinLevelModalOpen, setIsMinLevelModalOpen] = useState(false);
  
  const [editingStock, setEditingStock] = useState<ResponseStockDTO | null>(null);
  const [selectedStock, setSelectedStock] = useState<ResponseStockDTO | null>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom debounce logic since we can't be sure useDebounce exists
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: stocks, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['stocks', debouncedSearch],
    queryFn: () => debouncedSearch ? searchStock(debouncedSearch) : getStocks(),
  });

  const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RequestStockDTO>({
    resolver: zodResolver(stockSchema),
    defaultValues: { unit: 'KG', minimumStockLevel: 0 }
  });

  const { 
    register: registerMinLevel, 
    handleSubmit: handleMinLevelSubmit, 
    reset: resetMinLevel,
    formState: { errors: minLevelErrors } 
  } = useForm<RequestMinimumStockLevelDTO>({
    resolver: zodResolver(minimumStockLevelSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: RequestStockDTO) => 
      editingStock ? updateStock(editingStock.publicId, data) : createStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
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

  const minLevelMutation = useMutation({
    mutationFn: (data: RequestMinimumStockLevelDTO) => updateMinimumStockLevel(selectedStock!.publicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      handleCloseMinLevelModal();
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      isActive ? deactivateStock(id) : activateStock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['lowStock'] });
      toast.success('Stock status updated.');
    },
    onError: () => toast.error('Failed to update stock status.'),
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

  const handleOpenMinLevelModal = (stock: ResponseStockDTO) => {
    setSelectedStock(stock);
    resetMinLevel({ minimumStockLevel: stock.minimumStockLevel });
    setIsMinLevelModalOpen(true);
  };

  const handleCloseMinLevelModal = () => {
    setIsMinLevelModalOpen(false);
    resetMinLevel();
    setSelectedStock(null);
  };

  const filteredStocks = stocks?.filter(s => {
    if (activeTab === 'active') return s.isActive;
    if (activeTab === 'inactive') return !s.isActive;
    return true;
  }) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Master"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-1 bg-gray-100/50 p-1 rounded-lg">
          {(['all', 'active', 'inactive'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab 
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' 
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input 
            placeholder="Search raw material via API..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={5} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load stocks'} onRetry={() => refetch()} />
      ) : filteredStocks.length === 0 ? (
        <EmptyState
          title={searchTerm ? 'No items match your search' : 'No stock items yet'}
          description={searchTerm ? 'Try a different search term.' : 'Add your first stock item to track raw materials.'}
          action={
            !searchTerm && (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add First Item
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raw Material</TableHead>
                <TableHead>Current Quantity</TableHead>
                <TableHead>Min. Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStocks.map((s) => (
                <TableRow key={s.publicId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {s.rawMaterial}
                      {s.isLowStock && (
                        <Badge variant="danger" className="ml-2 gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-gray-900">{s.currentQuantity}</span> <span className="text-gray-500 text-xs ml-1">{s.unit}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{s.minimumStockLevel}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600" onClick={() => handleOpenMinLevelModal(s)} title="Update Min Level">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'default'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(s)}>
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={s.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                      onClick={() => toggleStatusMutation.mutate({ id: s.publicId, isActive: s.isActive })}
                    >
                      {s.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStock ? "Edit Stock Item" : "Add Stock Item"}>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <Input label="Raw Material Name *" {...register('rawMaterial')} error={errors.rawMaterial?.message} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
            <select 
              {...register('unit')} 
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="G">Grams (G)</option>
              <option value="KG">Kilograms (KG)</option>
              <option value="TON">Tons (TON)</option>
            </select>
          </div>

          <Input 
            label="Minimum Stock Level *" 
            type="number" step="0.01" 
            {...register('minimumStockLevel', { valueAsNumber: true })} 
            error={errors.minimumStockLevel?.message} 
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingStock ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Minimum Level Modal */}
      <Modal isOpen={isMinLevelModalOpen} onClose={handleCloseMinLevelModal} title={`Update Minimum Level: ${selectedStock?.rawMaterial}`}>
        <form onSubmit={handleMinLevelSubmit((d) => minLevelMutation.mutate(d))} className="space-y-4">
          <Input 
            label={`New Minimum Level (${selectedStock?.unit}) *`}
            type="number" step="0.01" 
            {...registerMinLevel('minimumStockLevel', { valueAsNumber: true })} 
            error={minLevelErrors.minimumStockLevel?.message} 
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseMinLevelModal}>Cancel</Button>
            <Button type="submit" isLoading={minLevelMutation.isPending}>
              Update Level
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
