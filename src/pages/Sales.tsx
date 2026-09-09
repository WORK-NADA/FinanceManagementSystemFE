import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, ChevronDown, ChevronUp, Printer, Edit2, TrendingUp, TrendingDown,
  Wallet, Clock, Trash2, CreditCard, CheckCircle2, AlertTriangle, AlertCircle, Receipt
} from 'lucide-react';
import { useForm, useController, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getSales, createSale, updateSale, deleteSale,
  getReceivableTotal, getPendingSalePayments,
  createSalePayment, getSalePaymentSummary, getPaymentsBySale
} from '../api/sale';
import { getActiveCustomers } from '../api/customer';
import type { ResponseCustomerDTO } from '../types/customer';
import { getActiveStocks } from '../api/stock';
import {
  saleSchema, salePaymentSchema,
  type RequestSaleDTO, type ResponseSaleDTO,
  type RequestSalePaymentDTO, type ResponseSalePaymentDTO, type SalePaymentSummaryDTO,
  WEIGHT_UNITS
} from '../types/sale';
import {
  Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState, Pagination,
  TaxInvoiceModal, CopyableSequence, CreateCustomerModal, Skeleton
} from '@/components';
import { formatCurrency, formatDate, formatNumber } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  PARTIALLY_PAID: 'warning',
  PENDING: 'danger',
};

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'] as const;

export const isSaleFullyPaid = (status?: string | null) =>
  status === 'PAID' || status === 'COMPLETED';

