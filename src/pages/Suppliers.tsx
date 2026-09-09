import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle2, Search, TrendingUp, UserSquare2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSuppliers, getActiveSuppliers, createSupplier, updateSupplier, deactivateSupplier, reactivateSupplier } from '../api/supplier';
import { supplierSchema, type RequestSupplierDTO, type ResponseSupplierDTO } from '../types/supplier';
import { getDashboardSummary } from '../api/dashboard';
import { Button, Input, Select, Modal, Badge, PageHeader, ErrorState, EmptyState, PartyStatementModal } from '@/components';
import { formatCurrency } from '@/lib';
import { toast } from '../store/toastStore';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ResponseSupplierDTO | null>(null);
  const [statementSupplier, setStatementSupplier] = useState<ResponseSupplierDTO | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  const { data: suppliers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['suppliers', statusFilter],
    queryFn: statusFilter === 'active' ? getActiveSuppliers : getSuppliers,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  });

  const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RequestSupplierDTO>({
    resolver: zodResolver(supplierSchema),
    mode: 'onTouched',
    defaultValues: {
      supplierName: '',
      mobileNumber: '',
      contactPerson: '',
      alternateMobileNumber: '',
      email: '',
      gstNumber: '',
      openingBalance: 0,
      paymentTerms: 30,
    }
  });

  const mutation = useMutation({
    mutationFn: (data: RequestSupplierDTO) => 
      editingSupplier ? updateSupplier(editingSupplier.publicId, data) : createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingSupplier ? 'Supplier updated successfully.' : 'Supplier added successfully.');
    },
    onError: (error: any) => {
      if (error.code === 'VALIDATION_ERROR' && error.fieldErrors) {
        Object.keys(error.fieldErrors).forEach((key) => {
          if (key.startsWith('address.')) {
            const nestedKey = key.split('.')[1] as any;
            setError(`address.${nestedKey}` as any, { type: 'server', message: error.fieldErrors[key] });
          } else {
            setError(key as any, { type: 'server', message: error.fieldErrors[key] });
          }
        });
      } else {
        toast.error(error?.message || 'Failed to save supplier.');
      }
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      isActive ? deactivateSupplier(id) : reactivateSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier status updated.');
    },
    onError: () => toast.error('Failed to update supplier status.'),
  });

  const handleOpenModal = (supplier?: ResponseSupplierDTO) => {
    if (supplier) {
      setEditingSupplier(supplier);
      reset({
        ...supplier,
        alternateMobileNumber: supplier.alternateMobileNumber || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        gstNumber: supplier.gstNumber || '',
      });
    } else {
      setEditingSupplier(null);
      reset({ 
        supplierName: '',
        mobileNumber: '',
        contactPerson: '',
        alternateMobileNumber: '',
        email: '',
        gstNumber: '',
        openingBalance: 0, 
        paymentTerms: 30,
        address: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingSupplier(null);
  };

  const onSubmit = (data: RequestSupplierDTO) => {
    const hasAddress = !!(data.address?.addressLine1 && data.address.addressLine1.trim().length > 0);
    const cleanedAddress = hasAddress ? {
      addressLine1: data.address!.addressLine1!.trim(),
      addressLine2: data.address!.addressLine2?.trim() || undefined,
      city: data.address!.city?.trim() || undefined,
      state: data.address!.state?.trim() || undefined,
      country: data.address!.country?.trim() || 'India',
      pincode: data.address!.pincode?.trim() || undefined,
    } : undefined;

    const cleanedData: RequestSupplierDTO = {
      ...data,
      contactPerson: data.contactPerson?.trim() || undefined,
      alternateMobileNumber: data.alternateMobileNumber?.trim() || undefined,
      email: data.email?.trim() || undefined,
      gstNumber: data.gstNumber?.trim() ? data.gstNumber.trim().toUpperCase() : undefined,
      address: cleanedAddress,
    };
    mutation.mutate(cleanedData);
  };

  // Filter suppliers on the client side based on Supplier Name or Contact Number
  const filteredSuppliers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, '');

    return (suppliers ?? []).filter((s) => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && s.isActive);
      if (!matchesStatus) return false;

      // If search input is empty, return all matching status
      if (!term) return true;

      // 1. Match by Supplier Name (case-insensitive substring)
      const matchesName = s.supplierName?.toLowerCase().includes(term);

      // 2. Match by Supplier Contact Number (mobileNumber or alternateMobileNumber)
      const mobileRaw = s.mobileNumber?.toLowerCase() ?? '';
      const altMobileRaw = s.alternateMobileNumber?.toLowerCase() ?? '';
      const matchesContactString = mobileRaw.includes(term) || altMobileRaw.includes(term);

      const mobileDigits = s.mobileNumber ? s.mobileNumber.replace(/\D/g, '') : '';
      const altMobileDigits = s.alternateMobileNumber ? s.alternateMobileNumber.replace(/\D/g, '') : '';
      const matchesContactDigits = termDigits.length > 0 && (
        mobileDigits.includes(termDigits) || altMobileDigits.includes(termDigits)
      );

      return matchesName || matchesContactString || matchesContactDigits;
    });
  }, [suppliers, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Suppliers"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      {/* Live Outstanding Payables from Dashboard */}
      <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">Total Money to Pay (To Suppliers)</p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-slate-100 mt-1">{formatCurrency(dashboardData?.totalOutstanding ?? 0)}</p>
        </div>
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-100/80 dark:border-rose-900/40">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <Input 
            placeholder="Search by supplier name or contact number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search suppliers by name or contact number"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active')}
            options={[
              { label: 'All Suppliers', value: 'all' },
              { label: 'Active Only', value: 'active' }
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load suppliers'} onRetry={() => refetch()} />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<UserSquare2 className="h-8 w-8" />}
          title={searchTerm ? 'No suppliers match your search' : 'No suppliers yet'}
          description={searchTerm ? 'Try searching with a different supplier name or contact number.' : 'Add your first supplier to start managing purchase bills and payments.'}
          action={
            !searchTerm && (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add First Supplier
              </Button>
            )
          }
        />
      ) : (
        <div className="w-full space-y-3">
          {/* Column Header Guide Bar */}
          <div className="hidden md:grid grid-cols-[minmax(140px,1.5fr)_minmax(130px,1.2fr)_minmax(110px,1fr)_minmax(90px,0.8fr)_80px_100px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Supplier Name</div>
            <div className="min-w-0">Contact</div>
            <div className="min-w-0">GST Number</div>
            <div className="min-w-0 text-right">Opening Balance</div>
            <div className="min-w-0">Status</div>
            <div className="min-w-0 text-right pr-2">Actions</div>
          </div>

          {/* List of Floating Cards */}
          {filteredSuppliers.map((s) => (
            <div
              key={s.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all w-full overflow-hidden"
            >
              {/* Desktop View (md:grid) */}
              <div className="hidden md:grid grid-cols-[minmax(140px,1.5fr)_minmax(130px,1.2fr)_minmax(110px,1fr)_minmax(90px,0.8fr)_80px_100px] items-center gap-3 px-5 py-3.5 w-full">
                <div className="min-w-0 font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={s.supplierName}>{s.supplierName}</div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-700 dark:text-slate-300 font-medium truncate">{s.mobileNumber}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 truncate" title={s.email}>{s.email || '—'}</div>
                </div>
                <div className="min-w-0 font-mono text-xs text-gray-600 dark:text-slate-400 truncate">{s.gstNumber || '—'}</div>
                <div className="min-w-0 text-right text-sm tabular-nums font-semibold text-gray-900 dark:text-slate-100">
                  {formatCurrency(s.openingBalance)}
                </div>
                <div className="min-w-0">
                  <Badge variant={s.isActive ? 'success' : 'default'}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-blue-700 dark:text-sky-400 hover:text-blue-900 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/50 rounded-lg transition-colors"
                    onClick={() => setStatementSupplier(s)} 
                    title="View Statement Ledger"
                    aria-label={`View statement ledger for ${s.supplierName}`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    onClick={() => handleOpenModal(s)} 
                    title="Edit Supplier"
                    aria-label={`Edit ${s.supplierName}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-7 w-7 transition-colors ${s.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"}`}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to ${s.isActive ? 'deactivate' : 'reactivate'} this supplier?`)) {
                        toggleStatusMutation.mutate({ id: s.publicId, isActive: s.isActive });
                      }
                    }}
                    title={s.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {s.isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Mobile View (md:hidden) */}
              <div className="md:hidden p-3.5 space-y-2.5 w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={s.supplierName}>{s.supplierName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">{s.mobileNumber}</span>
                      {s.gstNumber && <span className="font-mono text-[11px] text-gray-500 dark:text-slate-400">GST: {s.gstNumber}</span>}
                    </div>
                  </div>
                  <Badge variant={s.isActive ? 'success' : 'default'} className="shrink-0">
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between bg-gray-50/80 dark:bg-[#0E141E] p-2.5 rounded-xl border border-gray-100 dark:border-[#1E293B] text-xs">
                  <span className="text-gray-500 dark:text-slate-400">Opening Balance</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-slate-100">{formatCurrency(s.openingBalance)}</span>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100 dark:border-[#1E293B]">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-blue-700 dark:text-sky-400 hover:text-blue-900 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 rounded-lg gap-1 font-medium"
                    onClick={() => setStatementSupplier(s)} 
                    title="View Statement Ledger"
                  >
                    <FileText className="h-3.5 w-3.5" /> Statement
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    onClick={() => handleOpenModal(s)} 
                    title="Edit Supplier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 transition-colors ${s.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"}`}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to ${s.isActive ? 'deactivate' : 'reactivate'} this supplier?`)) {
                        toggleStatusMutation.mutate({ id: s.publicId, isActive: s.isActive });
                      }
                    }}
                    title={s.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {s.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input label="Supplier Name *" placeholder="e.g. Mohan Polymers" maxLength={150} {...register('supplierName')} error={errors.supplierName?.message} />
            <Input label="Contact Person (Optional)" placeholder="e.g. Harsh Nada" maxLength={100} {...register('contactPerson')} error={errors.contactPerson?.message} />
            <Input label="Mobile Number *" placeholder="10-digit mobile" maxLength={10} {...register('mobileNumber')} error={errors.mobileNumber?.message} />
            <Input label="Alternate Mobile (Optional)" placeholder="10-digit mobile (optional)" maxLength={10} {...register('alternateMobileNumber')} error={errors.alternateMobileNumber?.message} />
            <Input label="Email (Optional)" type="email" placeholder="e.g. supplier@example.com" maxLength={150} {...register('email')} error={errors.email?.message} />
            <Input 
              label="GST Number (Optional)" 
              placeholder="15-character GSTIN (optional)" 
              maxLength={15} 
              className="uppercase"
              {...register('gstNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                }
              })} 
              error={errors.gstNumber?.message} 
            />
            <Input label="Opening Balance" type="number" step="0.01" min={0} {...register('openingBalance', { valueAsNumber: true })} error={errors.openingBalance?.message} />
            <Input label="Payment Terms (Days)" type="number" min={0} max={365} {...register('paymentTerms', { valueAsNumber: true })} error={errors.paymentTerms?.message} />
          </div>

          <div className="border-t border-gray-100 dark:border-[#1F2837] pt-5 mt-2">
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100 dark:border-[#1F2837]">
              <h4 className="font-serif font-bold text-base text-gray-900 dark:text-slate-100">Billing Address</h4>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">Optional</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Input label="Address Line 1 (Optional)" placeholder="Street address or building" maxLength={150} {...register('address.addressLine1')} error={errors.address?.addressLine1?.message} />
              <Input label="Address Line 2 (Optional)" placeholder="Area, landmark or floor" maxLength={150} {...register('address.addressLine2')} error={errors.address?.addressLine2?.message} />
              <Input label="City (Optional)" placeholder="City" maxLength={100} {...register('address.city')} error={errors.address?.city?.message} />
              <Input label="State (Optional)" placeholder="State" maxLength={100} {...register('address.state')} error={errors.address?.state?.message} />
              <Input label="Pincode (Optional)" placeholder="6-digit PIN" maxLength={6} {...register('address.pincode')} error={errors.address?.pincode?.message} />
              <Input label="Country (Optional)" placeholder="India" maxLength={100} {...register('address.country')} error={errors.address?.country?.message} />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending} className="w-full sm:w-auto">
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Party Statement Ledger Drawer */}
      <PartyStatementModal
        isOpen={!!statementSupplier}
        onClose={() => setStatementSupplier(null)}
        partyType="supplier"
        partyPublicId={statementSupplier?.publicId ?? null}
        partyName={statementSupplier?.supplierName ?? ''}
      />
    </div>
  );
}
