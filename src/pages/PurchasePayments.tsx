import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, TrendingDown } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  getPurchasePayments,
  createPurchasePayment,
  getPurchasePaymentSummary,
  getPendingPurchasePayments,
  getOutstandingTotal,
  getPurchases,
} from '../api/purchase';
import { purchasePaymentSchema, type RequestPurchasePaymentDTO } from '../types/purchase';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Modal, Input, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState, Pagination, KpiCard, Skeleton
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER'] as const;

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
      <div className="h-3 bg-blue-100 rounded w-1/2" />
    </div>
  );
  if (!summary) return null;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-1 text-sm">
      <p className="font-semibold text-blue-800 mb-2">{summary.supplierName} — {summary.purchaseNumber}</p>
      <div className="grid grid-cols-3 gap-3">
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
function PendingPaymentsPanel() {
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pending-purchases'],
    queryFn: getPendingPurchasePayments,
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;
  if (pending.length === 0) return (
    <div className="text-center py-6 text-gray-400 text-sm">No pending payments.</div>
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Purchase #</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Pending</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pending.map(p => (
          <TableRow key={p.publicId}>
            <TableCell className="font-mono text-xs">{p.purchaseNumber}</TableCell>
            <TableCell className="font-medium">{p.supplierName}</TableCell>
            <TableCell>{formatDate(p.purchaseDate)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCurrency(p.totalAmount)}</TableCell>
            <TableCell className="text-right tabular-nums text-green-700">{formatCurrency(p.paidAmount)}</TableCell>
            <TableCell className="text-right tabular-nums font-semibold text-red-700">{formatCurrency(p.pendingAmount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PurchasePayments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [page, setPage] = useState(0);

  const { data: paymentsPage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['purchasePayments', page],
    queryFn: () => getPurchasePayments(page, 15),
    enabled: activeTab === 'all',
  });

  // Fetch all purchases (for the dropdown in Record Payment form)
  const { data: purchasesPage } = useQuery({
    queryKey: ['purchases', 0, {}],
    queryFn: () => getPurchases({ page: 0, size: 200 }),
  });

  const { data: outstandingTotal } = useQuery({
    queryKey: ['outstanding-total'],
    queryFn: getOutstandingTotal,
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RequestPurchasePaymentDTO>({
    resolver: zodResolver(purchasePaymentSchema),
    defaultValues: { paymentDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH' },
  });

  const selectedPurchaseId = useWatch({ control, name: 'purchasePublicId' }) ?? '';

  const mutation = useMutation({
    mutationFn: createPurchasePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasePayments'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['pending-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-total'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success('Payment recorded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to record payment.'),
  });

  const handleCloseModal = () => { setIsModalOpen(false); reset(); };

  const payments = paymentsPage?.content ?? [];
  // Only purchases with outstanding balance are meaningful options
  const pendingPurchases = purchasesPage?.content.filter(p => p.outstandingAmount > 0) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Payments"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total Outstanding Payables"
          value={formatCurrency(outstandingTotal ?? 0)}
          icon={<TrendingDown className="h-5 w-5" />}
          trend={{ value: 0, label: 'Awaiting payment to suppliers' }}
          className="border-red-100 bg-red-50/30"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-1 bg-gray-100/50 p-1 rounded-lg w-fit">
        {(['all', 'pending'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(0); }}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab === 'pending' && <Clock className="h-3.5 w-3.5" />}
            {tab === 'all' ? 'All Payments' : 'Pending Payments'}
          </button>
        ))}
      </div>

      {activeTab === 'pending' ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <PendingPaymentsPanel />
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={7} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load payments'} onRetry={() => refetch()} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payment records found"
          description="Record a new payment to see it here."
          action={
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Record Payment
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Date</TableHead>
                <TableHead>Purchase #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(p => (
                <TableRow key={p.publicId}>
                  <TableCell className="whitespace-nowrap">{formatDate(p.paymentDate)}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{p.purchaseNumber || '—'}</TableCell>
                  <TableCell className="font-medium">{p.supplierName}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-green-700">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{p.paymentMode.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.referenceNumber || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[160px] truncate" title={p.remarks}>{p.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {paymentsPage && paymentsPage.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination currentPage={paymentsPage.number} totalPages={paymentsPage.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Record Purchase Payment" className="max-w-xl">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase *</label>
            <select
              {...register('purchasePublicId')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              <option value="">Select a purchase…</option>
              {pendingPurchases.map(p => (
                <option key={p.publicId} value={p.publicId}>
                  {p.purchaseNumber} — {p.supplierName} (Pending: {formatCurrency(p.outstandingAmount)})
                </option>
              ))}
            </select>
            {errors.purchasePublicId && <p className="text-red-500 text-xs mt-1">{errors.purchasePublicId.message}</p>}
          </div>

          {/* Live summary panel */}
          <PurchaseSummaryPanel purchaseId={selectedPurchaseId} />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Payment Date *" type="date" {...register('paymentDate')} error={errors.paymentDate?.message} />
            <Input label="Amount *" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} error={errors.amount?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
            <select
              {...register('paymentMode')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <Input label="Reference Number" {...register('referenceNumber')} error={errors.referenceNumber?.message} />
          <Input label="Remarks" {...register('remarks')} error={errors.remarks?.message} />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
