import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Wallet, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight 
} from 'lucide-react';
import { getPlatformSalePayments, getPlatformPurchasePayments } from '../../api/admin';
import { formatCurrency, formatDate } from '../../lib';
import { 
  Input, 
  Badge, 
  PageHeader, 
  EmptyState 
} from '../../components';

export default function GlobalPayments() {
  const [activeTab, setActiveTab] = useState<'inflows' | 'outflows'>('inflows');
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('');

  const { data: salePaymentsData, isLoading: loadingSales } = useQuery({
    queryKey: ['platformSalePayments'],
    queryFn: () => getPlatformSalePayments({ size: 100 }),
  });

  const { data: purchasePaymentsData, isLoading: loadingPurchases } = useQuery({
    queryKey: ['platformPurchasePayments'],
    queryFn: () => getPlatformPurchasePayments({ size: 100 }),
  });

  const salePayments = salePaymentsData?.content || [];
  const purchasePayments = purchasePaymentsData?.content || [];

  const totalInflows = salePayments.reduce((acc, p) => acc + (Number(p.amountReceived) || 0), 0);
  const totalOutflows = purchasePayments.reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);
  const netPlatformCashflow = totalInflows - totalOutflows;

  // Filtered lists
  const filteredSalePayments = salePayments.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || (
      p.referenceNumber?.toLowerCase().includes(term) ||
      p.sale?.saleNumber?.toLowerCase().includes(term) ||
      p.sale?.customerName?.toLowerCase().includes(term)
    );
    const matchesMode = !modeFilter || p.paymentMode === modeFilter;
    return matchesSearch && matchesMode;
  });

  const filteredPurchasePayments = purchasePayments.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || (
      p.referenceNumber?.toLowerCase().includes(term) ||
      p.purchase?.purchaseNumber?.toLowerCase().includes(term) ||
      p.purchase?.supplierName?.toLowerCase().includes(term)
    );
    const matchesMode = !modeFilter || p.paymentMode === modeFilter;
    return matchesSearch && matchesMode;
  });

  const isLoading = loadingSales || loadingPurchases;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Payments & Cashflow Ledger"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Global Payments' },
        ]}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Customer Inflows</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalInflows)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{salePayments.length} recorded receipts</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <ArrowUpRight className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Supplier Outflows</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalOutflows)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{purchasePayments.length} recorded disbursements</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400">
            <Wallet className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Net Platform Liquidity</span>
          </div>
          <p className={`text-xl font-bold mt-1 ${
            netPlatformCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(netPlatformCashflow)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Aggregated surplus/deficit</p>
        </div>
      </div>

      {/* Navigation Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Direction Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('inflows')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'inflows'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            Customer Receipts ({salePayments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outflows')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'outflows'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-rose-600'
            }`}
          >
            Supplier Disbursements ({purchasePayments.length})
          </button>
        </div>

        {/* Search & Mode Filters */}
        <div className="flex items-center gap-3">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search reference, party, bill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">All Modes</option>
            <option value="CASH">CASH</option>
            <option value="BANK_TRANSFER">BANK TRANSFER</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">CHEQUE</option>
          </select>
        </div>
      </div>

      {/* Content Stream */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200 dark:border-[#1F2837] animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'inflows' ? (
        filteredSalePayments.length === 0 ? (
          <EmptyState
            title="No customer receipts found"
            description="No customer payments match your current criteria."
          />
        ) : (
          <div className="space-y-3">
            <div className="hidden lg:grid lg:grid-cols-[140px_minmax(140px,1.5fr)_minmax(120px,1fr)_100px_110px_100px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
              <div>Reference #</div>
              <div>Customer / Party</div>
              <div>Invoice Ref</div>
              <div>Mode</div>
              <div>Date</div>
              <div className="text-right pr-2">Amount In</div>
            </div>

            {filteredSalePayments.map((payment) => (
              <div
                key={payment.publicId}
                className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-[140px_minmax(140px,1.5fr)_minmax(120px,1fr)_100px_110px_100px] items-center gap-3 px-5 py-3.5 text-sm"
              >
                <div className="font-mono text-xs font-semibold text-gray-800 dark:text-slate-200">
                  {payment.referenceNumber || 'Cash/Auto'}
                </div>
                <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                  {payment.sale?.customerName || 'Customer'}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                  {payment.sale?.saleNumber || 'Direct'}
                </div>
                <div>
                  <Badge variant="info" className="text-[10px]">
                    {payment.paymentMode}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {formatDate(payment.paymentDate)}
                </div>
                <div className="text-right font-bold text-emerald-600 dark:text-emerald-400 pr-2">
                  +{formatCurrency(payment.amountReceived)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredPurchasePayments.length === 0 ? (
          <EmptyState
            title="No supplier payments found"
            description="No supplier disbursements match your current criteria."
          />
        ) : (
          <div className="space-y-3">
            <div className="hidden lg:grid lg:grid-cols-[140px_minmax(140px,1.5fr)_minmax(120px,1fr)_100px_110px_100px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
              <div>Reference #</div>
              <div>Supplier / Party</div>
              <div>Bill Ref</div>
              <div>Mode</div>
              <div>Date</div>
              <div className="text-right pr-2">Amount Out</div>
            </div>

            {filteredPurchasePayments.map((payment) => (
              <div
                key={payment.publicId}
                className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-[140px_minmax(140px,1.5fr)_minmax(120px,1fr)_100px_110px_100px] items-center gap-3 px-5 py-3.5 text-sm"
              >
                <div className="font-mono text-xs font-semibold text-gray-800 dark:text-slate-200">
                  {payment.referenceNumber || 'Cash/Auto'}
                </div>
                <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                  {payment.purchase?.supplierName || 'Supplier'}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                  {payment.purchase?.purchaseNumber || 'Direct'}
                </div>
                <div>
                  <Badge variant="info" className="text-[10px]">
                    {payment.paymentMode}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {formatDate(payment.paymentDate)}
                </div>
                <div className="text-right font-bold text-rose-600 dark:text-rose-400 pr-2">
                  -{formatCurrency(payment.amountPaid)}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