// ── Live Sale Summary Panel for Payment Modal ────────────────────────────────
function SaleSummaryPanel({ saleId }: { saleId: string }) {
  const { data: summary, isLoading } = useQuery<SalePaymentSummaryDTO>({
    queryKey: ['sale-summary', saleId],
    queryFn: () => getSalePaymentSummary(saleId),
    enabled: !!saleId,
  });

  if (!saleId) return null;
  if (isLoading) return (
    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 space-y-2 animate-pulse border border-emerald-100 dark:border-emerald-900/40">
      <div className="h-3.5 bg-emerald-100 dark:bg-emerald-900/60 rounded w-2/3" />
      <div className="h-3 bg-emerald-100 dark:bg-emerald-900/60 rounded w-1/2" />
    </div>
  );
  if (!summary) return null;

  return (
    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
        <span className="truncate pr-2">{summary.customerName}</span>
        <CopyableSequence
          value={summary.saleNumber}
          plainText
          badgeClassName="font-mono text-xs text-emerald-950 dark:text-emerald-200 font-bold bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded"
        />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-[#0E141E] rounded-lg p-2.5 text-center border border-emerald-100/80 dark:border-[#1E293B] shadow-2xs">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase font-medium">Total Bill</p>
          <p className="font-bold tabular-nums text-gray-900 dark:text-slate-100 text-sm mt-0.5">{formatCurrency(summary.totalAmount)}</p>
        </div>
        <div className="bg-white dark:bg-[#0E141E] rounded-lg p-2.5 text-center border border-emerald-100/80 dark:border-[#1E293B] shadow-2xs">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase font-medium">Received</p>
          <p className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">{formatCurrency(summary.receivedAmount)}</p>
        </div>
        <div className="bg-white dark:bg-[#0E141E] rounded-lg p-2.5 text-center border border-emerald-100/80 dark:border-[#1E293B] shadow-2xs">
          <p className="text-[11px] text-gray-500 dark:text-slate-400 uppercase font-medium">Pending</p>
          <p className="font-bold tabular-nums text-amber-700 dark:text-amber-400 text-sm mt-0.5">{formatCurrency(summary.pendingAmount)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Live preview sub-component ──────────────────────────────────────────────
function SaleTotalsPreview({ control, alreadyReceived }: { control: any; alreadyReceived?: number }) {
  const weight       = Number(useWatch({ control, name: 'weight' }))       || 0;
  const ratePerUnit  = Number(useWatch({ control, name: 'ratePerUnit' }))  || 0;
  const gstPct       = Number(useWatch({ control, name: 'gstPercentage' })) ?? 18;

  const amount    = weight * ratePerUnit;
  const gstAmount = (amount * gstPct) / 100;
  const total     = amount + gstAmount;

  if (amount === 0) return null;

  const isBelowReceived = Boolean(alreadyReceived && alreadyReceived > 0 && total < (alreadyReceived - 0.009));

  return (
    <div className="bg-gray-50 dark:bg-[#0E141E] rounded-lg p-4 border border-gray-200 dark:border-[#1E293B] mt-4">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2 tracking-wide">Live Preview (UI only)</p>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-slate-400">Subtotal</span>
          <span className="tabular-nums text-gray-900 dark:text-slate-100">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-slate-400">GST ({gstPct}%)</span>
          <span className="tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(gstAmount)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-gray-200 dark:border-[#1E293B] pt-1 mt-1">
          <span className="text-gray-900 dark:text-slate-100">Estimated Total</span>
          <span className="tabular-nums text-gray-900 dark:text-slate-100">{formatCurrency(total)}</span>
        </div>
        {Boolean(alreadyReceived && alreadyReceived > 0) && (
          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 pt-1">
            <span>Already Received</span>
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(alreadyReceived!)}</span>
          </div>
        )}
      </div>

      {isBelowReceived && (
        <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>
            Total sale invoice amount ({formatCurrency(total)}) cannot be less than the already received amount ({formatCurrency(alreadyReceived!)}). Please adjust the price or quantity.
          </span>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Final total confirmed &amp; stored by backend on save.</p>
    </div>
  );
}

// ── Payment Mode Badge ──────────────────────────────────────────────────────
function PaymentModeBadge({ mode }: { mode: string }) {
  const normalized = (mode || '').toUpperCase().replace(/_/g, ' ');
  switch (normalized) {
    case 'CASH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
          Cash
        </span>
      );
    case 'BANK TRANSFER':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800/60">
          Bank Transfer
        </span>
      );
    case 'UPI':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60">
          UPI
        </span>
      );
    case 'CHEQUE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
          Cheque
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200/80 dark:border-slate-700">
          {normalized || 'Other'}
        </span>
      );
  }
}

// ── Sale Payments Drawer Sub-component ──────────────────────────────────
function SalePaymentsDrawerSection({
  salePublicId,
  totalAmount,
  paymentStatus: _paymentStatus,
}: {
  salePublicId: string;
  totalAmount: number;
  paymentStatus?: string;
}) {
  const { data: payments = [], isLoading } = useQuery<ResponseSalePaymentDTO[]>({
    queryKey: ['sale-payments', salePublicId],
    queryFn: () => getPaymentsBySale(salePublicId),
  });

  // Sort payments chronologically so running balance reads top-to-bottom naturally
  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      const dateA = new Date(a.paymentDate).getTime();
      const dateB = new Date(b.paymentDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return createdA - createdB;
    });
  }, [payments]);

  // Compute total received and per-payment running balance
  const { paymentsWithBalance, totalReceived, remaining } = useMemo(() => {
    let accumulated = 0;
    const computed = sortedPayments.map((pmt) => {
      const received = Number(pmt.amountReceived) || 0;
      accumulated += received;
      const remainingAfter = Math.max(0, Number((totalAmount - accumulated).toFixed(2)));
      return {
        ...pmt,
        runningRemaining: remainingAfter,
      };
    });
    const finalRemaining = Math.max(0, Number((totalAmount - accumulated).toFixed(2)));
    return {
      paymentsWithBalance: computed,
      totalReceived: accumulated,
      remaining: finalRemaining,
    };
  }, [sortedPayments, totalAmount]);

  return (
    <div className="border-t border-gray-200/80 dark:border-[#1E293B] pt-3.5 mt-3.5 space-y-3">
      {/* Top Header & Summary Dock */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-gray-50/70 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">
                Customer Payment History
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200/70 dark:bg-[#1E293B] text-gray-700 dark:text-slate-300">
                {formatNumber(payments.length)} {payments.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Track all customer payment receipts against this sale invoice
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Summary stats pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white dark:bg-[#0E141E] border border-gray-200/80 dark:border-[#243245] shadow-2xs">
            <span className="text-gray-500 dark:text-slate-400">
              Invoice: <strong className="text-gray-900 dark:text-slate-100 font-semibold tabular-nums">{formatCurrency(totalAmount)}</strong>
            </span>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            <span className="text-gray-500 dark:text-slate-400">
              Received: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">{formatCurrency(totalReceived)}</strong>
            </span>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            {remaining > 0 ? (
              <span className="text-gray-500 dark:text-slate-400">
                Pending: <strong className="text-amber-700 dark:text-amber-400 font-semibold tabular-nums">{formatCurrency(remaining)}</strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Fully Paid
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body: Loading, Empty, or Semantic Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white dark:bg-[#0E141E] p-4 rounded-xl border border-dashed border-gray-200 dark:border-[#243245] text-xs text-gray-500 dark:text-slate-400 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-[#161F2E] text-gray-400 dark:text-slate-500 shrink-0">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-gray-700 dark:text-slate-300">
              No payments have been received for this sale invoice yet.
            </p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              Record customer payments to track settlement against this invoice.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200/90 dark:border-[#1E293B] shadow-2xs bg-white dark:bg-[#0E141E] w-full">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#161F2E] border-b border-gray-200 dark:border-[#1E293B] text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 select-none">
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[140px]">Payment #</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[110px]">Payment Date</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[120px]">Payment Method</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[120px]">Reference #</th>
                <th className="px-3.5 py-2.5 min-w-[150px]">Notes / Remarks</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[120px] text-right">Amount Received</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[130px] text-right">Remaining Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1E293B]">
              {paymentsWithBalance.map((pmt) => (
                <tr
                  key={pmt.publicId}
                  className="hover:bg-gray-50/70 dark:hover:bg-[#161F2E]/80 transition-colors"
                >
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <CopyableSequence
                      value={pmt.paymentNumber}
                      size="xs"
                      badgeClassName="font-mono font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-[#161F2E] px-1.5 py-0.5 rounded border border-gray-200/80 dark:border-[#243245] text-[11px]"
                    />
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-gray-700 dark:text-slate-300 font-medium">
                    {formatDate(pmt.paymentDate)}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <PaymentModeBadge mode={pmt.paymentMode} />
                  </td>
                  <td className="px-3.5 py-2.5">
                    {pmt.referenceNumber ? (
                      <span
                        className="font-mono text-[11px] text-gray-700 dark:text-slate-300 bg-gray-100/80 dark:bg-[#161F2E] px-1.5 py-0.5 rounded border border-gray-200/70 dark:border-[#243245] max-w-[130px] truncate inline-block align-middle"
                        title={pmt.referenceNumber}
                      >
                        {pmt.referenceNumber}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5">
                    {pmt.remarks ? (
                      <span
                        className="text-gray-600 dark:text-slate-400 italic text-[11px] max-w-[200px] truncate inline-block align-middle"
                        title={pmt.remarks}
                      >
                        {pmt.remarks}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(pmt.amountReceived)}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-right tabular-nums">
                    {pmt.runningRemaining > 0 ? (
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                        {formatCurrency(pmt.runningRemaining)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-end gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="h-3 w-3" /> ₹0.00
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/90 dark:bg-[#161F2E] border-t border-gray-200 dark:border-[#243245] font-semibold text-xs">
                <td colSpan={5} className="px-3.5 py-2.5 text-right text-gray-600 dark:text-slate-400">
                  Total Received:
                </td>
                <td className="px-3.5 py-2.5 text-right text-emerald-700 dark:text-emerald-400 tabular-nums font-bold">
                  {formatCurrency(totalReceived)}
                </td>
                <td className="px-3.5 py-2.5 text-right tabular-nums">
                  {remaining > 0 ? (
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      {formatCurrency(remaining)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-end gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="h-3 w-3" /> Fully Settled
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Sales() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<ResponseSaleDTO | null>(null);
  const [invoiceSale, setInvoiceSale] = useState<ResponseSaleDTO | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ customerPublicId: '', startDate: '', endDate: '' });

  const { data: salePage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sales', page, filters],
    queryFn: () => getSales({ page, size: 15, ...filters }),
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers', 'active'], queryFn: getActiveCustomers });
  const [extraCustomers, setExtraCustomers] = useState<ResponseCustomerDTO[]>([]);
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);

  const allCustomers = useMemo(() => {
    const map = new Map<string, ResponseCustomerDTO>();
    customers.forEach(c => map.set(c.publicId, c));
    extraCustomers.forEach(c => map.set(c.publicId, c));
    return Array.from(map.values());
  }, [customers, extraCustomers]);

  const activeCustomers = allCustomers.filter(c => c.isActive);

  const { data: activeStocks = [] } = useQuery({ queryKey: ['stocks', 'active'], queryFn: getActiveStocks });

  const { data: receivableTotal } = useQuery({
    queryKey: ['receivable-total'],
    queryFn: getReceivableTotal,
  });

  const { data: pendingSales = [] } = useQuery({
    queryKey: ['pending-sales'],
    queryFn: getPendingSalePayments,
  });

  const [rawMaterialMode, setRawMaterialMode] = useState<'pick' | 'new'>('pick');

  // ── Deletion State & Handlers ──
  const [deletingSale, setDeletingSale] = useState<ResponseSaleDTO | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleOpenDeleteModal = (s: ResponseSaleDTO) => {
    setDeletingSale(s);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingSale(null);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-sales'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-summary'] });
      handleCloseDeleteModal();
      toast.success('Sale invoice deleted and material returned to stock inventory.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete sale invoice.'),
  });

  // ── Payment Modal State & Handlers ──
  const [paymentSale, setPaymentSale] = useState<ResponseSaleDTO | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPayment,
    setValue: setPaymentValue,
    formState: { errors: paymentErrors },
  } = useForm<RequestSalePaymentDTO>({
    resolver: zodResolver(salePaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      amountReceived: 0,
      referenceNumber: '',
      remarks: '',
    },
  });

  const { data: activePaymentSummary } = useQuery<SalePaymentSummaryDTO>({
    queryKey: ['sale-summary', paymentSale?.publicId],
    queryFn: () => getSalePaymentSummary(paymentSale!.publicId),
    enabled: !!paymentSale,
  });

  useEffect(() => {
    if (activePaymentSummary && isPaymentModalOpen) {
      setPaymentValue('amountReceived', activePaymentSummary.pendingAmount);
    }
  }, [activePaymentSummary, isPaymentModalOpen, setPaymentValue]);

  const handleOpenPaymentModal = (s: ResponseSaleDTO) => {
    if (isSaleFullyPaid(s.paymentStatus)) {
      toast.info('This sale invoice has already been fully paid.');
      return;
    }
    setPaymentSale(s);
    resetPayment({
      salePublicId: s.publicId,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      amountReceived: s.totalAmount,
      referenceNumber: '',
      remarks: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentSale(null);
    resetPayment();
  };

  const paymentMutation = useMutation({
    mutationFn: createSalePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['salePayments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-summary'] });
      queryClient.invalidateQueries({ queryKey: ['pending-sales'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      handleClosePaymentModal();
      toast.success('Payment received successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to receive payment.'),
  });

  const onPaymentSubmit = (data: RequestSalePaymentDTO) => {
    if (paymentSale && isSaleFullyPaid(paymentSale.paymentStatus)) {
      toast.info('This sale invoice has already been fully paid.');
      return;
    }
    if (activePaymentSummary && data.amountReceived > activePaymentSummary.pendingAmount) {
      toast.error(`Amount received cannot exceed pending balance of ${formatCurrency(activePaymentSummary.pendingAmount)}`);
      return;
    }
    paymentMutation.mutate({
      ...data,
      salePublicId: paymentSale!.publicId,
    });
  };

  // ── Sale Form State ──
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<RequestSaleDTO>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      saleDate:      new Date().toISOString().split('T')[0],
      unit:          'KG',
      gstPercentage: 18,
    },
  });
  const selectedCustomerPublicId = useWatch({ control, name: 'customerPublicId' });
  const watchRawMaterial = useWatch({ control, name: 'rawMaterial' });
  
  const { field: rawMaterialField } = useController({ control, name: 'rawMaterial' });

  // Query payment summary for currently selected editing sale
  const { data: editSaleSummary } = useQuery<SalePaymentSummaryDTO>({
    queryKey: ['sale-summary', editingSale?.publicId],
    queryFn: () => getSalePaymentSummary(editingSale!.publicId),
    enabled: !!editingSale?.publicId,
  });

  const isSalePaid = Boolean(
    editingSale && (
      editingSale.paymentStatus !== 'PENDING' ||
      (editSaleSummary && editSaleSummary.receivedAmount > 0)
    )
  );

  const alreadyReceivedAmount = editSaleSummary?.receivedAmount ?? (
    editingSale && isSaleFullyPaid(editingSale.paymentStatus)
      ? editingSale.totalAmount
      : 0
  );

  const isCustomerLocked = isSalePaid;

  const watchWeight = Number(useWatch({ control, name: 'weight' })) || 0;
  const watchRate = Number(useWatch({ control, name: 'ratePerUnit' })) || 0;
  const watchGst = Number(useWatch({ control, name: 'gstPercentage' })) ?? 18;

  const saleSubtotal = watchWeight * watchRate;
  const saleTax = (saleSubtotal * watchGst) / 100;
  const saleEstimatedTotal = saleSubtotal + saleTax;

  const isSalePriceTooLow = Boolean(
    editingSale &&
    alreadyReceivedAmount > 0 &&
    saleEstimatedTotal < (alreadyReceivedAmount - 0.009)
  );

  // Stock limit calculation for sale weight
  const matchedStock = activeStocks.find(
    s => s.rawMaterial.toLowerCase() === (watchRawMaterial || '').trim().toLowerCase()
  );
  const maxAvailableStock = useMemo(() => {
    if (!matchedStock) return 0;
    const baseStock = matchedStock.currentQuantity ?? 0;
    const existingWeight = (editingSale && editingSale.rawMaterial.toLowerCase() === matchedStock.rawMaterial.toLowerCase())
      ? (editingSale.weight ?? 0)
      : 0;
    return Number((baseStock + existingWeight).toFixed(3));
  }, [matchedStock, editingSale]);

  const isSaleWeightTooHigh = Boolean(
    matchedStock &&
    maxAvailableStock > 0 &&
    watchWeight > maxAvailableStock
  );

  const mutation = useMutation({
    mutationFn: (data: RequestSaleDTO) =>
      editingSale ? updateSale(editingSale.publicId, data) : createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-sales'] });
      queryClient.invalidateQueries({ queryKey: ['receivable-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['party-statement'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['sale-payments'] });
      queryClient.invalidateQueries({ queryKey: ['sale-summary'] });
      handleCloseModal();
      toast.success(editingSale ? 'Sale updated successfully.' : 'Sale recorded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save sale.'),
  });

  const onSubmit = (data: RequestSaleDTO) => {
    const existingStock = activeStocks.find(
      s => s.rawMaterial.toLowerCase() === data.rawMaterial.trim().toLowerCase()
    );

    if (existingStock && maxAvailableStock > 0 && data.weight > maxAvailableStock) {
      toast.error(`Quantity cannot exceed available stock (${formatNumber(maxAvailableStock)} ${existingStock.unit}). Current stock is ${formatNumber(existingStock.currentQuantity)} ${existingStock.unit}.`);
      return;
    }

    // Enforce total sale amount cannot be less than already received amount
    const subtotal = data.weight * data.ratePerUnit;
    const total = Number((subtotal * (1 + (data.gstPercentage / 100))).toFixed(2));
    if (editingSale && alreadyReceivedAmount > 0 && total < (alreadyReceivedAmount - 0.009)) {
      toast.error(`Total sale invoice amount (${formatCurrency(total)}) cannot be less than the already received amount (${formatCurrency(alreadyReceivedAmount)}). Please adjust the price or quantity.`);
      return;
    }

    const payload: RequestSaleDTO = {
      ...data,
      rawMaterial: isSalePaid && editingSale
        ? editingSale.rawMaterial
        : (existingStock ? existingStock.rawMaterial : data.rawMaterial.trim()),
      unit: isSalePaid && editingSale
        ? (editingSale.unit as any)
        : (existingStock ? (existingStock.unit as any) : data.unit),
      customerPublicId: isCustomerLocked && editingSale?.customer
        ? editingSale.customer.publicId
        : data.customerPublicId,
    };
    mutation.mutate(payload);
  };

  const handleOpenModal = (sale?: ResponseSaleDTO) => {
    if (sale) {
      setEditingSale(sale);
      const matched = activeStocks.find(s => s.rawMaterial.toLowerCase() === (sale.rawMaterial || '').trim().toLowerCase());
      setRawMaterialMode(matched ? 'pick' : 'new');
      reset({
        customerPublicId: sale.customer?.publicId ?? '',
        saleDate: sale.saleDate.split('T')[0],
        customerInvoiceNumber: sale.customerInvoiceNumber ?? '',
        rawMaterial: sale.rawMaterial ?? '',
        weight: sale.weight ?? 0,
        unit: (sale.unit as any) ?? 'KG',
        ratePerUnit: sale.ratePerUnit ?? 0,
        gstPercentage: sale.gstPercentage ?? 18,
      });
    } else {
      setEditingSale(null);
      reset({
        customerPublicId: '',
        customerInvoiceNumber: '',
        rawMaterial: '',
        weight: 0,
        ratePerUnit: 0,
        saleDate:      new Date().toISOString().split('T')[0],
        unit:          'KG',
        gstPercentage: 18,
      });
      setRawMaterialMode('pick');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); reset(); setEditingSale(null); setRawMaterialMode('pick'); };

  const sales = salePage?.content ?? [];

  const summaryInvoiced = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const fullyCollected = sales
    .filter(s => isSaleFullyPaid(s.paymentStatus))
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> New Sale Invoice
          </Button>
        }
      />

      {/* KPI Ribbon (Ledger Benchmark) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Sales</span>
            <TrendingUp className="h-4 w-4 text-blue-500 dark:text-sky-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-blue-700 dark:text-sky-400 mt-1">
            {formatCurrency(summaryInvoiced)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{sales.length} invoices listed</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fully Collected Sales</span>
            <TrendingDown className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(fullyCollected)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Fully paid invoices</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Uncollected Invoices</span>
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700 dark:text-amber-400 mt-1">
            {pendingSales.length} Invoices
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Pending payment from customers</span>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">Total Amount to Collect</span>
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-800 dark:text-amber-200 mt-1">
            {formatCurrency(receivableTotal ?? 0)}
          </p>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Total money due from customers</span>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-[#121824] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1E293B] shadow-xs flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Customer</label>
          <select
            className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors shadow-2xs"
            value={filters.customerPublicId}
            onChange={e => { setFilters(f => ({ ...f, customerPublicId: e.target.value })); setPage(0); }}
          >
            <option value="">All Customers</option>
            {activeCustomers.map(c => <option key={c.publicId} value={c.publicId}>{c.customerName}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">From Date</label>
          <input type="date" className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors shadow-2xs"
            value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(0); }} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">To Date</label>
          <input type="date" className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors shadow-2xs"
            value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(0); }} />
        </div>
        {(filters.customerPublicId || filters.startDate || filters.endDate) && (
          <div className="flex items-end">
            <Button variant="outline" size="sm" className="h-10 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-[#222D3D] hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setFilters({ customerPublicId: '', startDate: '', endDate: '' }); setPage(0); }}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load sales'} onRetry={() => refetch()} />
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales found"
          description="Try adjusting the filters or record a new sale invoice."
          action={
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> New Sale Invoice
            </Button>
          }
        />
      ) : (
        <div className="w-full space-y-4">
          <div className="space-y-3">
            {/* Column Header Guide Bar */}
          <div className="hidden lg:grid grid-cols-[90px_minmax(130px,1.2fr)_minmax(110px,1.3fr)_minmax(70px,0.8fr)_minmax(75px,0.9fr)_minmax(65px,0.8fr)_minmax(75px,0.9fr)_85px_minmax(175px,1.2fr)_28px] items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Date</div>
            <div className="min-w-0">Invoice #</div>
            <div className="min-w-0">Customer</div>
            <div className="min-w-0">Customer Ref #</div>
            <div className="min-w-0 text-right">Sales Amount</div>
            <div className="min-w-0 text-right">GST</div>
            <div className="min-w-0 text-right">Net Total</div>
            <div className="min-w-0">Status</div>
            <div className="min-w-0 text-right pr-2">Actions</div>
            <div className="min-w-0 text-center"></div>
          </div>

          {/* List of Floating Cards */}
          {sales.map((s) => {
            const isExpanded = expandedRow === s.publicId;
            return (
              <div
                key={s.publicId}
                className={`bg-white dark:bg-[#121824] rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md w-full overflow-hidden ${
                  isExpanded
                    ? 'border-[var(--color-primary)]/50 dark:border-emerald-500/40 ring-1 ring-[var(--color-primary)]/20 shadow-sm'
                    : 'border-gray-200/90 dark:border-[#1E293B] hover:border-gray-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Desktop View: 10-column spreadsheet grid (hidden below lg) */}
                <div
                  className={`hidden lg:grid grid-cols-[90px_minmax(130px,1.2fr)_minmax(110px,1.3fr)_minmax(70px,0.8fr)_minmax(75px,0.9fr)_minmax(65px,0.8fr)_minmax(75px,0.9fr)_85px_minmax(175px,1.2fr)_28px] items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors rounded-2xl w-full ${
                    isExpanded ? 'bg-slate-50/50 dark:bg-[#161F2E] rounded-b-none' : 'hover:bg-gray-50/70 dark:hover:bg-[#182232]'
                  }`}
                  onClick={() => setExpandedRow(isExpanded ? null : s.publicId)}
                >
                  {/* Date */}
                  <div className="min-w-0 text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(s.saleDate)}
                  </div>

                  {/* Sale # */}
                  <div className="min-w-0">
                    <CopyableSequence
                      value={s.saleNumber}
                      badgeClassName="font-mono text-xs font-semibold text-blue-700 dark:text-sky-300 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/80 dark:border-blue-800/50"
                    />
                  </div>

                  {/* Customer */}
                  <div className="min-w-0 font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={s.customer?.customerName}>
                    {s.customer?.customerName || '—'}
                  </div>

                  {/* Invoice # */}
                  <div className="min-w-0 text-xs text-gray-500 dark:text-slate-400 font-mono truncate" title={s.customerInvoiceNumber}>
                    {s.customerInvoiceNumber || '—'}
                  </div>

                  {/* Amount */}
                  <div className="min-w-0 text-right text-sm tabular-nums text-blue-700 dark:text-sky-400 font-semibold">
                    {formatCurrency(s.amount)}
                  </div>

                  {/* GST */}
                  <div className="min-w-0 text-right text-sm tabular-nums text-amber-700 dark:text-amber-400 font-medium">
                    {formatCurrency(s.gstAmount)}
                  </div>

                  {/* Total */}
                  <div className="min-w-0 text-right text-sm tabular-nums font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(s.totalAmount)}
                  </div>

                  {/* Status */}
                  <div className="min-w-0">
                    <Badge variant={PAYMENT_STATUS_VARIANT[s.paymentStatus] ?? 'default'}>
                      {isSaleFullyPaid(s.paymentStatus) ? 'Fully Paid' : s.paymentStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!isSaleFullyPaid(s.paymentStatus) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 hover:border-emerald-400 gap-1 font-semibold transition-colors shadow-xs"
                        onClick={() => handleOpenPaymentModal(s)}
                        title="Receive Payment"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Receive
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-7 text-xs px-2 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 opacity-90 cursor-not-allowed gap-1 font-medium select-none shadow-xs"
                        title="This sale invoice has been fully paid. No outstanding balance."
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Fully Paid
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-blue-700 hover:text-blue-900 hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-blue-950/40 transition-colors rounded-lg border border-blue-200/60 dark:border-blue-800/40"
                      onClick={() => setInvoiceSale(s)}
                      title="Print Invoice / Bill"
                      aria-label={`Print Invoice for ${s.saleNumber}`}
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
                      onClick={() => handleOpenModal(s)}
                      title="Edit Sale Invoice"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className={
                        s.paymentStatus !== 'PENDING'
                          ? "h-7 w-7 text-gray-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-not-allowed opacity-60"
                          : "h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      }
                      onClick={() => {
                        if (s.paymentStatus !== 'PENDING') {
                          toast.warning(`Cannot delete sale ${s.saleNumber}: A payment has already been received against this invoice.`);
                        }
                        handleOpenDeleteModal(s);
                      }}
                      title={
                        s.paymentStatus !== 'PENDING'
                          ? "Cannot delete: A payment has already been received against this sale invoice"
                          : "Delete Sale Invoice"
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Expand/Collapse Chevron */}
                  <div className="flex justify-center">
                    <div className="p-1 rounded-md text-gray-400 hover:text-gray-700 transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile & Tablet Adaptive Card View (lg:hidden) */}
                <div
                  className={`lg:hidden p-3.5 sm:p-4 space-y-3 cursor-pointer select-none transition-colors rounded-2xl w-full ${
                    isExpanded ? 'bg-slate-50/50 dark:bg-[#161F2E] rounded-b-none' : 'hover:bg-gray-50/70 dark:hover:bg-[#182232]'
                  }`}
                  onClick={() => setExpandedRow(isExpanded ? null : s.publicId)}
                >
                  {/* Top Row: Sale Number, Date, Status, Chevron */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CopyableSequence
                        value={s.saleNumber}
                        badgeClassName="font-mono text-xs font-semibold text-blue-700 dark:text-sky-300 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/80 dark:border-blue-800/50"
                      />
                      <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(s.saleDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={PAYMENT_STATUS_VARIANT[s.paymentStatus] ?? 'default'}>
                        {isSaleFullyPaid(s.paymentStatus) ? 'Fully Paid' : s.paymentStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                      </Badge>
                      <div className="p-1 rounded-md text-gray-400 hover:text-gray-700 transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Customer Name & Customer Invoice Number */}
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Customer</p>
                      <p className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={s.customer?.customerName}>
                        {s.customer?.customerName || '—'}
                      </p>
                    </div>
                    {s.customerInvoiceNumber && (
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Customer Ref #</p>
                        <p className="text-xs font-mono text-gray-700 dark:text-slate-300">{s.customerInvoiceNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown: 3-column pill strip */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50/80 dark:bg-[#0E141E] p-2.5 rounded-xl border border-gray-100 dark:border-[#1E293B] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Subtotal</span>
                      <span className="font-semibold text-blue-700 dark:text-sky-400 tabular-nums break-words">{formatCurrency(s.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 block">GST</span>
                      <span className="font-medium text-amber-700 dark:text-amber-400 tabular-nums break-words">{formatCurrency(s.gstAmount)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Net Total</span>
                      <span className="font-bold text-gray-900 dark:text-slate-100 tabular-nums break-words">{formatCurrency(s.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100 dark:border-[#1E293B]" onClick={(e) => e.stopPropagation()}>
                    {!isSaleFullyPaid(s.paymentStatus) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs px-3 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 hover:border-emerald-400 gap-1 font-semibold transition-colors shadow-xs"
                        onClick={() => handleOpenPaymentModal(s)}
                        title="Receive Payment"
                      >
                        <CreditCard className="h-3.5 w-3.5" /> Receive
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="h-8 text-xs px-2.5 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 opacity-90 cursor-not-allowed gap-1 font-medium select-none shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Fully Paid
                      </Button>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-blue-700 hover:text-blue-900 hover:bg-blue-50 dark:text-sky-400 dark:hover:bg-blue-950/40 transition-colors rounded-lg border border-blue-200/60 dark:border-blue-800/40"
                      onClick={() => setInvoiceSale(s)}
                      title="Print Invoice / Bill"
                      aria-label={`Print Invoice for ${s.saleNumber}`}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
                      onClick={() => handleOpenModal(s)}
                      title="Edit Sale Invoice"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className={
                        s.paymentStatus !== 'PENDING'
                          ? "h-8 w-8 text-gray-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-not-allowed opacity-60"
                          : "h-8 w-8 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      }
                      onClick={() => {
                        if (s.paymentStatus !== 'PENDING') {
                          toast.warning(`Cannot delete sale ${s.saleNumber}: A payment has already been received against this invoice.`);
                        }
                        handleOpenDeleteModal(s);
                      }}
                      title={
                        s.paymentStatus !== 'PENDING'
                          ? "Cannot delete: A payment has already been received against this sale invoice"
                          : "Delete Sale Invoice"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                  {/* Expandable Detail Panel */}
                  {isExpanded && (
                    <div className="bg-gradient-to-b from-slate-50/90 to-slate-50/40 dark:from-[#161F2E] dark:to-[#121824] border-t border-gray-100 dark:border-[#1E293B] px-6 py-4 rounded-b-xl space-y-4">
                      {/* Section 1: Sold Items & Material Details */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
                          Sold Items & Material Details
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-[#0E141E] p-3.5 rounded-lg border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Item / Material Sold</p>
                            <p className="font-semibold text-sm text-gray-900 dark:text-slate-100">{s.rawMaterial}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Quantity / Weight</p>
                            <p className="tabular-nums font-semibold text-sm text-gray-900 dark:text-slate-100">{formatNumber(s.weight)} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{s.unit}</span></p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Selling Price per Unit</p>
                            <p className="tabular-nums font-semibold text-sm text-gray-900 dark:text-slate-100">{formatCurrency(s.ratePerUnit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Tax (GST %)</p>
                            <p className="tabular-nums font-semibold text-sm text-gray-900 dark:text-slate-100">{s.gstPercentage}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Associated Customer Payment Records */}
                      <SalePaymentsDrawerSection
                        salePublicId={s.publicId}
                        totalAmount={s.totalAmount}
                        paymentStatus={s.paymentStatus}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {salePage && salePage.totalPages > 1 && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200 shadow-xs flex justify-center">
              <Pagination currentPage={salePage.number} totalPages={salePage.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Sale Modal */}
      {/* Add / Edit Sale Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}
        title={editingSale ? `Edit Sale Invoice — ${editingSale.saleNumber}` : 'New Sale Invoice'}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Sale Number — read-only when editing */}
          {editingSale && (
            <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Invoice #</span>
              <CopyableSequence
                value={editingSale.saleNumber}
                plainText
                badgeClassName="font-mono font-bold text-gray-800"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Customer *</label>
                {!isCustomerLocked && (
                  <button
                    type="button"
                    onClick={() => setIsCreateCustomerModalOpen(true)}
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Create New Customer
                  </button>
                )}
              </div>
              <select
                id="sale-customer-select"
                disabled={isCustomerLocked}
                value={selectedCustomerPublicId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__CREATE_NEW_CUSTOMER__') {
                    setIsCreateCustomerModalOpen(true);
                  } else {
                    setValue('customerPublicId', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }
                }}
                className={`flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  isCustomerLocked
                    ? 'bg-gray-100 dark:bg-[#161F2E] text-gray-500 dark:text-slate-400 cursor-not-allowed opacity-90'
                    : 'bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-100'
                }`}
              >
                <option value="">Select customer…</option>
                {!isCustomerLocked && (
                  <option value="__CREATE_NEW_CUSTOMER__" className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                    + Create New Customer…
                  </option>
                )}
                <option disabled value="">──────────────</option>
                {activeCustomers.map(c => <option key={c.publicId} value={c.publicId}>{c.customerName}</option>)}
                {selectedCustomerPublicId && !activeCustomers.some(c => c.publicId === selectedCustomerPublicId) && (
                  <option value={selectedCustomerPublicId}>
                    {allCustomers.find(c => c.publicId === selectedCustomerPublicId)?.customerName || 'Selected Customer'}
                  </option>
                )}
              </select>
              {isCustomerLocked && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Customer cannot be changed because payment has already been received for this sale invoice.
                </p>
              )}
              {errors.customerPublicId && <p className="text-red-500 text-xs mt-1">{errors.customerPublicId.message}</p>}
            </div>
            <Input label="Sale Date *" type="date" {...register('saleDate')} error={errors.saleDate?.message} />
            <Input label="Customer Reference / Bill Number" {...register('customerInvoiceNumber')} error={errors.customerInvoiceNumber?.message} />
          </div>

          {/* ── Line Item ── */}
          <div className="border border-gray-200 dark:border-[#1E293B] rounded-lg p-4 space-y-4 bg-gray-50/50 dark:bg-[#121824]">
            <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm">Item Details *</h4>

            {/* Row 1: Raw Material */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Item / Material Sold *</label>

              {rawMaterialMode === 'pick' ? (
                <select
                  disabled={isSalePaid}
                  value={rawMaterialField.value ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      rawMaterialField.onChange('');
                      setRawMaterialMode('new');
                    } else {
                      rawMaterialField.onChange(val);
                      const stock = activeStocks.find(s => s.rawMaterial.toLowerCase() === val.trim().toLowerCase());
                      if (stock) setValue('unit', stock.unit as any);
                    }
                  }}
                  className={`flex h-9 w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isSalePaid
                      ? 'border-gray-200 dark:border-[#222D3D] bg-gray-100 dark:bg-[#161F2E] text-gray-500 dark:text-slate-400 cursor-not-allowed opacity-90'
                      : 'border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100'
                  }`}
                >
                  <option value="">Select item / material…</option>
                  {activeStocks.map(s => (
                    <option key={s.publicId} value={s.rawMaterial}>
                      {s.rawMaterial} ({s.unit}) — Available: {s.currentQuantity} {s.unit}
                    </option>
                  ))}
                  {rawMaterialField.value && !activeStocks.some(s => s.rawMaterial.toLowerCase() === rawMaterialField.value.trim().toLowerCase()) && (
                    <option value={rawMaterialField.value}>
                      {rawMaterialField.value} ({useWatch({ control, name: 'unit' }) || 'KG'})
                    </option>
                  )}
                  {!isSalePaid && (
                    <option value="__new__">＋ Add new material…</option>
                  )}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter item or material name..."
                    value={rawMaterialField.value ?? ''}
                    onChange={e => {
                      rawMaterialField.onChange(e.target.value);
                      const matched = activeStocks.find(s => s.rawMaterial.toLowerCase() === e.target.value.trim().toLowerCase());
                      if (matched) {
                        setValue('unit', matched.unit as any);
                      }
                    }}
                    className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setRawMaterialMode('pick'); rawMaterialField.onChange(''); }}>
                    ← Choose from list
                  </Button>
                </div>
              )}

              {isSalePaid && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Material is locked because payments have already been recorded against this sale invoice.
                </p>
              )}
              {errors.rawMaterial && <p className="text-red-500 text-xs mt-1">{errors.rawMaterial.message}</p>}
            </div>

            {/* Row 2: Weight | Unit | Rate/Unit | GST% */}
            <div className="grid grid-cols-12 gap-3">
              {/* Weight */}
              <div className="col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Quantity / Weight *</label>
                  {matchedStock && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Available: {matchedStock.currentQuantity} {matchedStock.unit}
                    </span>
                  )}
                </div>
                <input
                  type="number" step="0.001" min="0.001" placeholder="0.000"
                  max={maxAvailableStock > 0 ? maxAvailableStock : undefined}
                  {...register('weight', {
                    valueAsNumber: true,
                    validate: (val) => {
                      if (val <= 0) return 'Quantity must be greater than zero';
                      if (matchedStock && maxAvailableStock > 0 && val > maxAvailableStock) {
                        return `Exceeds available stock (${maxAvailableStock} ${matchedStock.unit})`;
                      }
                      if (editingSale && alreadyReceivedAmount > 0) {
                        const estimated = Number((val * watchRate * (1 + (watchGst / 100))).toFixed(2));
                        if (estimated < (alreadyReceivedAmount - 0.009)) {
                          return `Total sale amount (${formatCurrency(estimated)}) cannot be less than already received (${formatCurrency(alreadyReceivedAmount)})`;
                        }
                      }
                      return true;
                    }
                  })}
                  className={`flex h-9 w-full rounded-md border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isSaleWeightTooHigh
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                      : 'border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100'
                  }`}
                />
                {isSaleWeightTooHigh ? (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Exceeds available stock ({formatNumber(maxAvailableStock)} {matchedStock?.unit ?? 'KG'})
                  </p>
                ) : (
                  editingSale && maxAvailableStock > 0 && (
                    <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                      Max allowed: {formatNumber(maxAvailableStock)} {matchedStock?.unit ?? 'KG'}
                    </p>
                  )
                )}
                {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>}
              </div>

              {/* Unit */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Unit *</label>
                <select
                  disabled={isSalePaid}
                  {...register('unit')}
                  className={`flex h-9 w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isSalePaid
                      ? 'border-gray-200 dark:border-[#222D3D] bg-gray-100 dark:bg-[#161F2E] text-gray-500 dark:text-slate-400 cursor-not-allowed opacity-90'
                      : 'border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100'
                  }`}
                >
                  {WEIGHT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
              </div>

              {/* Rate per unit */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Selling Price per Unit (₹) *</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  {...register('ratePerUnit', {
                    valueAsNumber: true,
                    validate: (val) => {
                      if (val <= 0) return 'Selling price must be greater than zero';
                      if (editingSale && alreadyReceivedAmount > 0) {
                        const estimated = Number((watchWeight * val * (1 + (watchGst / 100))).toFixed(2));
                        if (estimated < (alreadyReceivedAmount - 0.009)) {
                          return `Total sale amount (${formatCurrency(estimated)}) cannot be less than already received (${formatCurrency(alreadyReceivedAmount)})`;
                        }
                      }
                      return true;
                    }
                  })}
                  className={`flex h-9 w-full rounded-md border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isSalePriceTooLow
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                      : 'border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100'
                  }`}
                />
                {isSalePriceTooLow && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Total sale amount cannot be less than already received ({formatCurrency(alreadyReceivedAmount)})
                  </p>
                )}
                {errors.ratePerUnit && <p className="text-red-500 text-xs mt-1">{errors.ratePerUnit.message}</p>}
              </div>

              {/* GST % */}
              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tax (GST %) *</label>
                <input
                  type="number" step="0.01" min="0" max="100" placeholder="18"
                  {...register('gstPercentage', { valueAsNumber: true })}
                  className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.gstPercentage && <p className="text-red-500 text-xs mt-1">{errors.gstPercentage.message}</p>}
              </div>
            </div>

            <SaleTotalsPreview control={control} alreadyReceived={alreadyReceivedAmount} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1E293B]">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button
              type="submit"
              isLoading={mutation.isPending}
              disabled={isSaleWeightTooHigh || isSalePriceTooLow}
            >
              {editingSale ? 'Save Changes' : 'Save Sale Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Receive Payment Modal ── */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        title={`Receive Payment: ${paymentSale?.saleNumber ?? ''}`}
        className="max-w-xl"
      >
        {(() => {
          const isCurrentPaymentFullyPaid = Boolean(paymentSale && isSaleFullyPaid(paymentSale.paymentStatus));
          return (
            <form onSubmit={handleSubmitPayment(onPaymentSubmit)} className="space-y-4">
              {paymentSale && <SaleSummaryPanel saleId={paymentSale.publicId} />}

              {isCurrentPaymentFullyPaid && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>This sale invoice has already been fully paid. There is no remaining balance.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Payment Date *"
                  type="date"
                  disabled={isCurrentPaymentFullyPaid}
                  {...registerPayment('paymentDate')}
                  error={paymentErrors.paymentDate?.message}
                />
                <Input
                  label={activePaymentSummary ? `Amount Received * (Pending: ${formatCurrency(activePaymentSummary.pendingAmount)})` : 'Amount Received *'}
                  type="number"
                  step="0.01"
                  disabled={isCurrentPaymentFullyPaid}
                  max={activePaymentSummary?.pendingAmount}
                  {...registerPayment('amountReceived', {
                    valueAsNumber: true,
                    validate: (val) => {
                      if (activePaymentSummary && activePaymentSummary.pendingAmount <= 0) {
                        return 'Sale invoice is already fully paid';
                      }
                      if (activePaymentSummary && val > activePaymentSummary.pendingAmount) {
                        return `Amount cannot exceed pending balance of ${formatCurrency(activePaymentSummary.pendingAmount)}`;
                      }
                      if (val <= 0) {
                        return 'Amount must be greater than zero';
                      }
                      return true;
                    },
                  })}
                  error={paymentErrors.amountReceived?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Method *</label>
                <select
                  disabled={isCurrentPaymentFullyPaid}
                  {...registerPayment('paymentMode')}
                  className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <Input
                label="Transaction / Reference # (Optional)"
                placeholder="Cheque no., UTR, bank txn ID, etc."
                disabled={isCurrentPaymentFullyPaid}
                {...registerPayment('referenceNumber')}
                error={paymentErrors.referenceNumber?.message}
              />
              <Input
                label="Notes / Remarks (Optional)"
                placeholder="Optional notes or details"
                disabled={isCurrentPaymentFullyPaid}
                {...registerPayment('remarks')}
                error={paymentErrors.remarks?.message}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1E293B]">
                <Button type="button" variant="outline" onClick={handleClosePaymentModal}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={isCurrentPaymentFullyPaid}
                  isLoading={paymentMutation.isPending}
                >
                  Receive Payment
                </Button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={deletingSale?.paymentStatus !== 'PENDING' ? "Cannot Delete Sale Invoice" : `Delete Sale Invoice: ${deletingSale?.saleNumber ?? ''}`}
        className="max-w-lg"
      >
        {deletingSale && (
          <div className="space-y-4">
            {deletingSale.paymentStatus !== 'PENDING' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl text-sm text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Cannot Delete This Sale Invoice</p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      A payment has already been received and recorded against sale invoice <strong>{deletingSale.saleNumber}</strong>.
                      To delete this sale, please delete or reverse all associated payments in the <strong>Customer Payments</strong> tab first.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button variant="outline" onClick={handleCloseDeleteModal}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Are you sure you want to delete this sale invoice? All associated records will be removed, and the sold material quantity will be automatically returned to inventory stock.
                </p>

                <div className="bg-gray-50 dark:bg-[#0E141E] p-4 rounded-xl border border-gray-200 dark:border-[#1E293B] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Invoice Number</span>
                    <span className="font-mono font-semibold text-gray-900 dark:text-slate-100">{deletingSale.saleNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Customer</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100">{deletingSale.customer?.customerName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-slate-400">Date</span>
                    <span className="text-gray-900 dark:text-slate-100">{formatDate(deletingSale.saleDate)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-[#1E293B] pt-2">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Stock Restored</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{formatNumber(deletingSale.weight)} {deletingSale.unit} of {deletingSale.rawMaterial}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 dark:border-[#1E293B] pt-2">
                    <span className="text-gray-500 dark:text-slate-400">Total Invoice Value</span>
                    <span className="font-bold text-gray-900 dark:text-slate-100 tabular-nums">{formatCurrency(deletingSale.totalAmount)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#1E293B]">
                  <Button type="button" variant="outline" onClick={handleCloseDeleteModal}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                    isLoading={deleteMutation.isPending}
                    onClick={() => {
                      if (deletingSale.paymentStatus !== 'PENDING') {
                        toast.warning('This sale invoice cannot be deleted because a payment has already been received against it.');
                        return;
                      }
                      deleteMutation.mutate(deletingSale.publicId);
                    }}
                  >
                    Delete Sale Invoice
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Tax Invoice Modal */}
      <TaxInvoiceModal
        isOpen={!!invoiceSale}
        onClose={() => setInvoiceSale(null)}
        sale={invoiceSale}
      />

      {/* ── Create Customer Modal (accessible from sale form) ── */}
      <CreateCustomerModal
        isOpen={isCreateCustomerModalOpen}
        onClose={() => setIsCreateCustomerModalOpen(false)}
        onSuccess={(newCustomer) => {
          setExtraCustomers(prev => {
            if (prev.some(c => c.publicId === newCustomer.publicId)) return prev;
            return [newCustomer, ...prev];
          });
          setValue('customerPublicId', newCustomer.publicId, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }}
      />
    </div>
  );
}
