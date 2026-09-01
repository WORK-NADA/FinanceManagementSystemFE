import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSales, createSale, updateSale } from '../api/sale';
import { getActiveCustomers } from '../api/customer';
import { getActiveStocks } from '../api/stock';
import { saleSchema, type RequestSaleDTO, type ResponseSaleDTO } from '../types/sale';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Modal, Input, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState, Pagination
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  PAID: 'success',
  PARTIALLY_PAID: 'warning',
  PENDING: 'danger',
};

// ── Live preview sub-component ──────────────────────────────────────────────
function SaleTotalsPreview({ control }: { control: any }) {
  const items = useWatch({ control, name: 'items' }) ?? [];

  const subtotal = useMemo(() =>
    items.reduce((sum: number, item: any) => {
      const qty = Number(item?.quantity) || 0;
      const rate = Number(item?.pricePerUnit) || 0;
      return sum + qty * rate;
    }, 0),
    [items]
  );

  if (subtotal === 0) return null;

  return (
    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 mt-4">
      <p className="text-xs font-semibold uppercase text-emerald-600 mb-2 tracking-wide">Live Preview (UI only)</p>
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Estimated Subtotal</span>
        <span className="font-semibold tabular-nums text-emerald-700">{formatCurrency(subtotal)}</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">GST & final total computed by backend on save.</p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Sales() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<ResponseSaleDTO | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ customerPublicId: '', startDate: '', endDate: '' });

  const { data: salePage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sales', page, filters],
    queryFn: () => getSales({ page, size: 15, ...filters }),
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers', 'active'], queryFn: getActiveCustomers });
  const { data: activeStocks = [] } = useQuery({ queryKey: ['stocks', 'active'], queryFn: getActiveStocks });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<RequestSaleDTO>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      saleDate: new Date().toISOString().split('T')[0],
      items: [{ stockPublicId: '', quantity: 0, pricePerUnit: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const mutation = useMutation({
    mutationFn: (data: RequestSaleDTO) =>
      editingSale ? updateSale(editingSale.publicId, data) : createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingSale ? 'Sale updated successfully.' : 'Sale recorded successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save sale.'),
  });

  const handleOpenModal = (sale?: ResponseSaleDTO) => {
    if (sale) {
      setEditingSale(sale);
      reset({
        customerPublicId: sale.customerPublicId,
        saleDate: sale.saleDate.split('T')[0],
        invoiceNumber: sale.invoiceNumber ?? '',
        remarks: sale.remarks ?? '',
        items: sale.items.map(i => ({
          stockPublicId: i.stockPublicId,
          quantity: i.quantity,
          pricePerUnit: i.pricePerUnit,
        })),
      });
    } else {
      setEditingSale(null);
      reset({
        saleDate: new Date().toISOString().split('T')[0],
        items: [{ stockPublicId: '', quantity: 0, pricePerUnit: 0 }],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); reset(); setEditingSale(null); };

  const sales = salePage?.content ?? [];
  const activeCustomers = customers.filter(c => c.isActive);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> New Sale
          </Button>
        }
      />

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
          <select
            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            value={filters.customerPublicId}
            onChange={e => { setFilters(f => ({ ...f, customerPublicId: e.target.value })); setPage(0); }}
          >
            <option value="">All Customers</option>
            {activeCustomers.map(c => <option key={c.publicId} value={c.publicId}>{c.customerName}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
          <input type="date" className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(0); }} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
          <input type="date" className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(0); }} />
        </div>
        {(filters.customerPublicId || filters.startDate || filters.endDate) && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setFilters({ customerPublicId: '', startDate: '', endDate: '' }); setPage(0); }}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={10} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load sales'} onRetry={() => refetch()} />
      ) : sales.length === 0 ? (
        <EmptyState
          title="No sales found"
          description="Try adjusting the filters or record a new sale."
          action={
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> New Sale
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sale #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <>
                  <TableRow
                    key={s.publicId}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedRow(expandedRow === s.publicId ? null : s.publicId)}
                  >
                    <TableCell className="whitespace-nowrap">{formatDate(s.saleDate)}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500">{s.saleNumber}</TableCell>
                    <TableCell className="font-medium">{s.customerName}</TableCell>
                    <TableCell className="text-gray-500">{s.invoiceNumber || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(s.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-700">{formatCurrency(s.gstAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{formatCurrency(s.totalAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-700">{formatCurrency(s.pendingAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_STATUS_VARIANT[s.paymentStatus] ?? 'default'}>
                        {s.paymentStatus.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); handleOpenModal(s); }}
                        title="Edit Sale"
                      >
                        ✏️
                      </Button>
                      {expandedRow === s.publicId
                        ? <ChevronUp className="h-4 w-4 text-gray-400" />
                        : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </TableCell>
                  </TableRow>

                  {expandedRow === s.publicId && (
                    <TableRow key={`${s.publicId}-detail`}>
                      <TableCell colSpan={10} className="bg-slate-50 px-6 py-3">
                        <p className="text-xs font-semibold uppercase text-gray-400 mb-2 tracking-wide">Line Items</p>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 text-xs">
                              <th className="pb-1 pr-6 font-medium">Material</th>
                              <th className="pb-1 pr-6 font-medium">Qty</th>
                              <th className="pb-1 pr-6 font-medium">Rate / Unit</th>
                              <th className="pb-1 font-medium text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.items.map(i => (
                              <tr key={i.publicId} className="border-t border-gray-100">
                                <td className="pr-6 py-1">{i.rawMaterial}</td>
                                <td className="pr-6 py-1 tabular-nums">{i.quantity} {i.unit}</td>
                                <td className="pr-6 py-1 tabular-nums">{formatCurrency(i.pricePerUnit)}</td>
                                <td className="py-1 tabular-nums text-right font-medium">{formatCurrency(i.totalPrice)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {s.remarks && (
                          <p className="text-xs text-gray-500 mt-2 italic">Remarks: {s.remarks}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>

          {salePage && salePage.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination currentPage={salePage.number} totalPages={salePage.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Sale Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}
        title={editingSale ? `Edit Sale — ${editingSale.saleNumber}` : 'New Sale'}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-5">
          {/* Sale Number — read-only when editing */}
          {editingSale && (
            <div className="bg-gray-50 rounded-lg px-4 py-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500">Sale #</span>
              <span className="font-mono font-bold text-gray-800">{editingSale.saleNumber}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                {...register('customerPublicId')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Select customer…</option>
                {activeCustomers.map(c => <option key={c.publicId} value={c.publicId}>{c.customerName}</option>)}
              </select>
              {errors.customerPublicId && <p className="text-red-500 text-xs mt-1">{errors.customerPublicId.message}</p>}
            </div>
            <Input label="Sale Date *" type="date" {...register('saleDate')} error={errors.saleDate?.message} />
            <Input label="Invoice Number" {...register('invoiceNumber')} error={errors.invoiceNumber?.message} />
            <Input label="Remarks" {...register('remarks')} error={errors.remarks?.message} />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Line Items *</h4>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ stockPublicId: '', quantity: 0, pricePerUnit: 0 })}>
                <Plus className="h-3 w-3 mr-1" /> Add Row
              </Button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <span className="col-span-5">Material</span>
                <span className="col-span-3">Qty</span>
                <span className="col-span-3">Rate (₹)</span>
                <span className="col-span-1" />
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      {...register(`items.${index}.stockPublicId`)}
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="">Select…</option>
                      {activeStocks.map(s => <option key={s.publicId} value={s.publicId}>{s.rawMaterial} ({s.unit})</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      {...register(`items.${index}.pricePerUnit`, { valueAsNumber: true })}
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {errors.items && <p className="text-red-500 text-xs">{errors.items.message ?? (errors.items as any)?.root?.message}</p>}
            </div>

            <SaleTotalsPreview control={control} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingSale ? 'Update Sale' : 'Save Sale'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
