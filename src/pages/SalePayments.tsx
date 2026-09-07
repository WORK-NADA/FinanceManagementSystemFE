import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, TrendingUp, Wallet, Search, X, Filter, CreditCard } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getSalePayments,
  createSalePayment,
  getSalePaymentSummary,
  getPendingSalePayments,
  getReceivableTotal,
} from '../api/sale';
import { getCustomers } from '../api/customer';
import { salePaymentSchema, type RequestSalePaymentDTO, type PendingSaleDTO } from '../types/sale';
import {
  Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState, Pagination, CopyableSequence, Select
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER'] as const;

// ── Sale Summary Panel ──────────────────────────────────────────────────────
function SaleSummaryPanel({ saleId }: { saleId: string }) {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['sale-summary', saleId],
    queryFn: () => getSalePaymentSummary(saleId),
    enabled: !!saleId,
  });

  if (!saleId) return null;
  if (isLoading) return (
    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg p-4 space-y-2 animate-pulse">
      <div className="h-3 bg-emerald-100 dark:bg-emerald-900/40 rounded w-2/3" />
      <div className="h-3 bg-emerald-100 dark:bg-emerald-900/40 rounded w-1/2" />
    </div>
  );
  if (!summary) return null;

  return (
    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 rounded-lg p-4 space-y-1 text-sm">
      <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
        <span>{summary.customerName} —</span>
        <CopyableSequence
          value={summary.saleNumber}
          plainText
          badgeClassName="font-mono text-emerald-950 dark:text-emerald-100 font-bold"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#0E141E] rounded-md px-3 py-2 text-center border border-emerald-100/60 dark:border-emerald-900/40">
          <p className="text-xs text-gray-500 dark:text-slate-400">Total</p>
          <p className="font-bold tabular-nums text-gray-900 dark:text-slate-100">{formatCurrency(summary.totalAmount)}</p>
        </div>
        <div className="bg-white dark:bg-[#0E141E] rounded-md px-3 py-2 text-center border border-emerald-100/60 dark:border-emerald-900/40">
          <p className="text-xs text-gray-500 dark:text-slate-400">Received</p>
          <p className="font-bold tabular-nums text-green-700 dark:text-emerald-400">{formatCurrency(summary.receivedAmount)}</p>
        </div>
        <div className="bg-white dark:bg-[#0E141E] rounded-md px-3 py-2 text-center border border-emerald-100/60 dark:border-emerald-900/40">
          <p className="text-xs text-gray-500 dark:text-slate-400">Pending</p>
          <p className="font-bold tabular-nums text-red-700 dark:text-rose-400">{formatCurrency(summary.pendingAmount)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Pending Sale Payments Panel ─────────────────────────────────────────────
interface PendingSalePaymentsPanelProps {
  pending: PendingSaleDTO[];
  isLoading: boolean;
  searchTerm: string;
  customerFilter: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
  onClearFilters: () => void;
  onReceivePayment: (sale: PendingSaleDTO) => void;
}

function PendingSalePaymentsPanel({
  pending,
  isLoading,
  searchTerm,
  customerFilter,
  statusFilter,
  startDate,
  endDate,
  onClearFilters,
  onReceivePayment,
}: PendingSalePaymentsPanelProps) {
  const filtered = useMemo(() => {
    return pending.filter((s) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchNum = s.saleNumber?.toLowerCase().includes(term);
        const matchCustomer = s.customerName?.toLowerCase().includes(term);
        const matchTotal = s.totalAmount?.toString().includes(term);
        const matchPending = s.pendingAmount?.toString().includes(term);
        const matchReceived = s.receivedAmount?.toString().includes(term);
        const effStatus = s.paymentStatus ?? (s.receivedAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING');
        const matchStatus = effStatus.toLowerCase().replace(/_/g, ' ').includes(term);
        if (!matchNum && !matchCustomer && !matchTotal && !matchPending && !matchReceived && !matchStatus) {
          return false;
        }
      }
      // 2. Customer
      if (customerFilter && s.customerName !== customerFilter) {
        return false;
      }
      // 3. Status
      if (statusFilter) {
        const effStatus = s.paymentStatus ?? (s.receivedAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING');
        if (effStatus !== statusFilter) {
          return false;
        }
      }
      // 4. Date range
      if (startDate) {
        const sDate = s.saleDate ? s.saleDate.split('T')[0] : '';
        if (sDate < startDate) return false;
      }
      if (endDate) {
        const sDate = s.saleDate ? s.saleDate.split('T')[0] : '';
        if (sDate > endDate) return false;
      }
      return true;
    });
  }, [pending, searchTerm, customerFilter, statusFilter, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-slate-500 text-sm bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837] shadow-xs">
        All customer invoices have been collected.
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837] shadow-xs space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-gray-100 dark:bg-[#1E293B] rounded-full text-gray-400 dark:text-slate-400">
          <Search className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">No unpaid invoices match your filters</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
          We couldn't find any unpaid customer invoices matching your selected filters. Try adjusting your search term or clearing filters.
        </p>
        <Button variant="outline" size="sm" onClick={onClearFilters} className="gap-1.5 mt-2">
          <X className="h-3.5 w-3.5" /> Clear All Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="hidden md:grid md:grid-cols-[minmax(150px,1.2fr)_minmax(130px,1.4fr)_100px_minmax(85px,1fr)_minmax(85px,1fr)_minmax(95px,1fr)_minmax(95px,0.8fr)] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
        <div>Invoice #</div>
        <div>Customer</div>
        <div>Date</div>
        <div className="text-right">Total Invoice</div>
        <div className="text-right">Received</div>
        <div className="text-right">Remaining to Collect</div>
        <div className="text-right">Action</div>
      </div>

      {filtered.map(s => (
        <div
          key={s.publicId}
          className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all grid grid-cols-1 md:grid-cols-[minmax(150px,1.2fr)_minmax(130px,1.4fr)_100px_minmax(85px,1fr)_minmax(85px,1fr)_minmax(95px,1fr)_minmax(95px,0.8fr)] items-center gap-3 px-5 py-3.5"
        >
          <div className="min-w-0">
            <CopyableSequence value={s.saleNumber} />
          </div>
          <div className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate min-w-0" title={s.customerName}>{s.customerName}</div>
          <div className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap min-w-0">{formatDate(s.saleDate)}</div>
          <div className="md:text-right text-sm tabular-nums text-gray-700 dark:text-slate-300 font-medium min-w-0">{formatCurrency(s.totalAmount)}</div>
          <div className="md:text-right text-sm tabular-nums text-emerald-700 dark:text-emerald-400 font-medium min-w-0">{formatCurrency(s.receivedAmount)}</div>
          <div className="md:text-right text-sm tabular-nums font-bold text-rose-700 dark:text-rose-400 min-w-0">{formatCurrency(s.pendingAmount)}</div>
          <div className="md:text-right min-w-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2.5 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 hover:border-emerald-400 gap-1 font-semibold transition-colors shadow-xs"
              onClick={() => onReceivePayment(s)}
              title="Receive payment for this invoice"
            >
              <CreditCard className="h-3 w-3" /> Receive
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SalePayments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [page, setPage] = useState(0);

  // ── Filters State ─────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: paymentsPage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['salePayments'],
    queryFn: () => getSalePayments(0, 100),
    enabled: activeTab === 'all',
  });

  // Fetch pending sales (for dropdown and pending tab)
  const { data: pendingSales = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-sales'],
    queryFn: getPendingSalePayments,
  });

  // Fetch customers list for filtering options
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  });

  const { data: receivableTotal } = useQuery({
    queryKey: ['receivable-total'],
    queryFn: getReceivableTotal,
  });

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<RequestSalePaymentDTO>({
    resolver: zodResolver(salePaymentSchema),
    defaultValues: { paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH' },
  });

  const selectedSaleId = useWatch({ control, name: 'salePublicId' }) ?? '';
  const selectedSale = pendingSales.find(s => s.publicId === selectedSaleId);

  const handleSelectSale = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pubId = e.target.value;
    setValue('salePublicId', pubId, { shouldValidate: true });
    const found = pendingSales.find(s => s.publicId === pubId);
    if (found) {
      setValue('amountReceived', found.pendingAmount, { shouldValidate: true });
    }
  };

  const handleOpenReceiveModalForSale = (sale: PendingSaleDTO) => {
    setValue('salePublicId', sale.publicId, { shouldValidate: true });
    setValue('amountReceived', sale.pendingAmount, { shouldValidate: true });
    setValue('paymentDate', new Date().toISOString().split('T')[0]);
    setValue('paymentMode', 'CASH');
    setValue('referenceNumber', '');
    setValue('remarks', '');
    setIsModalOpen(true);
  };

  const mutation = useMutation({
    mutationFn: createSalePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salePayments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pending-sales'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] });
      handleCloseModal();
      toast.success('Payment received successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to receive payment.'),
  });

  const handleCloseModal = () => { setIsModalOpen(false); reset(); };

  const onSubmit = (data: RequestSalePaymentDTO) => {
    if (selectedSale && data.amountReceived > selectedSale.pendingAmount) {
      toast.error(`Amount received cannot exceed pending balance of ${formatCurrency(selectedSale.pendingAmount)}`);
      return;
    }
    mutation.mutate(data);
  };

  const payments = paymentsPage?.content ?? [];

  // Dynamically derive customer options from customers list, payments, and pending sales
  const customerOptions = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.customerName) set.add(c.customerName);
    });
    payments.forEach((p) => {
      if (p.sale?.customerName) set.add(p.sale.customerName);
    });
    pendingSales.forEach((s) => {
      if (s.customerName) set.add(s.customerName);
    });
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    return [
      { value: '', label: 'All Customers' },
      ...sorted.map((name) => ({ value: name, label: name })),
    ];
  }, [customers, payments, pendingSales]);

  // Compute filtered payments for All Payments tab
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchPaymentNum = p.paymentNumber?.toLowerCase().includes(term);
        const matchSaleNum = p.sale?.saleNumber?.toLowerCase().includes(term);
        const matchCustomer = p.sale?.customerName?.toLowerCase().includes(term);
        const matchRef = p.referenceNumber?.toLowerCase().includes(term);
        const matchRemarks = p.remarks?.toLowerCase().includes(term);
        const matchAmount = p.amountReceived?.toString().includes(term);
        const matchMode = p.paymentMode?.toLowerCase().replace(/_/g, ' ').includes(term);
        if (
          !matchPaymentNum &&
          !matchSaleNum &&
          !matchCustomer &&
          !matchRef &&
          !matchRemarks &&
          !matchAmount &&
          !matchMode
        ) {
          return false;
        }
      }

      // 2. Customer
      if (customerFilter && p.sale?.customerName !== customerFilter) {
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
  }, [payments, searchTerm, customerFilter, modeFilter, startDate, endDate]);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(filteredPayments.length / PAGE_SIZE);
  const paginatedPayments = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredPayments.slice(start, start + PAGE_SIZE);
  }, [filteredPayments, page]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    customerFilter ||
    (activeTab === 'all' ? modeFilter : statusFilter) ||
    startDate ||
    endDate
  );

  const activeFilterCount = [
    Boolean(searchTerm.trim()),
    Boolean(customerFilter),
    Boolean(activeTab === 'all' ? modeFilter : statusFilter),
    Boolean(startDate),
    Boolean(endDate),
  ].filter(Boolean).length;

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setCustomerFilter('');
    setModeFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const filteredPendingCount = useMemo(() => {
    return pendingSales.filter(s => {
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchNum = s.saleNumber?.toLowerCase().includes(term);
        const matchCustomer = s.customerName?.toLowerCase().includes(term);
        const matchTotal = s.totalAmount?.toString().includes(term);
        const matchPending = s.pendingAmount?.toString().includes(term);
        const matchReceived = s.receivedAmount?.toString().includes(term);
        const effStatus = s.paymentStatus ?? (s.receivedAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING');
        const matchStatus = effStatus.toLowerCase().replace(/_/g, ' ').includes(term);
        if (!matchNum && !matchCustomer && !matchTotal && !matchPending && !matchReceived && !matchStatus) return false;
      }
      if (customerFilter && s.customerName !== customerFilter) return false;
      if (statusFilter) {
        const effStatus = s.paymentStatus ?? (s.receivedAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING');
        if (effStatus !== statusFilter) return false;
      }
      if (startDate && s.saleDate && s.saleDate.split('T')[0] < startDate) return false;
      if (endDate && s.saleDate && s.saleDate.split('T')[0] > endDate) return false;
      return true;
    }).length;
  }, [pendingSales, searchTerm, customerFilter, statusFilter, startDate, endDate]);

  const totalCollected = useMemo(
    () => payments.reduce((acc, p) => acc + (p.amountReceived || 0), 0),
    [payments]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Payments"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Receive Payment
          </Button>
        }
      />

      {/* KPI Ribbon (Ledger Benchmark) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Money Received</span>
            <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(totalCollected)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Total payments listed</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Invoices Awaiting Payment</span>
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700 dark:text-amber-400 mt-1">
            {pendingSales.length} Invoices
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Pending customer invoices</span>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">Total Pending to Collect</span>
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-800 dark:text-amber-200 mt-1">
            {formatCurrency(receivableTotal ?? 0)}
          </p>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Total money due from customers</span>
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
            {tab === 'all' ? 'All Payments Received' : 'Unpaid Customer Invoices'}
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
              placeholder={activeTab === 'all' ? "Search receipt #, invoice #, customer..." : "Search invoice #, customer..."}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              leftIcon={<Search className="h-4 w-4" />}
              rightIcon={
                searchTerm ? (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setPage(0); }}
                    className="p-1 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Customer Dropdown */}
          <div className="lg:col-span-2">
            <Select
              label="Customer"
              value={customerFilter}
              onChange={(e) => { setCustomerFilter(e.target.value); setPage(0); }}
              options={customerOptions}
            />
          </div>

          {/* Mode (All tab) or Status (Pending tab) */}
          <div className="lg:col-span-2">
            {activeTab === 'all' ? (
              <Select
                label="Payment Method"
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
                  { value: 'PENDING', label: 'Pending (Unpaid)' },
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
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#1E293B] text-xs text-gray-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-[#1F2837] px-2.5 py-0.5 rounded-full">
                <Filter className="h-3 w-3 text-gray-500 dark:text-slate-400" />
                {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
              </span>
              <span>
                Showing{' '}
                <strong className="text-gray-900 dark:text-slate-100">
                  {activeTab === 'all'
                    ? filteredPayments.length
                    : filteredPendingCount}
                </strong>{' '}
                of{' '}
                <strong className="text-gray-900 dark:text-slate-100">
                  {activeTab === 'all' ? payments.length : pendingSales.length}
                </strong>{' '}
                {activeTab === 'all' ? 'payment records' : 'unpaid customer invoices'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Clear All Filters
            </button>
          </div>
        )}
      </div>

      {activeTab === 'pending' ? (
        <PendingSalePaymentsPanel
          pending={pendingSales}
          isLoading={isLoadingPending}
          searchTerm={searchTerm}
          customerFilter={customerFilter}
          statusFilter={statusFilter}
          startDate={startDate}
          endDate={endDate}
          onClearFilters={handleClearAllFilters}
          onReceivePayment={handleOpenReceiveModalForSale}
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load payments'} onRetry={() => refetch()} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payment records found"
          description="Receive a customer payment to see it here."
          action={
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Receive Payment
            </Button>
          }
        />
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837] shadow-xs space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-gray-100 dark:bg-[#1E293B] rounded-full text-gray-400 dark:text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">No payment records match your filters</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
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
            <div>Receipt #</div>
            <div>Invoice #</div>
            <div>Customer</div>
            <div className="text-right">Amount Received</div>
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
                  badgeClassName="font-mono text-xs font-semibold text-blue-700 dark:text-sky-300 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/80 dark:border-blue-800/50 inline-flex items-center"
                />
              </div>
              <div className="min-w-0">
                <CopyableSequence
                  value={p.sale?.saleNumber}
                  badgeClassName="font-mono text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-[#161F2E] px-2 py-0.5 rounded border border-slate-200/90 dark:border-[#243245] inline-flex items-center"
                />
              </div>
              <div className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate min-w-0" title={p.sale?.customerName}>{p.sale?.customerName ?? '—'}</div>
              <div className="lg:text-right text-sm tabular-nums font-bold text-emerald-700 dark:text-emerald-400 min-w-0">
                {formatCurrency(p.amountReceived)}
              </div>
              <div className="min-w-0">
                <Badge variant="info">{p.paymentMode.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="font-mono text-xs text-gray-500 dark:text-slate-400 truncate min-w-0" title={p.referenceNumber}>{p.referenceNumber || '—'}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400 truncate min-w-0" title={p.remarks}>{p.remarks || '—'}</div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex justify-center">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Receive Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Receive Payment from Customer" className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Customer Invoice to Collect *</label>
            <select
              {...register('salePublicId', {
                onChange: handleSelectSale,
              })}
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Select an unpaid invoice…</option>
              {pendingSales.map(s => (
                <option key={s.publicId} value={s.publicId}>
                  {s.saleNumber} — {s.customerName || 'Unknown Customer'} — Pending: {formatCurrency(s.pendingAmount)} (Total: {formatCurrency(s.totalAmount)})
                </option>
              ))}
            </select>
            {errors.salePublicId && <p className="text-red-500 text-xs mt-1">{errors.salePublicId.message}</p>}
          </div>

          {/* Live summary panel */}
          <SaleSummaryPanel saleId={selectedSaleId} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Payment Date *" type="date" {...register('paymentDate')} error={errors.paymentDate?.message} />
            <Input
              label={selectedSale ? `Amount Received * (Pending: ${formatCurrency(selectedSale.pendingAmount)})` : 'Amount Received *'}
              type="number"
              step="0.01"
              max={selectedSale?.pendingAmount}
              {...register('amountReceived', {
                valueAsNumber: true,
                validate: (val) => {
                  if (selectedSale && val > selectedSale.pendingAmount) {
                    return `Amount cannot exceed pending balance of ${formatCurrency(selectedSale.pendingAmount)}`;
                  }
                  return true;
                }
              })}
              error={errors.amountReceived?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Method *</label>
            <select
              {...register('paymentMode')}
              className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Input label="Transaction / Reference # (Optional)" placeholder="Cheque no., UTR, bank txn ID, etc." {...register('referenceNumber')} error={errors.referenceNumber?.message} />
          <Input label="Notes / Remarks" placeholder="Optional notes or details" {...register('remarks')} error={errors.remarks?.message} />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1E293B]">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>Receive Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
