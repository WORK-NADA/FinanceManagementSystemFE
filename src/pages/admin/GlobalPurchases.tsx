import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Calendar, 
  Eye 
} from 'lucide-react';
import { getPlatformPurchases } from '../../api/admin';
import { formatCurrency, formatDate } from '../../lib';
import { 
  Button, 
  Input, 
  Badge, 
  PageHeader, 
  ErrorState, 
  EmptyState, 
  Modal 
} from '../../components';
import type { ResponsePurchaseDTO } from '../../types/purchase';

export default function GlobalPurchases() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [selectedPurchase, setSelectedPurchase] = useState<ResponsePurchaseDTO | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platformPurchases', page, statusFilter, fromDate, toDate],
    queryFn: () => getPlatformPurchases({ page, size: 50, status: statusFilter || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }),
  });

  const purchases = data?.content || [];

  const filteredPurchases = purchases.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      p.purchaseNumber?.toLowerCase().includes(term) ||
      p.supplier?.supplierName?.toLowerCase().includes(term) ||
      p.supplierInvoiceNumber?.toLowerCase().includes(term) ||
      p.rawMaterial?.toLowerCase().includes(term)
    );
  });

  const totalProcurementVolume = filteredPurchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const totalPaidVolume = filteredPurchases
    .filter((p) => p.paymentStatus === 'PAID')
    .reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
  const totalPendingVolume = totalProcurementVolume - totalPaidVolume;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Purchases & Bills"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Global Purchases' },
        ]}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gross Procurement Audited</p>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalProcurementVolume)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{filteredPurchases.length} Total Bills</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Disbursed (Paid)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaidVolume)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Supplier settlements completed</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Outstanding Supplier Liabilities</p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalPendingVolume)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Pending bills to be paid</p>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search bill #, supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">PAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PENDING">PENDING</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 px-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs text-gray-700 dark:text-slate-300"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 px-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs text-gray-700 dark:text-slate-300"
            />
          </div>
        </div>

        {(searchTerm || statusFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setFromDate('');
              setToDate('');
            }}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Purchase Bills List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200 dark:border-[#1F2837] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load platform purchases.'} onRetry={() => refetch()} />
      ) : filteredPurchases.length === 0 ? (
        <EmptyState
          title="No purchase bills found"
          description="Try adjusting your filter criteria or date range."
        />
      ) : (
        <div className="w-full space-y-3">
          {/* Header Guide Bar */}
          <div className="hidden lg:grid lg:grid-cols-[130px_minmax(140px,1.5fr)_minmax(120px,1fr)_100px_100px_110px_90px_60px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div>Purchase #</div>
            <div>Supplier</div>
            <div>Raw Material</div>
            <div>Qty / Rate</div>
            <div>Taxable / GST</div>
            <div>Total Billed</div>
            <div>Status</div>
            <div className="text-right pr-2">Action</div>
          </div>

          {/* Cards */}
          {filteredPurchases.map((purchase) => (
            <div
              key={purchase.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-[130px_minmax(140px,1.5fr)_minmax(120px,1fr)_100px_100px_110px_90px_60px] items-center gap-3 px-5 py-3.5"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs font-semibold text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">
                  {purchase.purchaseNumber}
                </span>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{formatDate(purchase.purchaseDate)}</p>
              </div>

              <div className="truncate min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate">
                  {purchase.supplier?.supplierName || 'Supplier'}
                </p>
                {purchase.supplier?.mobileNumber && (
                  <p className="text-xs text-gray-400 dark:text-slate-500">{purchase.supplier.mobileNumber}</p>
                )}
              </div>

              <div className="text-sm text-gray-700 dark:text-slate-300 truncate min-w-0">
                {purchase.rawMaterial || '—'}
              </div>

              <div className="text-xs text-gray-600 dark:text-slate-400 min-w-0">
                <span className="font-medium text-gray-800 dark:text-slate-200">{purchase.weight} {purchase.unit}</span>
                <p className="text-[10px] text-gray-400">@{formatCurrency(purchase.ratePerUnit || 0)}</p>
              </div>

              <div className="text-xs text-gray-600 dark:text-slate-400 min-w-0">
                <p>{formatCurrency(purchase.amount || 0)}</p>
                <p className="text-[10px] text-gray-400">+GST {formatCurrency(purchase.gstAmount || 0)}</p>
              </div>

              <div className="min-w-0">
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(purchase.totalAmount)}
                </span>
              </div>

              <div className="min-w-0">
                <Badge 
                  variant={purchase.paymentStatus === 'PAID' ? 'success' : purchase.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'default'}
                  className="text-[10px]"
                >
                  {purchase.paymentStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-end min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                  onClick={() => setSelectedPurchase(purchase)}
                  title="View Bill Details"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800">
          <Button 
            variant="secondary" 
            size="sm" 
            disabled={page === 0} 
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Page {page + 1} of {data.totalPages} ({data.totalElements} purchases)
          </span>
          <Button 
            variant="secondary" 
            size="sm" 
            disabled={page >= data.totalPages - 1} 
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Purchase Detail Modal */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={`Purchase Bill: ${selectedPurchase?.purchaseNumber || ''}`}
        className="max-w-2xl"
      >
        {selectedPurchase && (
          <div className="space-y-5 text-sm">
            <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-200 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Supplier Name:</span>
                <p className="font-bold text-gray-900 dark:text-slate-100">{selectedPurchase.supplier?.supplierName}</p>
                <p className="text-xs text-gray-400">{selectedPurchase.supplier?.mobileNumber} • {selectedPurchase.supplier?.email || 'No email'}</p>
                {selectedPurchase.supplier?.gstNumber && <p className="text-xs font-mono text-gray-500">GSTIN: {selectedPurchase.supplier.gstNumber}</p>}
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 dark:text-slate-400">Bill Date:</span>
                <p className="font-semibold text-gray-800 dark:text-slate-200">{formatDate(selectedPurchase.purchaseDate)}</p>
                <p className="text-xs text-gray-400 mt-1">Supplier Ref: {selectedPurchase.supplierInvoiceNumber || 'None'}</p>
                <Badge variant={selectedPurchase.paymentStatus === 'PAID' ? 'success' : 'default'} className="mt-1 text-xs">
                  {selectedPurchase.paymentStatus}
                </Badge>
              </div>
            </div>

            {/* Material & Financial Breakdown */}
            <div className="space-y-2 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Line Items & Costing</h4>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Raw Material / Product:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{selectedPurchase.rawMaterial}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Weight & Quantity:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{selectedPurchase.weight} {selectedPurchase.unit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Rate per {selectedPurchase.unit}:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{formatCurrency(selectedPurchase.ratePerUnit)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">Taxable Amount:</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{formatCurrency(selectedPurchase.amount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-slate-800">
                <span className="text-gray-600 dark:text-slate-400">GST ({selectedPurchase.gstPercentage}%):</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{formatCurrency(selectedPurchase.gstAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-bold">
                <span className="text-gray-900 dark:text-slate-100">Total Purchase Value:</span>
                <span className="text-purple-600 dark:text-purple-400">{formatCurrency(selectedPurchase.totalAmount)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setSelectedPurchase(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
