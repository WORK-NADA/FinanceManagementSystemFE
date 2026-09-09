import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle2, Search, TrendingDown, UserSquare2, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCustomers, getActiveCustomers, createCustomer, updateCustomer, deactivateCustomer, reactivateCustomer } from '../api/customer';
import { customerSchema, type RequestCustomerDTO, type ResponseCustomerDTO } from '../types/customer';
import { getDashboardSummary } from '../api/dashboard';
import { Button, Input, Select, Modal, Badge, PageHeader, ErrorState, EmptyState, PartyStatementModal } from '@/components';
import { formatCurrency } from '@/lib';
import { toast } from '../store/toastStore';

export default function Customers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ResponseCustomerDTO | null>(null);
  const [statementCustomer, setStatementCustomer] = useState<ResponseCustomerDTO | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  const { data: customers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customers', statusFilter],
    queryFn: statusFilter === 'active' ? getActiveCustomers : getCustomers,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  });

  const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RequestCustomerDTO>({
    resolver: zodResolver(customerSchema),
    mode: 'onTouched',
    defaultValues: {
      customerName: '',
      mobileNumber: '',
      contactPerson: '',
      alternateMobileNumber: '',
      email: '',
      gstNumber: '',
      openingBalance: 0,
      paymentTerms: 30,
      address: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
      },
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RequestCustomerDTO) => 
      editingCustomer ? updateCustomer(editingCustomer.publicId, data) : createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingCustomer ? 'Customer updated successfully.' : 'Customer added successfully.');
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
        toast.error(error?.message || 'Failed to save customer.');
      }
    },
  });

  const onSubmit = (data: RequestCustomerDTO) => {
    const hasAddress = !!(data.address?.addressLine1 && data.address.addressLine1.trim().length > 0);
    const cleanedAddress = hasAddress ? {
      addressLine1: data.address!.addressLine1!.trim(),
      addressLine2: data.address!.addressLine2?.trim() || undefined,
      city: data.address!.city?.trim() || undefined,
      state: data.address!.state?.trim() || undefined,
      country: data.address!.country?.trim() || 'India',
      pincode: data.address!.pincode?.trim() || undefined,
    } : undefined;

    const cleanedData: RequestCustomerDTO = {
      ...data,
      customerName: data.customerName.trim(),
      contactPerson: data.contactPerson?.trim() || undefined,
      alternateMobileNumber: data.alternateMobileNumber?.trim() || undefined,
      email: data.email?.trim() || undefined,
      gstNumber: data.gstNumber?.trim() ? data.gstNumber.trim().toUpperCase() : undefined,
      address: cleanedAddress,
    };
    mutation.mutate(cleanedData);
  };

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      isActive ? deactivateCustomer(id) : reactivateCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer status updated.');
    },
    onError: () => toast.error('Failed to update customer status.'),
  });

  const handleOpenModal = (customer?: ResponseCustomerDTO) => {
    if (customer) {
      setEditingCustomer(customer);
      reset({
        ...customer,
        alternateMobileNumber: customer.alternateMobileNumber || '',
        contactPerson: customer.contactPerson || '',
        address: customer.address ? {
          addressLine1: customer.address.addressLine1 || '',
          addressLine2: customer.address.addressLine2 || '',
          city: customer.address.city || '',
          state: customer.address.state || '',
          country: customer.address.country || 'India',
          pincode: customer.address.pincode || '',
        } : {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
        },
      });
    } else {
      setEditingCustomer(null);
      reset({
        customerName: '',
        mobileNumber: '',
        contactPerson: '',
        alternateMobileNumber: '',
        email: '',
        gstNumber: '',
        openingBalance: 0,
        paymentTerms: 30,
        address: {
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: 'India',
          pincode: '',
        },
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingCustomer(null);
  };

  // Filter customers on the client side based on Customer Name or Contact Number
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const termDigits = term.replace(/\D/g, '');

    return (customers ?? []).filter((c) => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && c.isActive);
      if (!matchesStatus) return false;

      // If search input is empty, return all matching status
      if (!term) return true;

      // 1. Match by Customer Name (case-insensitive substring)
      const matchesName = c.customerName?.toLowerCase().includes(term);

      // 2. Match by Customer Contact Number (mobileNumber or alternateMobileNumber)
      const mobileRaw = c.mobileNumber?.toLowerCase() ?? '';
      const altMobileRaw = c.alternateMobileNumber?.toLowerCase() ?? '';
      const matchesContactString = mobileRaw.includes(term) || altMobileRaw.includes(term);

      const mobileDigits = c.mobileNumber ? c.mobileNumber.replace(/\D/g, '') : '';
      const altMobileDigits = c.alternateMobileNumber ? c.alternateMobileNumber.replace(/\D/g, '') : '';
      const matchesContactDigits = termDigits.length > 0 && (
        mobileDigits.includes(termDigits) || altMobileDigits.includes(termDigits)
      );

      return matchesName || matchesContactString || matchesContactDigits;
    });
  }, [customers, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customers"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      {/* Live Outstanding Receivables from Dashboard */}
      <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">Total Money to Collect (From Customers)</p>
          <p className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-slate-100 mt-1">{formatCurrency(dashboardData?.totalReceivable ?? 0)}</p>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-[var(--color-primary)] dark:text-emerald-400 rounded-xl border border-emerald-100/80 dark:border-emerald-900/40">
          <TrendingDown className="h-6 w-6" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <Input 
            placeholder="Search by customer name or contact number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search customers by name or contact number"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active')}
            options={[
              { label: 'All Customers', value: 'all' },
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
        <ErrorState message={(error as any)?.message || 'Failed to load customers'} onRetry={() => refetch()} />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<UserSquare2 className="h-8 w-8" />}
          title={searchTerm ? 'No customers match your search' : 'No customers yet'}
          description={searchTerm ? 'Try searching with a different customer name or contact number.' : 'Add your first customer to start managing sale invoices and customer balances.'}
          action={
            !searchTerm && (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add First Customer
              </Button>
            )
          }
        />
      ) : (
        <div className="w-full space-y-3">
          {/* Column Header Guide Bar */}
          <div className="hidden md:grid grid-cols-[minmax(140px,1.5fr)_minmax(130px,1.2fr)_minmax(110px,1fr)_minmax(90px,0.8fr)_80px_100px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Customer Name</div>
            <div className="min-w-0">Contact</div>
            <div className="min-w-0">GST Number</div>
            <div className="min-w-0 text-right">Opening Balance</div>
            <div className="min-w-0">Status</div>
            <div className="min-w-0 text-right pr-2">Actions</div>
          </div>

          {/* List of Floating Cards */}
          {filteredCustomers.map((c) => (
            <div
              key={c.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all w-full overflow-hidden"
            >
              {/* Desktop View (md:grid) */}
              <div className="hidden md:grid grid-cols-[minmax(140px,1.5fr)_minmax(130px,1.2fr)_minmax(110px,1fr)_minmax(90px,0.8fr)_80px_100px] items-center gap-3 px-5 py-3.5 w-full">
                <div className="min-w-0 font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={c.customerName}>{c.customerName}</div>
                <div className="min-w-0">
                  <div className="text-sm text-gray-700 dark:text-slate-300 font-medium truncate">{c.mobileNumber}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 truncate" title={c.email}>{c.email || '—'}</div>
                </div>
                <div className="min-w-0 font-mono text-xs text-gray-600 dark:text-slate-400 truncate">{c.gstNumber || '—'}</div>
                <div className="min-w-0 text-right text-sm tabular-nums font-semibold text-gray-900 dark:text-slate-100">
                  {formatCurrency(c.openingBalance)}
                </div>
                <div className="min-w-0">
                  <Badge variant={c.isActive ? 'success' : 'default'}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-blue-700 dark:text-sky-400 hover:text-blue-900 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800/50 rounded-lg transition-colors"
                    onClick={() => setStatementCustomer(c)} 
                    title="View Statement Ledger"
                    aria-label={`View statement ledger for ${c.customerName}`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    onClick={() => handleOpenModal(c)} 
                    title="Edit Customer"
                    aria-label={`Edit ${c.customerName}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-7 w-7 transition-colors ${c.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"}`}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to ${c.isActive ? 'deactivate' : 'reactivate'} this customer?`)) {
                        toggleStatusMutation.mutate({ id: c.publicId, isActive: c.isActive });
                      }
                    }}
                    title={c.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {c.isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* Mobile View (md:hidden) */}
              <div className="md:hidden p-3.5 space-y-2.5 w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={c.customerName}>{c.customerName}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">{c.mobileNumber}</span>
                      {c.gstNumber && <span className="font-mono text-[11px] text-gray-500 dark:text-slate-400">GST: {c.gstNumber}</span>}
                    </div>
                  </div>
                  <Badge variant={c.isActive ? 'success' : 'default'} className="shrink-0">
                    {c.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between bg-gray-50/80 dark:bg-[#0E141E] p-2.5 rounded-xl border border-gray-100 dark:border-[#1E293B] text-xs">
                  <span className="text-gray-500 dark:text-slate-400">Opening Balance</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-slate-100">{formatCurrency(c.openingBalance)}</span>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-100 dark:border-[#1E293B]">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs text-blue-700 dark:text-sky-400 hover:text-blue-900 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/50 rounded-lg gap-1 font-medium"
                    onClick={() => setStatementCustomer(c)} 
                    title="View Statement Ledger"
                  >
                    <FileText className="h-3.5 w-3.5" /> Statement
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                    onClick={() => handleOpenModal(c)} 
                    title="Edit Customer"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 transition-colors ${c.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"}`}
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to ${c.isActive ? 'deactivate' : 'reactivate'} this customer?`)) {
                        toggleStatusMutation.mutate({ id: c.publicId, isActive: c.isActive });
                      }
                    }}
                    title={c.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {c.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
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
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input label="Customer Name *" placeholder="e.g. Acme Corporation" maxLength={150} {...register('customerName')} error={errors.customerName?.message} />
            <Input label="Contact Person (Optional)" placeholder="e.g. Ramesh Patel" maxLength={100} {...register('contactPerson')} error={errors.contactPerson?.message} />
            <Input label="Mobile Number *" placeholder="10-digit mobile" maxLength={10} {...register('mobileNumber')} error={errors.mobileNumber?.message} />
            <Input label="Alternate Mobile (Optional)" placeholder="10-digit mobile (optional)" maxLength={10} {...register('alternateMobileNumber')} error={errors.alternateMobileNumber?.message} />
            <Input label="Email (Optional)" type="email" placeholder="e.g. customer@example.com" maxLength={150} {...register('email')} error={errors.email?.message} />
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
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Party Statement Ledger Drawer */}
      <PartyStatementModal
        isOpen={!!statementCustomer}
        onClose={() => setStatementCustomer(null)}
        partyType="customer"
        partyPublicId={statementCustomer?.publicId ?? null}
        partyName={statementCustomer?.customerName ?? ''}
      />
    </div>
  );
}
