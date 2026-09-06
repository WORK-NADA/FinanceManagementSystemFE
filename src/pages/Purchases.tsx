import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, CreditCard, CheckCircle2, AlertTriangle, AlertCircle, Info, Receipt, Clock, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useForm, useWatch, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchasePaymentSummary,
  getPaymentsByPurchase,
  createPurchasePayment,
  getOutstandingTotal,
  getPendingPurchasePayments,
} from '../api/purchase';
import { getSuppliers } from '../api/supplier';
import type { ResponseSupplierDTO } from '../types/supplier';
import { getActiveStocks } from '../api/stock';
import {
  purchaseSchema,
  purchasePaymentSchema,
  type RequestPurchaseDTO,
  type RequestPurchasePaymentDTO,
  type ResponsePurchaseDTO,
  type ResponsePurchasePaymentDTO,
  WEIGHT_UNITS,
  isPurchaseFullyPaid,
} from '../types/purchase';
import {
  Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState, Pagination, Skeleton, CopyableSequence, CreateSupplierModal
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  PAID: 'success',
  COMPLETED: 'success',
  PARTIALLY_PAID: 'warning',
  PENDING: 'danger',
};

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER'] as const;

// ── Live preview sub-component ──────────────────────────────────────────────
function PurchaseTotalsPreview({ control, alreadyPaid }: { control: any; alreadyPaid?: number }) {
  const weight       = Number(useWatch({ control, name: 'weight' }))       || 0;
  const ratePerUnit  = Number(useWatch({ control, name: 'ratePerUnit' }))  || 0;
  const gstPct       = Number(useWatch({ control, name: 'gstPercentage' })) ?? 18;

  const amount    = weight * ratePerUnit;
  const gstAmount = (amount * gstPct) / 100;
  const total     = amount + gstAmount;

  if (amount === 0) return null;

  const isBelowPaid = alreadyPaid !== undefined && alreadyPaid > 0 && total < (alreadyPaid - 0.009);

  return (
    <div className="bg-gray-50 dark:bg-[#121824] rounded-lg p-4 border border-gray-200 dark:border-[#1E293B] mt-4">
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400 mb-2 tracking-wide">Live Preview</p>
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
          <span className={`tabular-nums ${isBelowPaid ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-gray-900 dark:text-slate-100'}`}>
            {formatCurrency(total)}
          </span>
        </div>
        {alreadyPaid !== undefined && alreadyPaid > 0 && (
          <div className="flex justify-between text-xs border-t border-gray-200 dark:border-[#1E293B] pt-1 mt-1 text-slate-500 dark:text-slate-400">
            <span>Already Paid Amount</span>
            <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(alreadyPaid)}</span>
          </div>
        )}
      </div>

      {isBelowPaid && (
        <div className="mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-md text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>
            Total purchase bill amount ({formatCurrency(total)}) cannot be less than the already paid amount ({formatCurrency(alreadyPaid)}). Please adjust the price or quantity.
          </span>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">Final total confirmed &amp; stored by backend on save.</p>
    </div>
  );
}

// ── Purchase Summary Panel for Record Payment Modal ─────────────────────────
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
        <div className="bg-white rounded-md px-3 py-2 text-center shadow-xs">
          <p className="text-xs text-gray-500">Total</p>
          <p className="font-bold tabular-nums text-gray-900">{formatCurrency(summary.totalAmount)}</p>
        </div>
        <div className="bg-white rounded-md px-3 py-2 text-center shadow-xs">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="font-bold tabular-nums text-green-700">{formatCurrency(summary.paidAmount)}</p>
        </div>
        <div className="bg-white rounded-md px-3 py-2 text-center shadow-xs">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="font-bold tabular-nums text-red-700">{formatCurrency(summary.pendingAmount)}</p>
        </div>
      </div>
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

// ── Purchase Payments Drawer Sub-component ──────────────────────────────────
function PurchasePaymentsDrawerSection({
  purchasePublicId,
  totalAmount,
  paymentStatus: _paymentStatus,
}: {
  purchasePublicId: string;
  totalAmount: number;
  paymentStatus?: string;
}) {
  const { data: payments = [], isLoading } = useQuery<ResponsePurchasePaymentDTO[]>({
    queryKey: ['purchase-payments', purchasePublicId],
    queryFn: () => getPaymentsByPurchase(purchasePublicId),
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

  // Compute total paid and per-payment running balance
  const { paymentsWithBalance, totalPaid, remaining } = useMemo(() => {
    let accumulated = 0;
    const computed = sortedPayments.map((pmt) => {
      const paid = Number(pmt.amountPaid) || 0;
      accumulated += paid;
      const remainingAfter = Math.max(0, Number((totalAmount - accumulated).toFixed(2)));
      return {
        ...pmt,
        runningRemaining: remainingAfter,
      };
    });
    const finalRemaining = Math.max(0, Number((totalAmount - accumulated).toFixed(2)));
    return {
      paymentsWithBalance: computed,
      totalPaid: accumulated,
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
                Payment History
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200/70 dark:bg-[#1E293B] text-gray-700 dark:text-slate-300">
                {payments.length} {payments.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
              Track all supplier payment transactions against this purchase bill
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Summary stats pill */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white dark:bg-[#0E141E] border border-gray-200/80 dark:border-[#243245] shadow-2xs">
            <span className="text-gray-500 dark:text-slate-400">
              Bill: <strong className="text-gray-900 dark:text-slate-100 font-semibold tabular-nums">{formatCurrency(totalAmount)}</strong>
            </span>
            <span className="text-gray-300 dark:text-slate-600">|</span>
            <span className="text-gray-500 dark:text-slate-400">
              Paid: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">{formatCurrency(totalPaid)}</strong>
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
              No payments have been recorded for this purchase yet.
            </p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              Record supplier payments to track settlement against this purchase bill.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/90 dark:border-[#1E293B] shadow-2xs bg-white dark:bg-[#0E141E] w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#161F2E] border-b border-gray-200 dark:border-[#1E293B] text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300 select-none">
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[140px]">Payment #</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[110px]">Payment Date</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[120px]">Payment Method</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[120px]">Reference #</th>
                <th className="px-3.5 py-2.5 min-w-[150px]">Notes / Remarks</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[120px] text-right">Amount Paid</th>
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
                    {formatCurrency(pmt.amountPaid)}
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
                  Total Paid:
                </td>
                <td className="px-3.5 py-2.5 text-right text-emerald-700 dark:text-emerald-400 tabular-nums font-bold">
                  {formatCurrency(totalPaid)}
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
export default function Purchases() {
  const queryClient = useQueryClient();

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<ResponsePurchaseDTO | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPurchase, setDeletingPurchase] = useState<ResponsePurchaseDTO | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState<ResponsePurchaseDTO | null>(null);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ supplierPublicId: '', startDate: '', endDate: '' });

  // Data queries
  const { data: purchasePage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchases', page, filters],
    queryFn: () => getPurchases({ page, size: 15, ...filters }),
  });

  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers });
  const [extraSuppliers, setExtraSuppliers] = useState<ResponseSupplierDTO[]>([]);

  const allSuppliers = useMemo(() => {
    const map = new Map<string, ResponseSupplierDTO>();
    suppliers.forEach(s => map.set(s.publicId, s));
    extraSuppliers.forEach(s => map.set(s.publicId, s));
    return Array.from(map.values());
  }, [suppliers, extraSuppliers]);

  const { data: activeStocks = [] } = useQuery({ queryKey: ['stocks', 'active'], queryFn: getActiveStocks });

  const { data: outstandingTotal } = useQuery({
    queryKey: ['outstanding-total'],
    queryFn: getOutstandingTotal,
  });

  const { data: pendingPurchases = [] } = useQuery({
    queryKey: ['pending-purchases'],
    queryFn: getPendingPurchasePayments,
  });

  // ── Add Purchase Form ──
  const [rawMaterialMode, setRawMaterialMode] = useState<'pick' | 'new'>('pick');
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<RequestPurchaseDTO>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchaseDate:  new Date().toISOString().split('T')[0],
      unit:          'KG',
      gstPercentage: 18,
    },
  });
  const selectedSupplierPublicId = useWatch({ control, name: 'supplierPublicId' });
  const { field: rawMaterialField } = useController({ control, name: 'rawMaterial' });
  const watchRawMaterial = useWatch({ control, name: 'rawMaterial' });
  const matchedStock = activeStocks.find(
    s => s.rawMaterial.toLowerCase() === (watchRawMaterial || '').trim().toLowerCase()
  );

  // ── Edit Purchase Form ──
  const [editRawMaterialMode, setEditRawMaterialMode] = useState<'pick' | 'new'>('pick');
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: editControl,
    setValue: setEditValue,
    formState: { errors: editErrors }
  } = useForm<RequestPurchaseDTO>({
    resolver: zodResolver(purchaseSchema),
  });
  const selectedEditSupplierPublicId = useWatch({ control: editControl, name: 'supplierPublicId' });
  const { field: editRawMaterialField } = useController({ control: editControl, name: 'rawMaterial' });
  const watchEditRawMaterial = useWatch({ control: editControl, name: 'rawMaterial' });
  const matchedEditStock = activeStocks.find(
    s => s.rawMaterial.toLowerCase() === (watchEditRawMaterial || '').trim().toLowerCase()
  );

  // Query payment summary for currently selected editing purchase
  const { data: editPurchaseSummary } = useQuery({
    queryKey: ['purchase-summary', editingPurchase?.publicId],
    queryFn: () => getPurchasePaymentSummary(editingPurchase!.publicId),
    enabled: !!editingPurchase?.publicId,
  });

  const isEditPurchasePaid = Boolean(
    editingPurchase && (
      editingPurchase.paymentStatus !== 'PENDING' ||
      (editPurchaseSummary && editPurchaseSummary.paidAmount > 0)
    )
  );

  const alreadyPaidAmount = editPurchaseSummary?.paidAmount ?? (
    editingPurchase?.paymentStatus === 'PAID' || editingPurchase?.paymentStatus === 'COMPLETED'
      ? editingPurchase.totalAmount
      : 0
  );

  const editWatchWeight = Number(useWatch({ control: editControl, name: 'weight' })) || 0;
  const editWatchRate = Number(useWatch({ control: editControl, name: 'ratePerUnit' })) || 0;
  const editWatchGst = Number(useWatch({ control: editControl, name: 'gstPercentage' })) ?? 18;

  const editSubtotal = editWatchWeight * editWatchRate;
  const editTax = (editSubtotal * editWatchGst) / 100;
  const editEstimatedTotal = editSubtotal + editTax;

  const isEditPriceTooLow = Boolean(
    alreadyPaidAmount > 0 && editEstimatedTotal < (alreadyPaidAmount - 0.009)
  );

  // ── Record Payment Form ──
  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPayment,
    setValue: setPaymentValue,
    formState: { errors: paymentErrors }
  } = useForm<RequestPurchasePaymentDTO>({
    resolver: zodResolver(purchasePaymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
    },
  });

  // Query payment summary for currently selected payment purchase
  const { data: activePaymentSummary } = useQuery({
    queryKey: ['purchase-summary', paymentPurchase?.publicId],
    queryFn: () => getPurchasePaymentSummary(paymentPurchase!.publicId),
    enabled: !!paymentPurchase?.publicId,
  });

  const isPaymentPurchaseFullyPaid = Boolean(
    (paymentPurchase && isPurchaseFullyPaid(paymentPurchase.paymentStatus)) ||
    (activePaymentSummary && activePaymentSummary.pendingAmount <= 0)
  );

  useEffect(() => {
    if (activePaymentSummary) {
      setPaymentValue('amountPaid', activePaymentSummary.pendingAmount);
    }
  }, [activePaymentSummary, setPaymentValue]);

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success('Purchase recorded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save purchase.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: RequestPurchaseDTO) => updatePurchase(editingPurchase!.publicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['purchasePayments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-payments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-summary'] });
      handleCloseEditModal();
      toast.success('Purchase updated successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update purchase.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deletePurchase(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchases'] });
      handleCloseDeleteModal();
      toast.success('Purchase deleted and stock inventory updated successfully.');
    },
    onError: (err: any) => {
      // If error message was not already handled and toasted by the apiClient interceptor
      if (!err?.message) {
        toast.error('Failed to delete purchase.');
      }
    },
  });

  const paymentMutation = useMutation({
    mutationFn: createPurchasePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchasePayments'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleClosePaymentModal();
      toast.success('Payment recorded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to record payment.'),
  });

  // ── Handlers ──
  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
    setRawMaterialMode('pick');
  };

  const handleOpenEditModal = (p: ResponsePurchaseDTO) => {
    setEditingPurchase(p);
    const matched = activeStocks.find(s => s.rawMaterial.toLowerCase() === p.rawMaterial.trim().toLowerCase());
    setEditRawMaterialMode(matched ? 'pick' : 'new');
    resetEdit({
      supplierPublicId: p.supplier?.publicId ?? '',
      purchaseDate: p.purchaseDate,
      supplierInvoiceNumber: p.supplierInvoiceNumber ?? '',
      rawMaterial: p.rawMaterial,
      weight: p.weight,
      unit: p.unit,
      ratePerUnit: p.ratePerUnit,
      gstPercentage: p.gstPercentage,
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPurchase(null);
    resetEdit();
  };

  const handleOpenDeleteModal = (p: ResponsePurchaseDTO) => {
    setDeletingPurchase(p);
    if (p.paymentStatus !== 'PENDING') {
      toast.warning('This purchase cannot be deleted because a payment has already been recorded against it.');
    }
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingPurchase(null);
  };

  const handleOpenPaymentModal = (p: ResponsePurchaseDTO) => {
    if (isPurchaseFullyPaid(p.paymentStatus)) {
      toast.info('This purchase has already been fully paid.');
      return;
    }
    setPaymentPurchase(p);
    resetPayment({
      purchasePublicId: p.publicId,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMode: 'CASH',
      amountPaid: p.totalAmount, // will be auto-adjusted when summary loads
      referenceNumber: '',
      remarks: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentPurchase(null);
    resetPayment();
  };

  const onAddSubmit = (data: RequestPurchaseDTO) => {
    const existingStock = activeStocks.find(
      s => s.rawMaterial.toLowerCase() === data.rawMaterial.trim().toLowerCase()
    );
    const payload: RequestPurchaseDTO = {
      ...data,
      rawMaterial: existingStock ? existingStock.rawMaterial : data.rawMaterial.trim(),
      unit: existingStock ? (existingStock.unit as any) : data.unit,
    };
    createMutation.mutate(payload);
  };

  const onEditSubmit = (data: RequestPurchaseDTO) => {
    const existingStock = activeStocks.find(
      s => s.rawMaterial.toLowerCase() === data.rawMaterial.trim().toLowerCase()
    );

    // Enforce total purchase amount cannot be less than already paid amount
    const subtotal = data.weight * data.ratePerUnit;
    const total = Number((subtotal * (1 + (data.gstPercentage / 100))).toFixed(2));
    if (alreadyPaidAmount > 0 && total < (alreadyPaidAmount - 0.009)) {
      toast.error(`Total purchase bill amount (${formatCurrency(total)}) cannot be less than the already paid amount (${formatCurrency(alreadyPaidAmount)}). Please adjust the price or quantity.`);
      return;
    }

    const payload: RequestPurchaseDTO = {
      ...data,
      rawMaterial: isEditPurchasePaid && editingPurchase
        ? editingPurchase.rawMaterial
        : (existingStock ? existingStock.rawMaterial : data.rawMaterial.trim()),
      unit: isEditPurchasePaid && editingPurchase
        ? editingPurchase.unit
        : (existingStock ? (existingStock.unit as any) : data.unit),
      // If supplier is locked due to payments, enforce keeping original supplier
      supplierPublicId: isEditPurchasePaid && editingPurchase
        ? editingPurchase.supplier.publicId
        : data.supplierPublicId,
    };
    updateMutation.mutate(payload);
  };

  const onPaymentSubmit = (data: RequestPurchasePaymentDTO) => {
    if (
      (paymentPurchase && isPurchaseFullyPaid(paymentPurchase.paymentStatus)) ||
      (activePaymentSummary && activePaymentSummary.pendingAmount <= 0)
    ) {
      toast.info('This purchase has already been fully paid.');
      return;
    }
    if (activePaymentSummary && data.amountPaid > activePaymentSummary.pendingAmount) {
      toast.error(`Payment amount cannot exceed pending balance of ${formatCurrency(activePaymentSummary.pendingAmount)}`);
      return;
    }
    paymentMutation.mutate({
      ...data,
      purchasePublicId: paymentPurchase!.publicId,
    });
  };

  const activeSuppliers = allSuppliers.filter(s => s.isActive);
  const purchases = purchasePage?.content ?? [];

  const summaryBilled = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const fullySettledBilled = purchases
    .filter(p => p.paymentStatus === 'PAID' || p.paymentStatus === 'COMPLETED')
    .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Purchase Bill
          </Button>
        }
      />

      {/* KPI Ribbon (Ledger Benchmark) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Purchases</span>
            <TrendingUp className="h-4 w-4 text-blue-500 dark:text-sky-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-blue-700 dark:text-sky-400 mt-1">
            {formatCurrency(summaryBilled)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{purchases.length} bills listed</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fully Paid Purchases</span>
            <TrendingDown className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrency(fullySettledBilled)}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Fully paid bills</span>
        </div>

        <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Unpaid Bills</span>
            <Clock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-amber-700 dark:text-amber-400 mt-1">
            {pendingPurchases.length} Bills
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">Pending payment</span>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">Total Amount to Pay</span>
            <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold text-rose-800 dark:text-rose-200 mt-1">
            {formatCurrency(outstandingTotal ?? 0)}
          </p>
          <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80">Total money owed to suppliers</span>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-[#121824] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1E293B] shadow-xs flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">Supplier</label>
          <select
            className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-colors shadow-2xs"
            value={filters.supplierPublicId}
            onChange={e => { setFilters(f => ({ ...f, supplierPublicId: e.target.value })); setPage(0); }}
          >
            <option value="">All Suppliers</option>
            {activeSuppliers.map(s => <option key={s.publicId} value={s.publicId}>{s.supplierName}</option>)}
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
        {(filters.supplierPublicId || filters.startDate || filters.endDate) && (
          <div className="flex items-end">
            <Button variant="outline" size="sm" className="h-10 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-[#222D3D] hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setFilters({ supplierPublicId: '', startDate: '', endDate: '' }); setPage(0); }}>
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
        <ErrorState message={(error as any)?.message || 'Failed to load purchases'} onRetry={() => refetch()} />
      ) : purchases.length === 0 ? (
        <EmptyState
          title="No purchases found"
          description="Try adjusting the filters or record a new purchase bill."
          action={
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Purchase Bill
            </Button>
          }
        />
      ) : (
        <div className="w-full space-y-4">
          <div className="space-y-3">
            {/* Column Header Guide Bar */}
          <div className="hidden lg:grid grid-cols-[90px_minmax(150px,1.2fr)_minmax(110px,1.4fr)_minmax(75px,0.9fr)_minmax(75px,0.9fr)_minmax(65px,0.8fr)_minmax(80px,1fr)_85px_125px_28px] items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Date</div>
            <div className="min-w-0">Bill #</div>
            <div className="min-w-0">Supplier</div>
            <div className="min-w-0">Supplier Bill #</div>
            <div className="min-w-0 text-right">Bill Amount</div>
            <div className="min-w-0 text-right">GST</div>
            <div className="min-w-0 text-right">Net Total</div>
            <div className="min-w-0">Status</div>
            <div className="min-w-0 text-right pr-2">Actions</div>
            <div className="min-w-0 text-center"></div>
          </div>

          {/* List of Floating Cards */}
          {purchases.map((p) => {
            const isExpanded = expandedRow === p.publicId;
            return (
              <div
                key={p.publicId}
                className={`bg-white dark:bg-[#121824] rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md w-full overflow-hidden ${
                  isExpanded
                    ? 'border-[var(--color-primary)]/50 dark:border-emerald-500/40 ring-1 ring-[var(--color-primary)]/20 shadow-sm'
                    : 'border-gray-200/90 dark:border-[#1E293B] hover:border-gray-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Card Main Row */}
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[90px_minmax(150px,1.2fr)_minmax(110px,1.4fr)_minmax(75px,0.9fr)_minmax(75px,0.9fr)_minmax(65px,0.8fr)_minmax(80px,1fr)_85px_125px_28px] items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3.5 cursor-pointer select-none transition-colors rounded-2xl w-full ${
                    isExpanded ? 'bg-slate-50/50 dark:bg-[#161F2E] rounded-b-none' : 'hover:bg-gray-50/70 dark:hover:bg-[#182232]'
                  }`}
                  onClick={() => setExpandedRow(isExpanded ? null : p.publicId)}
                >
                  {/* Date */}
                  <div className="min-w-0 text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(p.purchaseDate)}
                  </div>

                  {/* Purchase # */}
                  <div className="min-w-0">
                    <CopyableSequence
                      value={p.purchaseNumber}
                      badgeClassName="font-mono text-xs font-semibold text-blue-700 dark:text-sky-300 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/80 dark:border-blue-800/50"
                    />
                  </div>

                  {/* Supplier */}
                  <div className="min-w-0 font-semibold text-sm text-gray-900 dark:text-slate-100 truncate" title={p.supplier?.supplierName}>
                    {p.supplier?.supplierName ?? '—'}
                  </div>

                  {/* Invoice # */}
                  <div className="min-w-0 text-xs text-gray-500 dark:text-slate-400 font-mono truncate" title={p.supplierInvoiceNumber}>
                    {p.supplierInvoiceNumber || '—'}
                  </div>

                  {/* Amount */}
                  <div className="min-w-0 text-left lg:text-right text-sm tabular-nums text-blue-700 dark:text-sky-400 font-semibold">
                    {formatCurrency(p.amount)}
                  </div>

                  {/* GST */}
                  <div className="min-w-0 text-left lg:text-right text-sm tabular-nums text-amber-700 dark:text-amber-400 font-medium">
                    {formatCurrency(p.gstAmount)}
                  </div>

                  {/* Total */}
                  <div className="min-w-0 text-left lg:text-right text-sm tabular-nums font-bold text-gray-900 dark:text-slate-100">
                    {formatCurrency(p.totalAmount)}
                  </div>

                  {/* Status */}
                  <div className="min-w-0">
                    <Badge variant={PAYMENT_STATUS_VARIANT[p.paymentStatus] ?? 'default'}>
                      {p.paymentStatus === 'PAID' || p.paymentStatus === 'COMPLETED' ? 'Fully Paid' : p.paymentStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                    </Badge>
                  </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {!isPurchaseFullyPaid(p.paymentStatus) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 hover:border-emerald-400 gap-1 font-semibold transition-colors shadow-xs"
                          onClick={() => handleOpenPaymentModal(p)}
                          title="Pay"
                        >
                          <CreditCard className="h-3.5 w-3.5" /> Pay
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="h-7 text-xs px-2.5 py-1 text-emerald-800 dark:text-emerald-400 bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 opacity-90 cursor-not-allowed gap-1 font-medium select-none shadow-xs"
                          title="This purchase has been fully paid. No outstanding balance."
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Fully Paid
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        onClick={() => handleOpenEditModal(p)}
                        title="Edit Purchase Bill"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className={
                          p.paymentStatus !== 'PENDING'
                            ? "h-7 w-7 text-gray-300 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                            : "h-7 w-7 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        }
                        onClick={() => handleOpenDeleteModal(p)}
                        title={
                          p.paymentStatus !== 'PENDING'
                            ? "Cannot delete: A payment has already been recorded against this purchase"
                            : "Delete Purchase Bill"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Expand/Collapse Chevron */}
                    <div className="flex justify-center">
                      <div className="p-1 rounded-md text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Detail Panel */}
                  {isExpanded && (
                    <div className="bg-gradient-to-b from-slate-50/90 to-slate-50/40 dark:from-[#161F2E] dark:to-[#121824] border-t border-gray-100 dark:border-[#1E293B] px-6 py-4 rounded-b-xl space-y-4">
                      {/* Section 1: Purchase Line Item Detail */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-2.5">
                          Purchased Items & Material Details
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-[#0E141E] p-3.5 rounded-lg border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Item / Material Name</p>
                            <p className="font-semibold text-sm text-gray-900 dark:text-slate-100">{p.rawMaterial}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Quantity / Weight</p>
                            <p className="tabular-nums font-semibold text-sm text-gray-900 dark:text-slate-100">{p.weight} <span className="text-xs font-normal text-gray-500 dark:text-slate-400">{p.unit}</span></p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Price per Unit</p>
                            <p className="tabular-nums font-semibold text-sm text-gray-900 dark:text-slate-100">{formatCurrency(p.ratePerUnit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">Tax (GST %)</p>
                            <p className="tabular-nums font-semibold text-sm text-gray-900 dark:text-slate-100">{p.gstPercentage}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Associated Payment Records */}
                      <PurchasePaymentsDrawerSection
                        purchasePublicId={p.publicId}
                        totalAmount={p.totalAmount}
                        paymentStatus={p.paymentStatus}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {purchasePage && purchasePage.totalPages > 1 && (
            <div className="mt-4 p-4 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837] shadow-xs flex justify-center">
              <Pagination currentPage={purchasePage.number} totalPages={purchasePage.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* ── New Purchase Modal ── */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="New Purchase Bill" className="max-w-2xl">
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Supplier *</label>
                <button
                  type="button"
                  onClick={() => setIsCreateSupplierModalOpen(true)}
                  className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Create New Supplier
                </button>
              </div>
              <select
                id="purchase-supplier-select"
                value={selectedSupplierPublicId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__CREATE_NEW_SUPPLIER__') {
                    setIsCreateSupplierModalOpen(true);
                  } else {
                    setValue('supplierPublicId', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }
                }}
                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select supplier…</option>
                <option value="__CREATE_NEW_SUPPLIER__" className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                  + Create New Supplier…
                </option>
                <option disabled value="">──────────────</option>
                {activeSuppliers.map(s => <option key={s.publicId} value={s.publicId}>{s.supplierName}</option>)}
                {selectedSupplierPublicId && !activeSuppliers.some(s => s.publicId === selectedSupplierPublicId) && (
                  <option value={selectedSupplierPublicId}>
                    {allSuppliers.find(s => s.publicId === selectedSupplierPublicId)?.supplierName || 'Selected Supplier'}
                  </option>
                )}
              </select>
              {errors.supplierPublicId && <p className="text-red-500 text-xs mt-1">{errors.supplierPublicId.message}</p>}
            </div>
            <Input label="Purchase Date *" type="date" {...register('purchaseDate')} error={errors.purchaseDate?.message} />
            <Input label="Supplier Bill / Invoice Number" {...register('supplierInvoiceNumber')} error={errors.supplierInvoiceNumber?.message} />
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-gray-50/50">
            <h4 className="font-medium text-gray-900 text-sm">Item Details *</h4>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Item / Material Name *</label>
              {rawMaterialMode === 'pick' ? (
                <select
                  value={rawMaterialField.value ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      rawMaterialField.onChange('');
                      setRawMaterialMode('new');
                    } else {
                      rawMaterialField.onChange(val);
                      const stock = activeStocks.find(s => s.rawMaterial.toLowerCase() === val.trim().toLowerCase());
                      if (stock) setValue('unit', stock.unit);
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">Select item / material…</option>
                  {activeStocks.map(s => (
                    <option key={s.publicId} value={s.rawMaterial}>
                      {s.rawMaterial} ({s.unit}) — Available: {s.currentQuantity} {s.unit}
                    </option>
                  ))}
                  <option value="__new__">＋ Add new material…</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Cotton Yarn"
                    autoFocus
                    {...rawMaterialField}
                    onChange={e => {
                      rawMaterialField.onChange(e.target.value);
                      const matched = activeStocks.find(s => s.rawMaterial.toLowerCase() === e.target.value.trim().toLowerCase());
                      if (matched) setValue('unit', matched.unit);
                    }}
                    className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => { rawMaterialField.onChange(''); setRawMaterialMode('pick'); }}
                    className="shrink-0 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-slate-200 underline whitespace-nowrap"
                  >
                    ← Choose from list
                  </button>
                </div>
              )}
              {errors.rawMaterial && <p className="text-red-500 text-xs mt-1">{errors.rawMaterial.message}</p>}
            </div>

            <div className="grid grid-cols-12 gap-3">
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
                  type="number" step="0.001" min="0" placeholder="0.000"
                  {...register('weight', { valueAsNumber: true })}
                  className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight.message}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Unit *</label>
                <select
                  {...register('unit')}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {WEIGHT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Price per Unit (₹) *</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  {...register('ratePerUnit', { valueAsNumber: true })}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.ratePerUnit && <p className="text-red-500 text-xs mt-1">{errors.ratePerUnit.message}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax (GST %) *</label>
                <input
                  type="number" step="0.01" min="0" max="100" placeholder="18"
                  {...register('gstPercentage', { valueAsNumber: true })}
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {errors.gstPercentage && <p className="text-red-500 text-xs mt-1">{errors.gstPercentage.message}</p>}
              </div>
            </div>

            <PurchaseTotalsPreview control={control} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Save Purchase Bill</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Purchase Modal ── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={`Edit Purchase Bill: ${editingPurchase?.purchaseNumber ?? ''}`}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
          {editingPurchase && (
            <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Purchase Bill #</span>
              <CopyableSequence
                value={editingPurchase.purchaseNumber}
                plainText
                badgeClassName="font-mono font-bold text-gray-800"
              />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Supplier *</label>
                {editingPurchase?.paymentStatus === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => setIsCreateSupplierModalOpen(true)}
                    className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Create New Supplier
                  </button>
                )}
              </div>
              <select
                id="edit-purchase-supplier-select"
                value={selectedEditSupplierPublicId || ''}
                disabled={isEditPurchasePaid}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__CREATE_NEW_SUPPLIER__') {
                    setIsCreateSupplierModalOpen(true);
                  } else {
                    setEditValue('supplierPublicId', val, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  }
                }}
                className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  isEditPurchasePaid
                    ? 'bg-gray-100 dark:bg-[#1A2331] border-gray-200 dark:border-[#222D3D] text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-[#0E131C] border-gray-300 dark:border-[#222D3D] text-gray-900 dark:text-slate-100'
                }`}
              >
                <option value="">Select supplier…</option>
                {!isEditPurchasePaid && (
                  <>
                    <option value="__CREATE_NEW_SUPPLIER__" className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                      + Create New Supplier…
                    </option>
                    <option disabled value="">──────────────</option>
                  </>
                )}
                {allSuppliers.map(s => <option key={s.publicId} value={s.publicId}>{s.supplierName}</option>)}
                {selectedEditSupplierPublicId && !allSuppliers.some(s => s.publicId === selectedEditSupplierPublicId) && (
                  <option value={selectedEditSupplierPublicId}>
                    {allSuppliers.find(s => s.publicId === selectedEditSupplierPublicId)?.supplierName || 'Selected Supplier'}
                  </option>
                )}
              </select>
              {isEditPurchasePaid && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Supplier is locked because payments have already been recorded against this bill.
                </p>
              )}
              {editErrors.supplierPublicId && <p className="text-red-500 text-xs mt-1">{editErrors.supplierPublicId.message}</p>}
            </div>

            <Input label="Purchase Date *" type="date" {...registerEdit('purchaseDate')} error={editErrors.purchaseDate?.message} />
            <Input label="Supplier Bill / Invoice Number" {...registerEdit('supplierInvoiceNumber')} error={editErrors.supplierInvoiceNumber?.message} />
          </div>

          <div className="border border-gray-200 dark:border-[#1E293B] rounded-lg p-4 space-y-4 bg-gray-50/50 dark:bg-[#121824]">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 text-sm">Item Details</h4>
              <span className="text-xs text-blue-600 dark:text-sky-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Stock inventory updates automatically
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Item / Material Name *</label>
              {editRawMaterialMode === 'pick' || isEditPurchasePaid ? (
                <select
                  disabled={isEditPurchasePaid}
                  value={editRawMaterialField.value ?? ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__new__') {
                      editRawMaterialField.onChange('');
                      setEditRawMaterialMode('new');
                    } else {
                      editRawMaterialField.onChange(val);
                      const stock = activeStocks.find(s => s.rawMaterial.toLowerCase() === val.trim().toLowerCase());
                      if (stock) setEditValue('unit', stock.unit);
                    }
                  }}
                  className={`flex h-9 w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isEditPurchasePaid
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
                  {!isEditPurchasePaid && (
                    <option value="__new__">＋ Add new material…</option>
                  )}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Cotton Yarn"
                    autoFocus
                    {...editRawMaterialField}
                    onChange={e => {
                      editRawMaterialField.onChange(e.target.value);
                      const matched = activeStocks.find(s => s.rawMaterial.toLowerCase() === e.target.value.trim().toLowerCase());
                      if (matched) setEditValue('unit', matched.unit);
                    }}
                    className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => { editRawMaterialField.onChange(''); setEditRawMaterialMode('pick'); }}
                    className="shrink-0 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-slate-200 underline whitespace-nowrap"
                  >
                    ← Choose from list
                  </button>
                </div>
              )}
              {isEditPurchasePaid && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Material is locked because payments have already been recorded against this bill.
                </p>
              )}
              {editErrors.rawMaterial && <p className="text-red-500 text-xs mt-1">{editErrors.rawMaterial.message}</p>}
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">Quantity / Weight *</label>
                  {matchedEditStock && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Available: {matchedEditStock.currentQuantity} {matchedEditStock.unit}
                    </span>
                  )}
                </div>
                <input
                  type="number" step="0.001" min="0" placeholder="0.000"
                  {...registerEdit('weight', { valueAsNumber: true })}
                  className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {editErrors.weight && <p className="text-red-500 text-xs mt-1">{editErrors.weight.message}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Unit *</label>
                <select
                  disabled={isEditPurchasePaid}
                  {...registerEdit('unit')}
                  className={`flex h-9 w-full rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isEditPurchasePaid
                      ? 'border-gray-200 dark:border-[#222D3D] bg-gray-100 dark:bg-[#161F2E] text-gray-500 dark:text-slate-400 cursor-not-allowed opacity-90'
                      : 'border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100'
                  }`}
                >
                  {WEIGHT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                {editErrors.unit && <p className="text-red-500 text-xs mt-1">{editErrors.unit.message}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Price per Unit (₹) *</label>
                <input
                  type="number" step="0.01" min="0" placeholder="0.00"
                  {...registerEdit('ratePerUnit', {
                    valueAsNumber: true,
                    validate: (val) => {
                      if (val <= 0) return 'Price per unit must be greater than zero';
                      if (alreadyPaidAmount > 0) {
                        const estimated = Number((editWatchWeight * val * (1 + (editWatchGst / 100))).toFixed(2));
                        if (estimated < (alreadyPaidAmount - 0.009)) {
                          return `Total bill amount (${formatCurrency(estimated)}) cannot be less than already paid (${formatCurrency(alreadyPaidAmount)})`;
                        }
                      }
                      return true;
                    }
                  })}
                  className={`flex h-9 w-full rounded-md border px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                    isEditPriceTooLow
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                      : 'border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100'
                  }`}
                />
                {isEditPriceTooLow && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Total bill amount cannot be less than already paid ({formatCurrency(alreadyPaidAmount)})
                  </p>
                )}
                {editErrors.ratePerUnit && <p className="text-red-500 text-xs mt-1">{editErrors.ratePerUnit.message}</p>}
              </div>

              <div className="col-span-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tax (GST %) *</label>
                <input
                  type="number" step="0.01" min="0" max="100" placeholder="18"
                  {...registerEdit('gstPercentage', { valueAsNumber: true })}
                  className="flex h-9 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E141E] text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                {editErrors.gstPercentage && <p className="text-red-500 text-xs mt-1">{editErrors.gstPercentage.message}</p>}
              </div>
            </div>

            <PurchaseTotalsPreview control={editControl} alreadyPaid={alreadyPaidAmount} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1E293B]">
            <Button type="button" variant="outline" onClick={handleCloseEditModal}>Cancel</Button>
            <Button
              type="submit"
              isLoading={updateMutation.isPending}
              disabled={isEditPriceTooLow}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Purchase Dialog ── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={deletingPurchase?.paymentStatus !== 'PENDING' ? "Cannot Delete Purchase Bill" : "Delete Purchase Bill"}
        className="max-w-md"
      >
        {deletingPurchase?.paymentStatus !== 'PENDING' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm space-y-2">
                <p className="font-semibold text-amber-950">Purchase Cannot Be Deleted</p>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  This purchase cannot be deleted because a payment has already been recorded against it.
                </p>
                <div className="bg-white/90 rounded-lg p-2.5 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Purchase Reference:</span>
                    <CopyableSequence
                      value={deletingPurchase?.purchaseNumber}
                      plainText
                      badgeClassName="font-mono font-medium text-gray-900"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Supplier:</span>
                    <span className="font-medium text-gray-900">{deletingPurchase?.supplier?.supplierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Status:</span>
                    <Badge variant={PAYMENT_STATUS_VARIANT[deletingPurchase?.paymentStatus ?? ''] ?? 'default'}>
                      {deletingPurchase?.paymentStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed pt-1">
                  To protect accounting integrity, purchases with associated payments cannot be deleted directly. Please delete or reverse all associated payments in the <strong>Purchase Payments</strong> tab first.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <Button type="button" onClick={handleCloseDeleteModal}>
                Understood
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 rounded-lg border border-red-200 text-red-900 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="font-semibold text-sm">Are you sure you want to delete this purchase?</p>
              </div>
              <p className="text-xs text-red-800 leading-relaxed">
                This will permanently delete purchase{' '}
                <CopyableSequence
                  value={deletingPurchase?.purchaseNumber}
                  plainText
                  size="xs"
                  badgeClassName="font-mono font-medium text-gray-900"
                />{' '}
                and revert <strong>{deletingPurchase?.weight} {deletingPurchase?.unit}</strong> of <strong>{deletingPurchase?.rawMaterial}</strong> from your stock inventory.
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier</span>
                <span className="font-medium text-gray-800">{deletingPurchase?.supplier?.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Purchase Date</span>
                <span className="font-medium text-gray-800">{deletingPurchase ? formatDate(deletingPurchase.purchaseDate) : '—'}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1">
                <span className="text-gray-500">Total Value</span>
                <span className="font-semibold text-gray-900 tabular-nums">{deletingPurchase ? formatCurrency(deletingPurchase.totalAmount) : '—'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={handleCloseDeleteModal}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  if (deletingPurchase) {
                    if (deletingPurchase.paymentStatus !== 'PENDING') {
                      toast.warning('This purchase cannot be deleted because a payment has already been recorded against it.');
                      return;
                    }
                    deleteMutation.mutate(deletingPurchase.publicId);
                  }
                }}
              >
                Delete Purchase
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Record Payment Modal ── */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        title={`Pay: ${paymentPurchase?.purchaseNumber ?? ''}`}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmitPayment(onPaymentSubmit)} className="space-y-4">
          {paymentPurchase && <PurchaseSummaryPanel purchaseId={paymentPurchase.publicId} />}

          {isPaymentPurchaseFullyPaid && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>This purchase bill has been fully paid. There is no remaining balance.</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Date *"
              type="date"
              disabled={isPaymentPurchaseFullyPaid}
              {...registerPayment('paymentDate')}
              error={paymentErrors.paymentDate?.message}
            />
            <Input
              label={activePaymentSummary ? `Amount to Pay * (Pending: ${formatCurrency(activePaymentSummary.pendingAmount)})` : 'Amount to Pay *'}
              type="number"
              step="0.01"
              disabled={isPaymentPurchaseFullyPaid}
              max={activePaymentSummary?.pendingAmount}
              {...registerPayment('amountPaid', {
                valueAsNumber: true,
                validate: (val) => {
                  if (activePaymentSummary && activePaymentSummary.pendingAmount <= 0) {
                    return 'Purchase bill is already fully paid';
                  }
                  if (activePaymentSummary && val > activePaymentSummary.pendingAmount) {
                    return `Payment amount cannot exceed pending balance of ${formatCurrency(activePaymentSummary.pendingAmount)}`;
                  }
                  return true;
                }
              })}
              error={paymentErrors.amountPaid?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select
              disabled={isPaymentPurchaseFullyPaid}
              {...registerPayment('paymentMode')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          <Input
            label="Transaction / Reference # (Optional)"
            placeholder="Cheque no., UTR, bank txn ID, etc."
            disabled={isPaymentPurchaseFullyPaid}
            {...registerPayment('referenceNumber')}
            error={paymentErrors.referenceNumber?.message}
          />

          <Input
            label="Notes / Remarks"
            placeholder="Optional notes or details"
            disabled={isPaymentPurchaseFullyPaid}
            {...registerPayment('remarks')}
            error={paymentErrors.remarks?.message}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleClosePaymentModal}>
              {isPaymentPurchaseFullyPaid ? 'Close' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              isLoading={paymentMutation.isPending}
              disabled={isPaymentPurchaseFullyPaid}
              className={isPaymentPurchaseFullyPaid ? 'cursor-not-allowed opacity-60' : ''}
            >
              {isPaymentPurchaseFullyPaid ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Fully Paid
                </span>
              ) : (
                'Pay'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Create Supplier Modal (accessible from purchase forms) ── */}
      <CreateSupplierModal
        isOpen={isCreateSupplierModalOpen}
        onClose={() => setIsCreateSupplierModalOpen(false)}
        onSuccess={(newSupplier) => {
          setExtraSuppliers(prev => {
            if (prev.some(s => s.publicId === newSupplier.publicId)) return prev;
            return [newSupplier, ...prev];
          });
          if (isModalOpen) {
            setValue('supplierPublicId', newSupplier.publicId, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            });
          }
          if (isEditModalOpen) {
            setEditValue('supplierPublicId', newSupplier.publicId, {
              shouldValidate: true,
              shouldDirty: true,
              shouldTouch: true,
            });
          }
        }}
      />
    </div>
  );
}
