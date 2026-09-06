import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, TrendingDown, Wallet, CheckCircle2, Search, Filter, X } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getPurchasePayments,
  createPurchasePayment,
  getPurchasePaymentSummary,
  getPendingPurchasePayments,
  getOutstandingTotal,
} from '../api/purchase';
import { getSuppliers } from '../api/supplier';
import { purchasePaymentSchema, type RequestPurchasePaymentDTO, isPurchaseFullyPaid, type PendingPurchaseDTO } from '../types/purchase';
import {
  Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState, Pagination, CopyableSequence, Select
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'] as const;

// ── Purchase Summary Panel (shown inside modal when purchase is selected) ──
function PurchaseSummaryPanel({ purchaseId }: { purchaseId: string }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['purchase-summary', purchaseId],
    queryFn: () => getPurchasePaymentSummary(purchaseId),
    enabled: !!purchaseId,
  });

  if (!purchaseId) return null;
  if (isLoading) return (
    <div className="bg-blue-50 rounded-lg p-4 space-y-2 animate-pulse">
      <div className="h-3 bg-blue-100 rounded w-2/3" />
      <div className="h-4 bg-blue-100 rounded w-1/3" />
    </div>
  );
  if (!summary) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-sm">
      <div className="flex justify-between items-center">
        <CopyableSequence
          value={summary.purchaseNumber}
          plainText
          badgeClassName="font-semibold text-blue-900"
        />
        <span className="text-blue-700">{summary.supplierName}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-blue-200">
        <div className="bg-white rounded-md px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-bold tabular-nums text-gray-900">{formatCurrency(summary.totalAmount)}</p>
        </div>
        <div className="bg-white rounded-md px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="font-bold tabular-nums text-green-700">{formatCurrency(summary.paidAmount)}</p>
        </div>
        <div className="bg-white rounded-md px-3 py-2 text-center">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="font-bold tabular-nums text-red-700">{formatCurrency(summary.pendingAmount)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Pending Payments panel ──────────────────────────────────────────────────
interface PendingPaymentsPanelProps {
  pending: PendingPurchaseDTO[];
  isLoading: boolean;
  searchTerm: string;
  supplierFilter: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  onClearFilters: () => void;
}

function PendingPaymentsPanel({
  pending,
  isLoading,
  searchTerm,
  supplierFilter,
  statusFilter,
  startDate,
  endDate,
  onClearFilters,
}: PendingPaymentsPanelProps) {
  const filtered = useMemo(() => {
    return pending.filter((p) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchNum = p.purchaseNumber?.toLowerCase().includes(term);
        const matchSupplier = p.supplierName?.toLowerCase().includes(term);
        const matchTotal = p.totalAmount?.toString().includes(term);
        const matchPending = p.pendingAmount?.toString().includes(term);
        const matchPaid = p.paidAmount?.toString().includes(term);
        const matchStatus = p.paymentStatus?.toLowerCase().replace(/_/g, ' ').includes(term);
        if (!matchNum && !matchSupplier && !matchTotal && !matchPending && !matchPaid && !matchStatus) {
          return false;
        }
      }
      // 2. Supplier
      if (supplierFilter && p.supplierName !== supplierFilter) {
        return false;
      }
      // 3. Status
      if (statusFilter && p.paymentStatus !== statusFilter) {
        return false;
      }
      // 4. Date range
      if (startDate) {
        const pDate = p.purchaseDate ? p.purchaseDate.split('T')[0] : '';
        if (pDate < startDate) return false;
      }
      if (endDate) {
        const pDate = p.purchaseDate ? p.purchaseDate.split('T')[0] : '';
        if (pDate > endDate) return false;
      }
      return true;
    });
  }, [pending, searchTerm, supplierFilter, statusFilter, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-white rounded-xl border border-gray-200/80 shadow-xs animate-pulse" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-gray-200 shadow-xs">
        All supplier bills have been paid.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-gray-100 rounded-full text-gray-400">
          <Search className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">No unpaid bills match your filters</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          We couldn't find any unpaid supplier bills matching your selected filters. Try adjusting your search term or clearing filters.
        </p>
        <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5 mt-2">
          <X className="h-3.5 w-3.5" /> Clear All Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="hidden md:grid md:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1.5fr)_100px_minmax(85px,1fr)_minmax(85px,1fr)_minmax(90px,1fr)] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
        <div>Bill #</div>
        <div>Supplier</div>
        <div>Date</div>
        <div className="text-right">Total Bill</div>
        <div className="text-right">Paid</div>
        <div className="text-right">Remaining to Pay</div>
      </div>

      {filtered.map(p => (
        <div
          key={p.publicId}
          className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md hover:border-gray-300 transition-all grid grid-cols-1 md:grid-cols-[minmax(160px,1.2fr)_minmax(120px,1.5fr)_100px_minmax(85px,1fr)_minmax(85px,1fr)_minmax(90px,1fr)] items-center gap-3 px-5 py-3.5"
        >
          <div className="min-w-0">
            <CopyableSequence value={p.purchaseNumber} />
          </div>
          <div className="font-semibold text-sm text-gray-900 truncate min-w-0" title={p.supplierName}>{p.supplierName}</div>
          <div className="text-sm text-gray-600 whitespace-nowrap min-w-0">{formatDate(p.purchaseDate)}</div>
          <div className="md:text-right text-sm tabular-nums text-gray-700 font-medium min-w-0">{formatCurrency(p.totalAmount)}</div>
          <div className="md:text-right text-sm tabular-nums text-emerald-700 font-medium min-w-0">{formatCurrency(p.paidAmount)}</div>
          <div className="md:text-right text-sm tabular-nums font-bold text-rose-700 min-w-0">{formatCurrency(p.pendingAmount)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PurchasePayments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [page, setPage] = useState(0);

  // ── Filters State ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: paymentsPage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchasePayments'],
    queryFn: () => getPurchasePayments(0, 100),
    enabled: activeTab === 'all',
  });

  // Fetch pending purchases (for dropdown and pending tab)
  const { data: pendingPurchases = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-purchases'],
    queryFn: getPendingPurchasePayments,
  });

  // Fetch suppliers list
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const { data: outstandingTotal } = useQuery({
    queryKey: ['outstanding-total'],
    queryFn: getOutstandingTotal,
  });

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<RequestPurchasePaymentDTO>({
    resolver: zodResolver(purchasePaymentSchema),
    defaultValues: { paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH' },
  });

  const selectedPurchaseId = useWatch({ control, name: 'purchasePublicId' }) ?? '';
  const selectedPurchase = pendingPurchases.find(p => p.publicId === selectedPurchaseId);

  // Summary query for selected purchase in modal
  const { data: selectedSummary } = useQuery({
    queryKey: ['purchase-summary', selectedPurchaseId],
    queryFn: () => getPurchasePaymentSummary(selectedPurchaseId),
    enabled: !!selectedPurchaseId,
  });

  const isSelectedFullyPaid = Boolean(
    (selectedPurchase && isPurchaseFullyPaid(selectedPurchase.paymentStatus, selectedPurchase.pendingAmount)) ||
    (selectedSummary && selectedSummary.pendingAmount <= 0)
  );

  const handleSelectPurchase = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pubId = e.target.value;
    setValue('purchasePublicId', pubId, { shouldValidate: true });
    const found = pendingPurchases.find(p => p.publicId === pubId);
    if (found) {
      setValue('amountPaid', found.pendingAmount, { shouldValidate: true });
    }
  };

  const mutation = useMutation({
    mutationFn: createPurchasePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasePayments'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-payments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] });
      handleCloseModal();
      toast.success('Payment recorded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to record payment.'),
  });

  const handleCloseModal = () => { setIsModalOpen(false); reset(); };

  const onSubmit = (data: RequestPurchasePaymentDTO) => {
    if (isSelectedFullyPaid) {
      toast.info('This purchase has already been fully paid.');
      return;
    }
    const maxPending = selectedSummary?.pendingAmount ?? selectedPurchase?.pendingAmount;
    if (maxPending !== undefined && data.amountPaid > maxPending) {
      toast.error(`Payment amount cannot exceed pending balance of ₹${maxPending.toLocaleString('en-IN')}`);
      return;
    }
    mutation.mutate(data);
  };

  const payments = paymentsPage?.content ?? [];

  // Dynamically derive supplier options from suppliers list, payments, and pending purchases
  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.supplierName) set.add(s.supplierName);
    });
    payments.forEach((p) => {
      if (p.purchase?.supplierName) set.add(p.purchase.supplierName);
    });
    pendingPurchases.forEach((p) => {
      if (p.supplierName) set.add(p.supplierName);
    });
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [
      { value: '', label: 'All Suppliers' },
      ...sorted.map((name) => ({ value: name, label: name })),
    ];
  }, [suppliers, payments, pendingPurchases]);

  // Compute filtered payments for All Payments tab
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchPaymentNum = p.paymentNumber?.toLowerCase().includes(term);
        const matchPurchaseNum = p.purchase?.purchaseNumber?.toLowerCase().includes(term);
        const matchSupplier = p.purchase?.supplierName?.toLowerCase().includes(term);
        const matchRef = p.referenceNumber?.toLowerCase().includes(term);
        const matchRemarks = p.remarks?.toLowerCase().includes(term);
        const matchAmount = p.amountPaid?.toString().includes(term);
        const matchMode = p.paymentMode?.toLowerCase().replace(/_/g, ' ').includes(term);
        if (
          !matchPaymentNum &&
          !matchPurchaseNum &&
          !matchSupplier &&
          !matchRef &&
          !matchRemarks &&
          !matchAmount &&
          !matchMode
        ) {
          return false;
        }
      }

      // 2. Supplier
      if (supplierFilter && p.purchase?.supplierName !== supplierFilter) {
        return false;
      }

      // 3. Payment Mode
      if (modeFilter && p.paymentMode !== modeFilter) {
        return false;
      }

      // 4. Date range
      if (startDate) {
        const pDate = p.paymentDate ? p.paymentDate.split('T')[0] : '';
        if (pDate < startDate) return false;
      }
      if (endDate) {
        const pDate = p.paymentDate ? p.paymentDate.split('T')[0] : '';
        if (pDate > endDate) return false;
      }

      return true;
    });
  }, [payments, searchTerm, supplierFilter, modeFilter, startDate, endDate]);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const paginatedPayments = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, page]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    supplierFilter ||
    (activeTab === 'all' ? modeFilter : statusFilter) ||
    startDate ||
    endDate
  );

  const activeFilterCount = [
    Boolean(searchTerm.trim()),
    Boolean(supplierFilter),
    Boolean(activeTab === 'all' ? modeFilter : statusFilter),
    Boolean(startDate),
    Boolean(endDate),
  ].filter(Boolean).length;

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setSupplierFilter('');
    setModeFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const totalDisbursed = useMemo(
    () => paymentsPage?.content?.reduce((acc, p) => acc + (p.amountPaid || 0), 0) ?? 0,
    [paymentsPage]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Payments"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record Payment Made
          </Button>
        }
      />

      {/* KPI Ribbon (Ledger Benchmark) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Money Paid</span>
            <TrendingDown className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(totalDisbursed)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Total payments listed</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Bills Awaiting Payment</span>
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700 dark:text-amber-400 mt-1">
            {pendingPurchases.length} Bills
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Pending supplier bills</span>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">Total Pending to Pay</span>
            <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-rose-800 dark:text-rose-200 mt-1">
            {formatCurrency(outstandingTotal ?? 0)}
          </p>
          <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">Total money owed to suppliers</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1.5 bg-gray-100/80 dark:bg-[#0E131C] p-1.5 rounded-xl w-fit border border-gray-200/60 dark:border-[#1F2837]">
        {(['all', 'pending'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(0); }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-[#141A24] text-gray-900 dark:text-slate-100 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
          >
            {tab === 'pending' && <Clock className="h-3.5 w-3.5" />}
            {tab === 'all' ? 'All Payments Made' : 'Unpaid Supplier Bills'}
          </button>
        ))}
      </div>

      {/* Filters Bar Card */}
      <div className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Search Input */}
          <div className="lg:col-span-4">
            <Input
              label="Search"
              placeholder={activeTab === 'all' ? "Search payment #, purchase #, supplier..." : "Search purchase #, supplier..."}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              leftIcon={<Search className="h-4 w-4" />}
              rightIcon={
                searchTerm ? (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setPage(0); }}
                    className="p-1 hover:text-gray-700 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Supplier Dropdown */}
          <div className="lg:col-span-2">
            <Select
              label="Supplier"
              value={supplierFilter}
              onChange={(e) => { setSupplierFilter(e.target.value); setPage(0); }}
              options={supplierOptions}
            />
          </div>

          {/* Mode (All tab) or Status (Pending tab) */}
          <div className="lg:col-span-2">
            {activeTab === 'all' ? (
              <Select
                label="Payment Mode"
                value={modeFilter}
                onChange={(e) => { setModeFilter(e.target.value); setPage(0); }}
                options={[
                  { value: '', label: 'All Modes' },
                  { value: 'CASH', label: 'Cash' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'CHEQUE', label: 'Cheque' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            ) : (
              <Select
                label="Payment Status"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                ]}
              />
            )}
          </div>

          {/* From Date */}
          <div className="lg:col-span-2">
            <Input
              type="date"
              label="From Date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            />
          </div>

          {/* To Date */}
          <div className="lg:col-span-2">
            <Input
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            />
          </div>
        </div>

        {/* Active Filter Helper / Clear Action */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full">
                <Filter className="h-3 w-3 text-gray-500" />
                {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
              <span>
                Showing{' '}
                <strong className="text-gray-900">
                  {activeTab === 'all'
                    ? filteredPayments.length
                    : pendingPurchases.filter(p => {
                        if (searchTerm.trim()) {
                          const term = searchTerm.trim().toLowerCase();
                          const matchNum = p.purchaseNumber?.toLowerCase().includes(term);
                          const matchSupplier = p.supplierName?.toLowerCase().includes(term);
                          const matchTotal = p.totalAmount?.toString().includes(term);
                          const matchPending = p.pendingAmount?.toString().includes(term);
                          const matchPaid = p.paidAmount?.toString().includes(term);
                          const matchStatus = p.paymentStatus?.toLowerCase().replace(/_/g, ' ').includes(term);
                          if (!matchNum && !matchSupplier && !matchTotal && !matchPending && !matchPaid && !matchStatus) return false;
                        }
                        if (supplierFilter && p.supplierName !== supplierFilter) return false;
                        if (statusFilter && p.paymentStatus !== statusFilter) return false;
                        if (startDate && p.purchaseDate && p.purchaseDate.split('T')[0] < startDate) return false;
                        if (endDate && p.purchaseDate && p.purchaseDate.split('T')[0] > endDate) return false;
                        return true;
                      }).length}
                </strong>{' '}
                of{' '}
                <strong className="text-gray-900">
                  {activeTab === 'all' ? payments.length : pendingPurchases.length}
                </strong>{' '}
                {activeTab === 'all' ? 'payment records' : 'pending purchases'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear All Filters
            </button>
          </div>
        )}
      </div>

      {activeTab === 'pending' ? (
        <PendingPaymentsPanel
          pending={pendingPurchases}
          isLoading={isLoadingPending}
          searchTerm={searchTerm}
          supplierFilter={supplierFilter}
          statusFilter={statusFilter}
          startDate={startDate}
          endDate={endDate}
          onClearFilters={handleClearAllFilters}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-gray-200/80 shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load payments'} onRetry={() => refetch()} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments made yet"
          description="Record a supplier payment to see it here."
          action={
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Record Payment Made
            </Button>
          }
        />
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-gray-200 shadow-xs space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-gray-100 rounded-full text-gray-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">No payment records match your filters</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            We couldn't find any payments matching your selected filter criteria. Try adjusting your search term, changing dates, or clearing your filters.
          </p>
          <Button variant="outline" size="sm" onClick={handleClearAllFilters} className="gap-1.5 mt-2">
            <X className="h-3.5 w-3.5" /> Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {/* Column Header Guide Bar */}
          <div className="hidden lg:grid lg:grid-cols-[95px_minmax(160px,1.2fr)_minmax(160px,1.2fr)_minmax(120px,1.4fr)_minmax(95px,1fr)_minmax(80px,0.8fr)_minmax(80px,0.9fr)_minmax(80px,1fr)] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div>Payment Date</div>
            <div>Voucher #</div>
            <div>Bill #</div>
            <div>Supplier</div>
            <div className="text-right">Amount Paid</div>
            <div>Method</div>
            <div>Transaction / Ref #</div>
            <div>Notes</div>
          </div>

          {/* List of Floating Cards */}
          {paginatedPayments.map(p => (
            <div
              key={p.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all grid grid-cols-1 lg:grid-cols-[95px_minmax(160px,1.2fr)_minmax(160px,1.2fr)_minmax(120px,1.4fr)_minmax(95px,1fr)_minmax(80px,0.8fr)_minmax(80px,0.9fr)_minmax(80px,1fr)] items-center gap-3 px-5 py-3.5"
            >
              <div className="text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap min-w-0">{formatDate(p.paymentDate)}</div>
              <div className="min-w-0">
                <CopyableSequence
                  value={p.paymentNumber}
                  badgeClassName="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40"
                />
              </div>
              <div className="min-w-0">
                <CopyableSequence
                  value={p.purchase?.purchaseNumber ?? '—'}
                  badgeClassName="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-[#161F2E] px-2 py-0.5 rounded border border-slate-200/90 dark:border-[#243245] inline-flex items-center"
                />
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate min-w-0" title={p.purchase?.supplierName}>{p.purchase?.supplierName ?? '—'}</div>
              <div className="text-left lg:text-right text-sm tabular-nums font-bold text-gray-900 dark:text-slate-100 min-w-0">{formatCurrency(p.amountPaid)}</div>
              <div className="min-w-0">
                <Badge variant="default" className="text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none">
                  {p.paymentMode?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate min-w-0" title={p.referenceNumber}>{p.referenceNumber || '—'}</div>
              <div className="text-xs text-gray-400 dark:text-slate-500 truncate min-w-0" title={p.remarks}>{p.remarks || '—'}</div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex justify-center">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Record Payment to Supplier" className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Bill to Pay *</label>
            <select
              {...register('purchasePublicId', {
                onChange: handleSelectPurchase,
              })}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Select an unpaid bill…</option>
              {pendingPurchases.map(p => {
                const isFullyPaid = isPurchaseFullyPaid(p.paymentStatus, p.pendingAmount);
                return (
                  <option key={p.publicId} value={p.publicId} disabled={isFullyPaid}>
                    {p.purchaseNumber} — {p.supplierName || 'Unknown Supplier'} — {isFullyPaid ? 'Fully Paid' : `Pending: ₹${p.pendingAmount?.toLocaleString('en-IN')}`} (Total: ₹{p.totalAmount?.toLocaleString('en-IN')})
                  </option>
                );
              })}
            </select>
            {errors.purchasePublicId && <p className="text-red-500 text-xs mt-1">{errors.purchasePublicId.message}</p>}
          </div>

          {/* Live summary panel */}
          <PurchaseSummaryPanel purchaseId={selectedPurchaseId} />

          {isSelectedFullyPaid && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>This purchase bill has been fully paid. No remaining balance remains.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Date *"
              type="date"
              disabled={isSelectedFullyPaid}
              {...register('paymentDate')}
              error={errors.paymentDate?.message}
            />
            <Input
              label={
                selectedPurchase
                  ? `Amount to Pay * (Pending: ₹${(selectedSummary?.pendingAmount ?? selectedPurchase.pendingAmount).toLocaleString('en-IN')})`
                  : 'Amount to Pay *'
              }
              type="number"
              step="0.01"
              disabled={isSelectedFullyPaid}
              max={selectedSummary?.pendingAmount ?? selectedPurchase?.pendingAmount}
              {...register('amountPaid', {
                valueAsNumber: true,
                validate: (val) => {
                  if (isSelectedFullyPaid) {
                    return 'Purchase bill is already fully paid';
                  }
                  const maxDue = selectedSummary?.pendingAmount ?? selectedPurchase?.pendingAmount;
                  if (maxDue !== undefined && val > maxDue) {
                    return `Payment amount cannot exceed pending balance of ₹${maxDue.toLocaleString('en-IN')}`;
                  }
                  return true;
                }
              })}
              error={errors.amountPaid?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select
              disabled={isSelectedFullyPaid}
              {...register('paymentMode')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Input
            label="Transaction / Reference # (Optional)"
            placeholder="Cheque no., UTR, bank txn ID, etc."
            disabled={isSelectedFullyPaid}
            {...register('referenceNumber')}
            error={errors.referenceNumber?.message}
          />
          <Input
            label="Notes / Remarks"
            placeholder="Optional notes or comments"
            disabled={isSelectedFullyPaid}
            {...register('remarks')}
            error={errors.remarks?.message}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              {isSelectedFullyPaid ? 'Close' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              isLoading={mutation.isPending}
              disabled={isSelectedFullyPaid || !selectedPurchaseId}
              className={isSelectedFullyPaid ? 'cursor-not-allowed opacity-60' : ''}
            >
              {isSelectedFullyPaid ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Fully Paid
                </span>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
