import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { 
  Download, Layers, Users, AlertTriangle, CheckCircle2, ShieldAlert,
  Search, Filter, RotateCcw, SlidersHorizontal
} from 'lucide-react';
import { 
  getSalesReport,
  getPurchaseReport,
  getExpenseReport,
  getProfitLossReport,
  getStockReport,
  getCustomerOutstandingReport,
  getSupplierOutstandingReport
} from '../api/report';
import { getPartners } from '../api/partner';
import { formatCurrency, formatDate, formatNumber } from '@/lib';
import { Button, Badge } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import {
  exportProfessionalCsv,
  formatCsvNumber,
  formatCsvEnum,
  formatCsvDate,
  formatCsvTimestamp,
} from '../utils/csvExport';

// ── Shared Date Range Picker ─────────────────────────────────────────────────
function DateRangePicker({ 
  startDate, endDate, onStartChange, onEndChange 
}: { 
  startDate: string; endDate: string; 
  onStartChange: (v: string) => void; onEndChange: (v: string) => void 
}) {
  const inputCls = "h-10 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]";
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 whitespace-nowrap">From:</label>
        <input type="date" className={`${inputCls} flex-1 sm:w-auto`} value={startDate} onChange={e => onStartChange(e.target.value)} />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 whitespace-nowrap">To:</label>
        <input type="date" className={`${inputCls} flex-1 sm:w-auto`} value={endDate} onChange={e => onEndChange(e.target.value)} />
      </div>
    </div>
  );
}

// ── Secondary Filter Bar Sub-components ──────────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = 'All',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  allLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
          {label}:
        </span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
      >
        <option value="">{allLabel}</option>
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt.replace(/_/g, ' ') : opt.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
    </div>
  );
}

function FilterSearchInput({
  placeholder = "Search...",
  value,
  onChange,
}: {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative flex-1 min-w-[160px] max-w-xs">
      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 pl-8 pr-3 w-full rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
      />
    </div>
  );
}

function FilteredEmptyState({
  message = "No records match the selected secondary filters.",
  onClear,
}: {
  message?: string;
  onClear: () => void;
}) {
  return (
    <div className="bg-white dark:bg-[#141A24] p-8 rounded-2xl border border-dashed border-gray-200 dark:border-[#1F2837] text-center space-y-3">
      <div className="inline-flex p-3 rounded-xl bg-gray-100 dark:bg-[#0E131C] text-gray-400 dark:text-slate-500">
        <Filter className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{message}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500">Try adjusting or clearing your secondary filters to view more data.</p>
      <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5 text-xs">
        <RotateCcw className="h-3.5 w-3.5" /> Reset Secondary Filters
      </Button>
    </div>
  );
}

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'profit-loss', label: 'Profit & Loss' },
  { id: 'sales', label: 'Sales Report' },
  { id: 'purchases', label: 'Purchases Report' },
  { id: 'expenses', label: 'Expenses Report' },
  { id: 'stock', label: 'Stock & Inventory Value' },
  { id: 'customer-outstanding', label: 'Customer Unpaid Balances' },
  { id: 'supplier-outstanding', label: 'Supplier Unpaid Balances' },
  { id: 'partner-equity', label: 'Partner Shares & Allocation' },
] as const;
type TabId = typeof TABS[number]['id'];

// ── PROFIT & LOSS TAB ────────────────────────────────────────────────────────
function ProfitLossTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['rep-profit-loss', startDate, endDate], 
    queryFn: () => getProfitLossReport(startDate, endDate) 
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [metricFocus, setMetricFocus] = useState<'all' | 'sales' | 'purchases' | 'expenses' | 'profit'>('all');

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalCost = data?.totalPurchaseCost ?? 0;
  const grossProfit = data?.grossProfit ?? (totalRevenue - totalCost);
  const totalExpenses = data?.totalExpenses ?? 0;
  const netProfit = data?.netProfit ?? (grossProfit - totalExpenses);
  const profitMargin = data?.profitMarginPercentage ?? (totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0);
  const salesCount = data?.salesCount ?? 0;
  const purchasesCount = data?.purchasesCount ?? 0;
  const expensesCount = data?.expensesCount ?? 0;
  const categoryBreakdown = data?.categoryBreakdown ?? [];

  // Filtered expense breakdown
  const filteredCategoryBreakdown = useMemo(() => {
    if (!selectedCategory) return categoryBreakdown;
    return categoryBreakdown.filter(c => c.category === selectedCategory);
  }, [categoryBreakdown, selectedCategory]);

  const selectedCategoryTotal = useMemo(() => {
    return filteredCategoryBreakdown.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredCategoryBreakdown]);

  const hasSecondaryFilters = selectedCategory !== '' || metricFocus !== 'all';
  const handleResetFilters = () => {
    setSelectedCategory('');
    setMetricFocus('all');
  };

  const barData = useMemo(() => {
    const items = [
      { id: 'sales', name: 'Sales Income', value: totalRevenue, fill: '#0F7B5C' },
      { id: 'purchases', name: 'Purchases Cost', value: totalCost, fill: '#EF4444' },
      { id: 'gross', name: 'Gross Profit', value: Math.max(0, grossProfit), fill: '#3B82F6' },
      { id: 'expenses', name: 'Expenses', value: selectedCategory ? selectedCategoryTotal : totalExpenses, fill: '#F59E0B' },
      { id: 'profit', name: 'Net Profit', value: Math.max(0, netProfit), fill: netProfit >= 0 ? '#10B981' : '#DC2626' },
    ];
    if (metricFocus === 'all') return items;
    if (metricFocus === 'sales') return items.filter(i => i.id === 'sales' || i.id === 'gross');
    if (metricFocus === 'purchases') return items.filter(i => i.id === 'purchases' || i.id === 'gross');
    if (metricFocus === 'expenses') return items.filter(i => i.id === 'expenses' || i.id === 'profit');
    if (metricFocus === 'profit') return items.filter(i => i.id === 'gross' || i.id === 'profit');
    return items;
  }, [totalRevenue, totalCost, grossProfit, totalExpenses, netProfit, selectedCategory, selectedCategoryTotal, metricFocus]);

  const handleExport = () => {
    exportProfessionalCsv({
      filename: `Profit_and_Loss_Statement_${startDate}_to_${endDate}`,
      documentTitle: 'Profit & Loss Financial Statement',
      subtitle: 'Comprehensive financial performance, operating profitability and expense breakdown',
      metadata: [
        { label: 'Reporting Period', value: `${startDate} to ${endDate}` },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Focus Filter', value: metricFocus === 'all' ? 'All Summary' : metricFocus.toUpperCase() },
        { label: 'Category Filter', value: selectedCategory ? selectedCategory.replace(/_/g, ' ') : 'All Categories' },
        { label: 'Net Profit / (Loss)', value: `INR ${formatCsvNumber(netProfit)}` },
        { label: 'Profit Margin', value: `${profitMargin.toFixed(2)}%` },
      ],
      sections: [
        {
          sectionTitle: 'Financial Executive Summary',
          headers: ['Financial Metric', 'Amount (INR)', 'Analysis & Notes'],
          rows: [
            ['Total Sales Revenue', formatCsvNumber(totalRevenue), `${formatNumber(salesCount)} Sales Invoices`],
            ['Total Purchases Cost', formatCsvNumber(totalCost), `${formatNumber(purchasesCount)} Purchase Bills`],
            ['Gross Profit / (Loss)', formatCsvNumber(grossProfit), 'Total Sales Revenue - Total Purchases Cost'],
            ['Business Operating Expenses', formatCsvNumber(selectedCategory ? selectedCategoryTotal : totalExpenses), `${formatNumber(expensesCount)} Expense Records${selectedCategory ? ` (Filtered by: ${selectedCategory.replace(/_/g, ' ')})` : ''}`],
            ['Net Profit / (Loss)', formatCsvNumber(netProfit), 'Gross Profit - Operating Expenses'],
            ['Net Profit Margin (%)', `${profitMargin.toFixed(2)}%`, '(Net Profit / Total Sales Revenue) * 100'],
          ],
        },
        {
          sectionTitle: 'Operating Expense Category Breakdown',
          headers: ['Expense Category', 'Expense Amount (INR)', 'Share of Total Expenses (%)'],
          rows: filteredCategoryBreakdown.map(c => [
            formatCsvEnum(c.category),
            formatCsvNumber(c.amount),
            `${c.percentage.toFixed(1)}%`
          ]),
          summaryRow: [
            'Total Filtered Expenses',
            formatCsvNumber(selectedCategory ? selectedCategoryTotal : totalExpenses),
            selectedCategory ? '—' : '100.0%'
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Profit & Loss Summary</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Period: {formatDate(startDate)} to {formatDate(endDate)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">Analysis Focus:</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'All Overview' },
              { id: 'sales', label: 'Sales Revenue' },
              { id: 'purchases', label: 'Purchases Cost' },
              { id: 'expenses', label: 'Operating Expenses' },
              { id: 'profit', label: 'Net Profit' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setMetricFocus(f.id as any)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  metricFocus === f.id
                    ? 'bg-white dark:bg-[#1E293B] text-gray-900 dark:text-slate-100 shadow-2xs font-semibold border border-gray-200 dark:border-[#2A384C]'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 hover:bg-gray-200/50 dark:hover:bg-[#1A2434]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200 dark:bg-[#1E293B] hidden sm:block" />

          <FilterSelect
            label="Expense Category"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryBreakdown.map(c => ({ value: c.category, label: c.category.replace(/_/g, ' ') }))}
            allLabel="All Expense Categories"
          />
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className={`bg-white dark:bg-[#131924] rounded-2xl border ${metricFocus === 'sales' ? 'ring-2 ring-emerald-500/30 border-emerald-500/50' : 'border-slate-200/90 dark:border-[#1F2837]'} dark:ring-1 dark:ring-white/[0.04] shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Sales Income</p>
              <Badge variant="success" className="text-[10px] tabular-nums">{formatNumber(salesCount)} Invoices</Badge>
            </div>
            <p className="text-2xl font-serif font-bold tabular-nums mt-2 text-emerald-700 dark:text-emerald-400 break-words">
              {isLoading ? '...' : formatCurrency(totalRevenue)}
            </p>
          </div>
        </div>

        <div className={`bg-white dark:bg-[#131924] rounded-2xl border ${metricFocus === 'purchases' ? 'ring-2 ring-rose-500/30 border-rose-500/50' : 'border-slate-200/90 dark:border-[#1F2837]'} dark:ring-1 dark:ring-white/[0.04] shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Purchases Cost</p>
              <Badge variant="danger" className="text-[10px] tabular-nums">{formatNumber(purchasesCount)} Bills</Badge>
            </div>
            <p className="text-2xl font-serif font-bold tabular-nums mt-2 text-rose-700 dark:text-rose-400 break-words">
              {isLoading ? '...' : formatCurrency(totalCost)}
            </p>
          </div>
        </div>

        <div className={`bg-white dark:bg-[#131924] rounded-2xl border ${metricFocus === 'profit' ? 'ring-2 ring-blue-500/30 border-blue-500/50' : 'border-slate-200/90 dark:border-[#1F2837]'} dark:ring-1 dark:ring-white/[0.04] shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">Gross Profit</p>
              <Badge variant="info" className="text-[10px]">
                {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'}% Margin
              </Badge>
            </div>
            <p className="text-2xl font-serif font-bold tabular-nums mt-2 text-blue-700 dark:text-sky-400 break-words">
              {isLoading ? '...' : formatCurrency(grossProfit)}
            </p>
          </div>
        </div>

        <div className={`bg-white dark:bg-[#131924] rounded-2xl border ${metricFocus === 'expenses' || selectedCategory ? 'ring-2 ring-amber-500/30 border-amber-500/50' : 'border-slate-200/90 dark:border-[#1F2837]'} dark:ring-1 dark:ring-white/[0.04] shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                {selectedCategory ? `${selectedCategory.replace(/_/g, ' ')} Exp.` : 'Expenses'}
              </p>
              <Badge variant="warning" className="text-[10px] tabular-nums">
                {selectedCategory ? `${formatNumber(filteredCategoryBreakdown.length)} Cat.` : `${formatNumber(expensesCount)} Records`}
              </Badge>
            </div>
            <p className="text-2xl font-serif font-bold tabular-nums mt-2 text-amber-700 dark:text-amber-400 break-words">
              {isLoading ? '...' : formatCurrency(selectedCategory ? selectedCategoryTotal : totalExpenses)}
            </p>
          </div>
        </div>

        <div className={`rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between col-span-1 sm:col-span-2 lg:col-span-1 ${netProfit >= 0 ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : 'bg-rose-50/30 dark:bg-rose-950/20'}`}>
          <div>
            <div className="flex justify-between items-start">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-700 dark:text-slate-300">Net Profit</p>
              <Badge variant={netProfit >= 0 ? 'success' : 'danger'} className="text-[10px]">
                {profitMargin >= 0 ? `+${profitMargin.toFixed(1)}%` : `${profitMargin.toFixed(1)}%`}
              </Badge>
            </div>
            <p className={`text-2xl font-serif font-bold tabular-nums mt-2 break-words ${netProfit >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {isLoading ? '...' : formatCurrency(netProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* P&L Chart & Expense Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Financial Overview {metricFocus !== 'all' && `(${metricFocus.toUpperCase()})`}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-gray-400">Loading metrics...</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), 'Amount']} />
                  <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Operating Expense Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Business Expenses by Category</CardTitle>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="text-xs text-blue-600 dark:text-sky-400 hover:underline font-medium"
                >
                  Show All
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[280px] flex items-center justify-center text-gray-400">Loading...</div>
            ) : filteredCategoryBreakdown.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-gray-400 text-sm">
                <Layers className="h-8 w-8 text-gray-300 mb-2" />
                No expenses logged for this filter.
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {filteredCategoryBreakdown.map(cat => (
                  <div 
                    key={cat.category} 
                    onClick={() => setSelectedCategory(selectedCategory === cat.category ? '' : cat.category)}
                    className="space-y-1.5 cursor-pointer group p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1E293B] transition-colors"
                    title="Click to filter by this category"
                  >
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700 dark:text-slate-300 group-hover:text-[var(--color-primary)]">
                        {cat.category.replace(/_/g, ' ')}
                      </span>
                      <span className="tabular-nums text-gray-900 dark:text-slate-100 font-medium">
                        {formatCurrency(cat.amount)} <span className="text-gray-400">({cat.percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 dark:bg-[#1E293B] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }} 
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100 dark:border-[#1E293B] flex justify-between text-xs font-semibold text-gray-700 dark:text-slate-300">
                  <span>{selectedCategory ? `${selectedCategory.replace(/_/g, ' ')} Subtotal` : 'Total Business Expenses'}</span>
                  <span className="tabular-nums text-amber-800 dark:text-amber-400">
                    {formatCurrency(selectedCategory ? selectedCategoryTotal : totalExpenses)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── SALES TAB ────────────────────────────────────────────────────────────────
function SalesTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: sales = [], isLoading } = useQuery({ 
    queryKey: ['rep-sales-tab', startDate, endDate], 
    queryFn: () => getSalesReport(startDate, endDate) 
  });

  // Secondary filter state
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Derived options from fetched sales in this date range
  const customerOptions = useMemo(() => {
    return Array.from(new Set(sales.map(s => s.customerName).filter(Boolean))).sort();
  }, [sales]);

  const materialOptions = useMemo(() => {
    return Array.from(new Set(sales.map(s => s.rawMaterial).filter(Boolean) as string[])).sort();
  }, [sales]);

  // Progressive filtered data
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (selectedCustomer && s.customerName !== selectedCustomer) return false;
      if (selectedStatus && s.paymentStatus !== selectedStatus) return false;
      if (selectedMaterial && s.rawMaterial !== selectedMaterial) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = s.saleNumber?.toLowerCase().includes(q);
        const matchCustomer = s.customerName?.toLowerCase().includes(q);
        const matchRef = s.customerInvoiceNumber?.toLowerCase().includes(q);
        const matchMat = s.rawMaterial?.toLowerCase().includes(q);
        if (!matchInvoice && !matchCustomer && !matchRef && !matchMat) return false;
      }
      return true;
    });
  }, [sales, selectedCustomer, selectedStatus, selectedMaterial, searchQuery]);

  const hasSecondaryFilters = selectedCustomer !== '' || selectedStatus !== '' || selectedMaterial !== '' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCustomer('');
    setSelectedStatus('');
    setSelectedMaterial('');
    setSearchQuery('');
  };

  const totalFilteredValue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredSales]);

  const handleExport = () => {
    const filterDesc = [
      selectedCustomer && `Customer: ${selectedCustomer}`,
      selectedStatus && `Status: ${formatCsvEnum(selectedStatus)}`,
      selectedMaterial && `Material: ${selectedMaterial}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Sales';

    exportProfessionalCsv({
      filename: `Sales_Report_${startDate}_to_${endDate}`,
      documentTitle: 'Sales Revenue & Tax Invoices Report',
      subtitle: 'Itemized sales transactions, customer billing, and payment settlements',
      metadata: [
        { label: 'Reporting Period', value: `${startDate} to ${endDate}` },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Total Filtered Invoices', value: formatNumber(filteredSales.length) },
        { label: 'Total Filtered Revenue (INR)', value: formatCsvNumber(totalFilteredValue) },
      ],
      sections: [
        {
          sectionTitle: 'Itemized Sales Invoices',
          headers: [
            'Date',
            'Sale Sequence #',
            'Tax Invoice #',
            'Customer Name',
            'Material / Item',
            'Quantity',
            'Unit',
            'Rate / Unit (INR)',
            'Total Amount (INR)',
            'Payment Status',
          ],
          rows: filteredSales.map(s => [
            formatCsvDate(s.saleDate),
            s.saleNumber || '—',
            s.customerInvoiceNumber || '—',
            s.customerName,
            s.rawMaterial || '—',
            s.weight !== undefined && s.weight !== null ? formatCsvNumber(s.weight, 3) : '—',
            s.unit || '—',
            s.ratePerUnit !== undefined && s.ratePerUnit !== null ? formatCsvNumber(s.ratePerUnit) : '—',
            formatCsvNumber(s.totalAmount),
            formatCsvEnum(s.paymentStatus)
          ]),
          summaryRow: [
            'Total Filtered Sales',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            formatCsvNumber(totalFilteredValue),
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Export */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">{formatNumber(filteredSales.length)}</span>
          {filteredSales.length !== sales.length ? ` of ${formatNumber(sales.length)} transactions (filtered)` : ` transactions in period`}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search invoice #, customer..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterSelect
            label="Customer"
            value={selectedCustomer}
            onChange={setSelectedCustomer}
            options={customerOptions}
            allLabel="All Customers"
          />
          <FilterSelect
            label="Payment Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { value: 'PAID', label: 'Fully Paid' },
              { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { value: 'PENDING', label: 'Unpaid' },
            ]}
            allLabel="All Statuses"
          />
          {materialOptions.length > 0 && (
            <FilterSelect
              label="Material"
              value={selectedMaterial}
              onChange={setSelectedMaterial}
              options={materialOptions}
              allLabel="All Materials"
            />
          )}
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Table / Empty State */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading sales report…
        </div>
      ) : sales.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No sales records found in this date period.
        </div>
      ) : filteredSales.length === 0 ? (
        <FilteredEmptyState message="No sales transactions match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Date',
                'Invoice #',
                'Customer',
                'Material',
                'Total Amount',
                'Payment Status'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredSales.map(s => (
                <tr key={s.publicId} className="hover:bg-gray-50 dark:hover:bg-[#1A2331]">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">{formatDate(s.saleDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 dark:text-sky-300">{s.saleNumber || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{s.customerName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{s.rawMaterial || '—'}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{formatCurrency(s.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.paymentStatus === 'PAID' ? 'success' : s.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}>
                      {s.paymentStatus === 'PAID' ? 'Fully Paid' : s.paymentStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Sales Value ({formatNumber(filteredSales.length)} {filteredSales.length === 1 ? 'sale' : 'sales'})
                </td>
                <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400 font-bold text-base">
                  {formatCurrency(totalFilteredValue)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── PURCHASES TAB ────────────────────────────────────────────────────────────
function PurchasesTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: purchases = [], isLoading } = useQuery({ 
    queryKey: ['rep-purchases-tab', startDate, endDate], 
    queryFn: () => getPurchaseReport(startDate, endDate) 
  });

  // Secondary filter state
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Derived options from fetched purchases in this date range
  const supplierOptions = useMemo(() => {
    return Array.from(new Set(purchases.map(p => p.supplierName).filter(Boolean))).sort();
  }, [purchases]);

  const materialOptions = useMemo(() => {
    return Array.from(new Set(purchases.map(p => p.rawMaterial).filter(Boolean) as string[])).sort();
  }, [purchases]);

  // Progressive filtered data
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (selectedSupplier && p.supplierName !== selectedSupplier) return false;
      if (selectedStatus && p.paymentStatus !== selectedStatus) return false;
      if (selectedMaterial && p.rawMaterial !== selectedMaterial) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBill = p.purchaseNumber?.toLowerCase().includes(q);
        const matchSupplier = p.supplierName?.toLowerCase().includes(q);
        const matchRef = p.supplierInvoiceNumber?.toLowerCase().includes(q);
        const matchMat = p.rawMaterial?.toLowerCase().includes(q);
        if (!matchBill && !matchSupplier && !matchRef && !matchMat) return false;
      }
      return true;
    });
  }, [purchases, selectedSupplier, selectedStatus, selectedMaterial, searchQuery]);

  const hasSecondaryFilters = selectedSupplier !== '' || selectedStatus !== '' || selectedMaterial !== '' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedSupplier('');
    setSelectedStatus('');
    setSelectedMaterial('');
    setSearchQuery('');
  };

  const totalFilteredCost = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  }, [filteredPurchases]);

  const handleExport = () => {
    const filterDesc = [
      selectedSupplier && `Supplier: ${selectedSupplier}`,
      selectedStatus && `Status: ${formatCsvEnum(selectedStatus)}`,
      selectedMaterial && `Material: ${selectedMaterial}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Purchases';

    exportProfessionalCsv({
      filename: `Purchases_Report_${startDate}_to_${endDate}`,
      documentTitle: 'Purchases & Supplier Bills Report',
      subtitle: 'Itemized procurement transactions, supplier billing, and payment settlements',
      metadata: [
        { label: 'Reporting Period', value: `${startDate} to ${endDate}` },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Total Filtered Bills', value: formatNumber(filteredPurchases.length) },
        { label: 'Total Filtered Cost (INR)', value: formatCsvNumber(totalFilteredCost) },
      ],
      sections: [
        {
          sectionTitle: 'Itemized Purchase Bills',
          headers: [
            'Date',
            'Purchase Sequence #',
            'Supplier Bill / Inv #',
            'Supplier Name',
            'Material / Item',
            'Quantity',
            'Unit',
            'Rate / Unit (INR)',
            'Total Amount (INR)',
            'Payment Status',
          ],
          rows: filteredPurchases.map(p => [
            formatCsvDate(p.purchaseDate),
            p.purchaseNumber || '—',
            p.supplierInvoiceNumber || '—',
            p.supplierName,
            p.rawMaterial || '—',
            p.weight !== undefined && p.weight !== null ? formatCsvNumber(p.weight, 3) : '—',
            p.unit || '—',
            p.ratePerUnit !== undefined && p.ratePerUnit !== null ? formatCsvNumber(p.ratePerUnit) : '—',
            formatCsvNumber(p.totalAmount),
            formatCsvEnum(p.paymentStatus)
          ]),
          summaryRow: [
            'Total Filtered Purchases',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            formatCsvNumber(totalFilteredCost),
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Export */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">{formatNumber(filteredPurchases.length)}</span>
          {filteredPurchases.length !== purchases.length ? ` of ${formatNumber(purchases.length)} bills (filtered)` : ` purchase bills recorded`}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search bill #, supplier..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterSelect
            label="Supplier"
            value={selectedSupplier}
            onChange={setSelectedSupplier}
            options={supplierOptions}
            allLabel="All Suppliers"
          />
          <FilterSelect
            label="Payment Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { value: 'PAID', label: 'Fully Paid' },
              { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
              { value: 'PENDING', label: 'Unpaid' },
            ]}
            allLabel="All Statuses"
          />
          {materialOptions.length > 0 && (
            <FilterSelect
              label="Material"
              value={selectedMaterial}
              onChange={setSelectedMaterial}
              options={materialOptions}
              allLabel="All Materials"
            />
          )}
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Table / Empty State */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading purchase report…
        </div>
      ) : purchases.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No purchases recorded in this date period.
        </div>
      ) : filteredPurchases.length === 0 ? (
        <FilteredEmptyState message="No purchase bills match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Date',
                'Bill #',
                'Supplier',
                'Material',
                'Total Amount',
                'Payment Status'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredPurchases.map(p => (
                <tr key={p.publicId} className="hover:bg-gray-50 dark:hover:bg-[#1A2331]">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">{formatDate(p.purchaseDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 dark:text-sky-300">{p.purchaseNumber || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{p.supplierName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{p.rawMaterial || '—'}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-rose-700 dark:text-rose-400">{formatCurrency(p.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.paymentStatus === 'PAID' ? 'success' : p.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}>
                      {p.paymentStatus === 'PAID' ? 'Fully Paid' : p.paymentStatus === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Purchases Cost ({formatNumber(filteredPurchases.length)} {filteredPurchases.length === 1 ? 'bill' : 'bills'})
                </td>
                <td className="px-4 py-3 tabular-nums text-rose-700 dark:text-rose-400 font-bold text-base">
                  {formatCurrency(totalFilteredCost)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── EXPENSES TAB ─────────────────────────────────────────────────────────────
function ExpensesTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: expenses = [], isLoading } = useQuery({ 
    queryKey: ['rep-expenses-tab', startDate, endDate], 
    queryFn: () => getExpenseReport(startDate, endDate) 
  });

  // Secondary filter state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Derived options from fetched expenses in this date range
  const categoryOptions = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.category).filter(Boolean) as string[])).sort();
  }, [expenses]);

  const paymentModeOptions = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.paymentMode).filter(Boolean) as string[])).sort();
  }, [expenses]);

  // Progressive filtered data
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (selectedCategory && e.category !== selectedCategory) return false;
      if (selectedPaymentMode && e.paymentMode !== selectedPaymentMode) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchNum = e.expenseNumber?.toLowerCase().includes(q);
        if (!matchDesc && !matchNum) return false;
      }
      return true;
    });
  }, [expenses, selectedCategory, selectedPaymentMode, searchQuery]);

  const hasSecondaryFilters = selectedCategory !== '' || selectedPaymentMode !== '' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedPaymentMode('');
    setSearchQuery('');
  };

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleExport = () => {
    const filterDesc = [
      selectedCategory && `Category: ${selectedCategory.replace(/_/g, ' ')}`,
      selectedPaymentMode && `Payment Mode: ${selectedPaymentMode.replace(/_/g, ' ')}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Expenses';

    exportProfessionalCsv({
      filename: `Expenses_Report_${startDate}_to_${endDate}`,
      documentTitle: 'Business Operating Expenses Report',
      subtitle: 'Itemized operating expenses, overheads, and payment disbursements',
      metadata: [
        { label: 'Reporting Period', value: `${startDate} to ${endDate}` },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Total Filtered Records', value: formatNumber(filteredExpenses.length) },
        { label: 'Total Filtered Expenses (INR)', value: formatCsvNumber(totalFilteredAmount) },
      ],
      sections: [
        {
          sectionTitle: 'Itemized Business Expenses',
          headers: [
            'Date',
            'Expense Ref #',
            'Expense Category',
            'Payment Method',
            'Amount (INR)',
            'Description / Notes',
          ],
          rows: filteredExpenses.map(e => [
            formatCsvDate(e.expenseDate),
            e.expenseNumber || '—',
            formatCsvEnum(e.category),
            formatCsvEnum(e.paymentMode),
            formatCsvNumber(e.amount),
            e.description || '—'
          ]),
          summaryRow: [
            'Total Filtered Expenses',
            '',
            '',
            '',
            formatCsvNumber(totalFilteredAmount),
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Export */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
          <span className="font-semibold text-gray-900 dark:text-slate-100 tabular-nums">{formatNumber(filteredExpenses.length)}</span>
          {filteredExpenses.length !== expenses.length ? ` of ${formatNumber(expenses.length)} records (filtered)` : ` expense records`}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search description, expense #..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          {categoryOptions.length > 0 && (
            <FilterSelect
              label="Category"
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              allLabel="All Categories"
            />
          )}
          {paymentModeOptions.length > 0 && (
            <FilterSelect
              label="Payment Method"
              value={selectedPaymentMode}
              onChange={setSelectedPaymentMode}
              options={paymentModeOptions}
              allLabel="All Payment Methods"
            />
          )}
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Table / Empty State */}
      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading expense report…
        </div>
      ) : expenses.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No expenses logged in this date period.
        </div>
      ) : filteredExpenses.length === 0 ? (
        <FilteredEmptyState message="No expenses match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Date',
                'Expense #',
                'Category',
                'Payment Method',
                'Amount',
                'Description'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredExpenses.map(e => (
                <tr key={e.publicId} className="hover:bg-gray-50 dark:hover:bg-[#1A2331]">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-slate-300">{formatDate(e.expenseDate)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700 dark:text-sky-300">{e.expenseNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default" className="text-[10px]">
                      {e.category ? e.category.replace(/_/g, ' ') : 'OTHER'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">
                    {e.paymentMode ? e.paymentMode.replace(/_/g, ' ') : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-rose-700 dark:text-rose-400">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs">{e.description || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Business Expenses ({formatNumber(filteredExpenses.length)} {filteredExpenses.length === 1 ? 'record' : 'records'})
                </td>
                <td className="px-4 py-3 tabular-nums text-rose-700 dark:text-rose-400 font-bold text-base">
                  {formatCurrency(totalFilteredAmount)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── STOCK VALUATION TAB ───────────────────────────────────────────────────────
function StockTab() {
  const { data: stocks = [], isLoading } = useQuery({ queryKey: ['rep-stock'], queryFn: getStockReport });

  // Secondary filters
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const unitOptions = useMemo(() => {
    return Array.from(new Set(stocks.map(s => s.unit).filter(Boolean))).sort();
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      const status = s.stockStatus ?? (s.currentQuantity <= s.minimumStockLevel ? 'LOW_STOCK' : 'HEALTHY');
      if (selectedStatus && status !== selectedStatus) return false;
      if (selectedUnit && s.unit !== selectedUnit) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!s.rawMaterial?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stocks, selectedStatus, selectedUnit, searchQuery]);

  const hasSecondaryFilters = selectedStatus !== '' || selectedUnit !== '' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedStatus('');
    setSelectedUnit('');
    setSearchQuery('');
  };

  const totalPortfolioValuation = useMemo(() => {
    return filteredStocks.reduce((sum, s) => sum + (s.totalValuation ?? 0), 0);
  }, [filteredStocks]);

  const totalPhysicalQuantity = useMemo(() => {
    return filteredStocks.reduce((sum, s) => sum + (s.currentQuantity ?? 0), 0);
  }, [filteredStocks]);

  const lowStockCount = useMemo(() => {
    return filteredStocks.filter(s => {
      const st = s.stockStatus ?? (s.currentQuantity <= s.minimumStockLevel ? 'LOW_STOCK' : 'HEALTHY');
      return st === 'LOW_STOCK' || st === 'OUT_OF_STOCK';
    }).length;
  }, [filteredStocks]);

  const handleExport = () => {
    const filterDesc = [
      selectedStatus && `Health: ${formatCsvEnum(selectedStatus)}`,
      selectedUnit && `Unit: ${selectedUnit}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Inventory';

    const currentDateStr = formatCsvDate(new Date().toISOString());

    exportProfessionalCsv({
      filename: `Stock_and_Inventory_Valuation_${currentDateStr}`,
      documentTitle: 'Stock & Inventory Valuation Report',
      subtitle: 'Real-time raw material balances, inventory valuation, and minimum stock alerts',
      metadata: [
        { label: 'As of Date', value: currentDateStr },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Total Filtered Items', value: filteredStocks.length },
        { label: 'Total Inventory Valuation (INR)', value: formatCsvNumber(totalPortfolioValuation) },
        { label: 'Low Stock Alert Items', value: lowStockCount },
      ],
      sections: [
        {
          sectionTitle: 'Raw Material Inventory Levels & Valuation',
          headers: [
            'Material / Item Name',
            'Unit',
            'In Stock Quantity',
            'Minimum Stock Level',
            'Valuation Rate / Unit (INR)',
            'Total Valuation (INR)',
            'Stock Health Status',
          ],
          rows: filteredStocks.map(s => {
            const st = s.stockStatus ?? (s.currentQuantity <= s.minimumStockLevel ? 'LOW_STOCK' : 'HEALTHY');
            return [
              s.rawMaterial,
              s.unit,
              formatCsvNumber(s.currentQuantity, 3),
              formatCsvNumber(s.minimumStockLevel, 3),
              formatCsvNumber(s.valuationRate ?? 0),
              formatCsvNumber(s.totalValuation ?? 0),
              st === 'OUT_OF_STOCK' ? 'Out of Stock' : st === 'LOW_STOCK' ? 'Low Stock Alert' : 'In Stock'
            ];
          }),
          summaryRow: [
            'Total Inventory Valuation',
            '',
            '',
            '',
            '',
            formatCsvNumber(totalPortfolioValuation),
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Stock & Inventory Valuation</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Current stock quantity multiplied by unit purchase price</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search material/item name..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterSelect
            label="Stock Health"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { value: 'HEALTHY', label: 'Sufficient Stock (Healthy)' },
              { value: 'LOW_STOCK', label: 'Low Stock' },
              { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
            ]}
            allLabel="All Stock Statuses"
          />
          {unitOptions.length > 0 && (
            <FilterSelect
              label="Measurement Unit"
              value={selectedUnit}
              onChange={setSelectedUnit}
              options={unitOptions}
              allLabel="All Units"
            />
          )}
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Valuation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Total Inventory Value</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-blue-800">
              {isLoading ? '...' : formatCurrency(totalPortfolioValuation)}
            </p>
            <p className="text-[11px] text-blue-600 mt-1">
              For {formatNumber(filteredStocks.length)} {filteredStocks.length !== stocks.length ? `(of ${formatNumber(stocks.length)})` : ''} items
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Total Stock Quantity</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-800">
              {isLoading ? '...' : `${formatNumber(totalPhysicalQuantity)}`}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">Physical count across filtered catalog</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${lowStockCount > 0 ? 'border-l-amber-500 bg-amber-50/20' : 'border-l-gray-300'}`}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Stock Health</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {isLoading ? '...' : lowStockCount === 0 ? 'Optimal' : `${formatNumber(lowStockCount)} Items Low`}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              {lowStockCount > 0 ? 'Reordering recommended soon' : 'All stock levels healthy'}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading stock valuation…
        </div>
      ) : stocks.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No stock items registered in catalog.
        </div>
      ) : filteredStocks.length === 0 ? (
        <FilteredEmptyState message="No stock items match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Item / Material Name',
                'Unit',
                'Current Quantity',
                'Min Safe Level',
                'Price per Unit',
                'Total Stock Value',
                'Stock Status'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredStocks.map(s => {
                const status = s.stockStatus ?? (s.currentQuantity <= s.minimumStockLevel ? 'LOW_STOCK' : 'HEALTHY');
                return (
                  <tr key={s.publicId} className={`hover:bg-gray-50 dark:hover:bg-[#1A2331] ${status === 'LOW_STOCK' ? 'bg-amber-50/30' : status === 'OUT_OF_STOCK' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{s.rawMaterial}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.unit}</td>
                    <td className={`px-4 py-3 tabular-nums font-semibold ${status !== 'HEALTHY' ? 'text-amber-700' : 'text-gray-900 dark:text-slate-100'}`}>
                      {formatNumber(s.currentQuantity)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-400">{formatNumber(s.minimumStockLevel)}</td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-slate-300">
                      {s.valuationRate != null && s.valuationRate > 0 ? formatCurrency(s.valuationRate) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-bold text-blue-700 dark:text-sky-400">
                      {formatCurrency(s.totalValuation ?? 0)}
                    </td>
                    <td className="px-4 py-3">
                      {status === 'HEALTHY' && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Sufficient Stock
                        </Badge>
                      )}
                      {status === 'LOW_STOCK' && (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Low Stock
                        </Badge>
                      )}
                      {status === 'OUT_OF_STOCK' && (
                        <Badge variant="danger" className="gap-1">
                          <ShieldAlert className="h-3 w-3" /> Out of Stock
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Filtered Inventory Stock ({formatNumber(filteredStocks.length)} items)
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-900 dark:text-slate-100 font-bold">{formatNumber(totalPhysicalQuantity)}</td>
                <td colSpan={2} />
                <td className="px-4 py-3 tabular-nums text-blue-800 dark:text-sky-400 font-bold text-base">
                  {formatCurrency(totalPortfolioValuation)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CUSTOMER OUTSTANDING TAB ──────────────────────────────────────────────────
function CustomerOutstandingTab() {
  const { data: outstanding = [], isLoading } = useQuery({ 
    queryKey: ['rep-customers-outstanding'], 
    queryFn: getCustomerOutstandingReport 
  });

  // Secondary filters
  const [selectedCity, setSelectedCity] = useState('');
  const [balanceThreshold, setBalanceThreshold] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const cityOptions = useMemo(() => {
    return Array.from(new Set(outstanding.map(c => c.city).filter(Boolean) as string[])).sort();
  }, [outstanding]);

  const filteredCustomers = useMemo(() => {
    return outstanding.filter(c => {
      if (selectedCity && c.city !== selectedCity) return false;
      if (balanceThreshold) {
        const threshold = Number(balanceThreshold);
        if ((c.outstandingAmount ?? 0) < threshold) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.customerName?.toLowerCase().includes(q);
        const matchPhone = c.mobileNumber?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCity) return false;
      }
      return true;
    });
  }, [outstanding, selectedCity, balanceThreshold, searchQuery]);

  const hasSecondaryFilters = selectedCity !== '' || balanceThreshold !== '' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCity('');
    setBalanceThreshold('');
    setSearchQuery('');
  };

  const totalOutstanding = useMemo(() => {
    return filteredCustomers.reduce((s, c) => s + (c.outstandingAmount ?? 0), 0);
  }, [filteredCustomers]);

  const totalInvoiced = useMemo(() => {
    return filteredCustomers.reduce((s, c) => s + (c.totalInvoiced ?? 0), 0);
  }, [filteredCustomers]);

  const totalReceived = useMemo(() => {
    return filteredCustomers.reduce((s, c) => s + (c.totalReceived ?? 0), 0);
  }, [filteredCustomers]);

  const handleExport = () => {
    const filterDesc = [
      selectedCity && `City: ${selectedCity}`,
      balanceThreshold && `Threshold: > ${formatCurrency(Number(balanceThreshold))}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Customers';

    const currentDateStr = formatCsvDate(new Date().toISOString());

    exportProfessionalCsv({
      filename: `Customer_Unpaid_Balances_${currentDateStr}`,
      documentTitle: 'Customer Unpaid Balances & Accounts Receivable Report',
      subtitle: 'Summary of outstanding invoices, customer ledger totals, and pending collections',
      metadata: [
        { label: 'As of Date', value: currentDateStr },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Total Debtors Count', value: formatNumber(filteredCustomers.length) },
        { label: 'Total Unpaid Receivables (INR)', value: formatCsvNumber(totalOutstanding) },
      ],
      sections: [
        {
          sectionTitle: 'Customer Receivables Ledger',
          headers: [
            'Customer Name',
            'Mobile Number',
            'Email Address',
            'City / Location',
            'Total Invoiced (INR)',
            'Total Collected (INR)',
            'Outstanding Balance (INR)',
            'Last Activity Date',
          ],
          rows: filteredCustomers.map(c => [
            c.customerName,
            c.mobileNumber || '—',
            c.email || '—',
            c.city || '—',
            formatCsvNumber(c.totalInvoiced ?? 0),
            formatCsvNumber(c.totalReceived ?? 0),
            formatCsvNumber(c.outstandingAmount),
            formatCsvDate(c.lastTransactionDate)
          ]),
          summaryRow: [
            'Total Receivables',
            '',
            '',
            '',
            formatCsvNumber(totalInvoiced),
            formatCsvNumber(totalReceived),
            formatCsvNumber(totalOutstanding),
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Customer Unpaid Balances & Money to Collect</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Total pending payments across all customer invoices</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search customer, mobile, city..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          {cityOptions.length > 0 && (
            <FilterSelect
              label="City"
              value={selectedCity}
              onChange={setSelectedCity}
              options={cityOptions}
              allLabel="All Cities"
            />
          )}
          <FilterSelect
            label="Pending Balance"
            value={balanceThreshold}
            onChange={setBalanceThreshold}
            options={[
              { value: '1000', label: 'Over ₹1,000' },
              { value: '10000', label: 'Over ₹10,000' },
              { value: '50000', label: 'Over ₹50,000' },
              { value: '100000', label: 'Over ₹1,00,000' },
            ]}
            allLabel="All Balances"
          />
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500 bg-red-50/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">Total Money to Collect</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-red-700">
              {isLoading ? '...' : formatCurrency(totalOutstanding)}
            </p>
            <p className="text-[11px] text-red-600 mt-1">
              Pending from {formatNumber(filteredCustomers.length)} {filteredCustomers.length !== outstanding.length ? `(of ${formatNumber(outstanding.length)})` : ''} customers
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Total Money Collected</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-800">
              {isLoading ? '...' : formatCurrency(totalReceived)}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">Cumulative payments received from filtered customers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Total Invoiced Value</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-gray-900 dark:text-slate-100">
              {isLoading ? '...' : formatCurrency(totalInvoiced)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Total sales invoiced across filtered customers</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading customer balances…
        </div>
      ) : outstanding.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No customers with unpaid balance. All accounts cleared!
        </div>
      ) : filteredCustomers.length === 0 ? (
        <FilteredEmptyState message="No customers match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[660px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Customer Name',
                'Contact & City',
                'Total Invoiced',
                'Total Collected',
                'Remaining to Collect',
                'Last Activity'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredCustomers.map(c => (
                <tr key={c.customerPublicId} className="hover:bg-gray-50 dark:hover:bg-[#1A2331]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{c.customerName}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-700 dark:text-slate-300 font-medium">{c.mobileNumber || '—'}</div>
                    <div className="text-[11px] text-gray-400">{c.city ? `${c.city}${c.email ? ` • ${c.email}` : ''}` : c.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-slate-400">{formatCurrency(c.totalInvoiced ?? 0)}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">{formatCurrency(c.totalReceived ?? 0)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-red-700 dark:text-rose-400">{formatCurrency(c.outstandingAmount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {c.lastTransactionDate ? formatDate(c.lastTransactionDate) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Filtered Unpaid Balance ({formatNumber(filteredCustomers.length)} {filteredCustomers.length === 1 ? 'customer' : 'customers'})
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-slate-400">{formatCurrency(totalInvoiced)}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(totalReceived)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700 dark:text-rose-400 text-base">{formatCurrency(totalOutstanding)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SUPPLIER OUTSTANDING TAB ──────────────────────────────────────────────────
function SupplierOutstandingTab() {
  const { data: outstanding = [], isLoading } = useQuery({ 
    queryKey: ['rep-suppliers-outstanding'], 
    queryFn: getSupplierOutstandingReport 
  });

  // Secondary filters
  const [selectedCity, setSelectedCity] = useState('');
  const [balanceThreshold, setBalanceThreshold] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const cityOptions = useMemo(() => {
    return Array.from(new Set(outstanding.map(s => s.city).filter(Boolean) as string[])).sort();
  }, [outstanding]);

  const filteredSuppliers = useMemo(() => {
    return outstanding.filter(s => {
      if (selectedCity && s.city !== selectedCity) return false;
      if (balanceThreshold) {
        const threshold = Number(balanceThreshold);
        if ((s.outstandingAmount ?? 0) < threshold) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.supplierName?.toLowerCase().includes(q);
        const matchPhone = s.mobileNumber?.toLowerCase().includes(q);
        const matchEmail = s.email?.toLowerCase().includes(q);
        const matchCity = s.city?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCity) return false;
      }
      return true;
    });
  }, [outstanding, selectedCity, balanceThreshold, searchQuery]);

  const hasSecondaryFilters = selectedCity !== '' || balanceThreshold !== '' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedCity('');
    setBalanceThreshold('');
    setSearchQuery('');
  };

  const totalOutstanding = useMemo(() => {
    return filteredSuppliers.reduce((s, c) => s + (c.outstandingAmount ?? 0), 0);
  }, [filteredSuppliers]);

  const totalBilled = useMemo(() => {
    return filteredSuppliers.reduce((s, c) => s + (c.totalBilled ?? 0), 0);
  }, [filteredSuppliers]);

  const totalPaid = useMemo(() => {
    return filteredSuppliers.reduce((s, c) => s + (c.totalPaid ?? 0), 0);
  }, [filteredSuppliers]);

  const handleExport = () => {
    const filterDesc = [
      selectedCity && `City: ${selectedCity}`,
      balanceThreshold && `Threshold: > ${formatCurrency(Number(balanceThreshold))}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Suppliers';

    const currentDateStr = formatCsvDate(new Date().toISOString());

    exportProfessionalCsv({
      filename: `Supplier_Unpaid_Balances_${currentDateStr}`,
      documentTitle: 'Supplier Unpaid Balances & Accounts Payable Report',
      subtitle: 'Summary of outstanding bills, supplier ledger totals, and pending disbursements',
      metadata: [
        { label: 'As of Date', value: currentDateStr },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Total Creditors Count', value: formatNumber(filteredSuppliers.length) },
        { label: 'Total Unpaid Payables (INR)', value: formatCsvNumber(totalOutstanding) },
      ],
      sections: [
        {
          sectionTitle: 'Supplier Payables Ledger',
          headers: [
            'Supplier Name',
            'Mobile Number',
            'Email Address',
            'City / Location',
            'Total Billed (INR)',
            'Total Paid (INR)',
            'Pending Balance (INR)',
            'Last Activity Date',
          ],
          rows: filteredSuppliers.map(s => [
            s.supplierName,
            s.mobileNumber || '—',
            s.email || '—',
            s.city || '—',
            formatCsvNumber(s.totalBilled ?? 0),
            formatCsvNumber(s.totalPaid ?? 0),
            formatCsvNumber(s.outstandingAmount),
            formatCsvDate(s.lastTransactionDate)
          ]),
          summaryRow: [
            'Total Payables',
            '',
            '',
            '',
            formatCsvNumber(totalBilled),
            formatCsvNumber(totalPaid),
            formatCsvNumber(totalOutstanding),
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Supplier Unpaid Balances & Money to Pay</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Total pending payments across all supplier bills</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search supplier, mobile, city..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          {cityOptions.length > 0 && (
            <FilterSelect
              label="City"
              value={selectedCity}
              onChange={setSelectedCity}
              options={cityOptions}
              allLabel="All Cities"
            />
          )}
          <FilterSelect
            label="Pending Balance"
            value={balanceThreshold}
            onChange={setBalanceThreshold}
            options={[
              { value: '1000', label: 'Over ₹1,000' },
              { value: '10000', label: 'Over ₹10,000' },
              { value: '50000', label: 'Over ₹50,000' },
              { value: '100000', label: 'Over ₹1,00,000' },
            ]}
            allLabel="All Balances"
          />
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-rose-600 bg-rose-50/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-rose-900 uppercase tracking-wide">Total Money to Pay</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-rose-700">
              {isLoading ? '...' : formatCurrency(totalOutstanding)}
            </p>
            <p className="text-[11px] text-rose-600 mt-1">
              Pending payments to {formatNumber(filteredSuppliers.length)} {filteredSuppliers.length !== outstanding.length ? `(of ${formatNumber(outstanding.length)})` : ''} suppliers
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">Total Money Paid</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-800">
              {isLoading ? '...' : formatCurrency(totalPaid)}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">Cumulative payments made to filtered suppliers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Total Purchases Billed</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-gray-900 dark:text-slate-100">
              {isLoading ? '...' : formatCurrency(totalBilled)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">Total purchases billed across filtered suppliers</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading supplier balances…
        </div>
      ) : outstanding.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No unpaid supplier bills. All balances settled!
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <FilteredEmptyState message="No suppliers match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[660px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Supplier Name',
                'Contact & City',
                'Total Billed',
                'Total Paid',
                'Remaining to Pay',
                'Last Activity'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredSuppliers.map(s => (
                <tr key={s.supplierPublicId} className="hover:bg-gray-50 dark:hover:bg-[#1A2331]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{s.supplierName}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-700 dark:text-slate-300 font-medium">{s.mobileNumber || '—'}</div>
                    <div className="text-[11px] text-gray-400">{s.city ? `${s.city}${s.email ? ` • ${s.email}` : ''}` : s.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-slate-400">{formatCurrency(s.totalBilled ?? 0)}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">{formatCurrency(s.totalPaid ?? 0)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-rose-700 dark:text-rose-400">{formatCurrency(s.outstandingAmount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {s.lastTransactionDate ? formatDate(s.lastTransactionDate) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Filtered Unpaid Balance ({formatNumber(filteredSuppliers.length)} {filteredSuppliers.length === 1 ? 'supplier' : 'suppliers'})
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-600 dark:text-slate-400">{formatCurrency(totalBilled)}</td>
                <td className="px-4 py-3 tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(totalPaid)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-rose-700 dark:text-rose-400 text-base">{formatCurrency(totalOutstanding)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── PARTNER EQUITY & CAPITAL TAB ──────────────────────────────────────────────
function PartnerEquityTab() {
  const { data: partners = [], isLoading } = useQuery({ 
    queryKey: ['rep-partners-equity'], 
    queryFn: getPartners 
  });

  // Secondary filters
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleResetFilters = () => {
    setSelectedStatus('');
    setSearchQuery('');
  };

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (selectedStatus === 'ACTIVE' && !p.isActive) return false;
      if (selectedStatus === 'INACTIVE' && p.isActive) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.partnerName?.toLowerCase().includes(q);
        const matchPhone = p.mobileNumber?.toLowerCase().includes(q);
        const matchEmail = p.email?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [partners, selectedStatus, searchQuery]);

  const hasSecondaryFilters = selectedStatus !== '' || searchQuery.trim() !== '';

  const totalAllocatedPercentage = useMemo(() => {
    return filteredPartners
      .filter(p => p.isActive)
      .reduce((sum, p) => sum + (p.sharePercentage ?? 0), 0);
  }, [filteredPartners]);

  const activeCount = useMemo(() => {
    return filteredPartners.filter(p => p.isActive).length;
  }, [filteredPartners]);

  const isFullyAllocated = Math.abs(totalAllocatedPercentage - 100) < 0.001;

  const handleExport = () => {
    const filterDesc = [
      selectedStatus && `Status: ${selectedStatus === 'ACTIVE' ? 'Active' : 'Inactive'}`,
      searchQuery && `Search: "${searchQuery}"`
    ].filter(Boolean).join(' | ') || 'All Partners';

    const currentDateStr = formatCsvDate(new Date().toISOString());

    exportProfessionalCsv({
      filename: `Partner_Profit_Shares_${currentDateStr}`,
      documentTitle: 'Partner Profit Shares & Equity Allocation Report',
      subtitle: 'Overview of partner profit sharing percentages, capital allocation, and active status',
      metadata: [
        { label: 'As of Date', value: currentDateStr },
        { label: 'Generated On', value: formatCsvTimestamp() },
        { label: 'Active Filters', value: filterDesc },
        { label: 'Active Partners Count', value: activeCount },
        { label: 'Total Allocated Percentage', value: `${totalAllocatedPercentage.toFixed(2)}%` },
      ],
      sections: [
        {
          sectionTitle: 'Partner Equity Allocation',
          headers: [
            'Partner Name',
            'Mobile Number',
            'Email Address',
            'Profit Share (%)',
            'Joining Date',
            'Partner Status',
          ],
          rows: filteredPartners.map(p => [
            p.partnerName,
            p.mobileNumber,
            p.email || '—',
            `${p.sharePercentage.toFixed(2)}%`,
            formatCsvDate(p.joiningDate),
            p.isActive ? 'Active' : 'Inactive'
          ]),
          summaryRow: [
            'Total Active Allocation',
            '',
            '',
            `${totalAllocatedPercentage.toFixed(2)}%`,
            '',
            ''
          ]
        }
      ]
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Partner Profit Shares & Allocation</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Overview of partner profit sharing percentages (must sum to 100%)</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export Filtered CSV
        </Button>
      </div>

      {/* Secondary Filter Bar */}
      <div className="bg-gray-50/80 dark:bg-[#121926] p-3 rounded-xl border border-gray-200/80 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <FilterSearchInput
            placeholder="Search partner name, mobile, email..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterSelect
            label="Partner Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={[
              { value: 'ACTIVE', label: 'Active Partners' },
              { value: 'INACTIVE', label: 'Inactive Partners' },
            ]}
            allLabel="All Statuses"
          />
        </div>

        {hasSecondaryFilters && (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 h-8">
            <RotateCcw className="h-3 w-3" /> Clear Filters
          </Button>
        )}
      </div>

      {/* Equity Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`border-l-4 ${isFullyAllocated ? 'border-l-emerald-600 bg-emerald-50/20' : 'border-l-amber-500 bg-amber-50/20'}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-slate-300">Total Profit Share Allocated</p>
              <Badge variant={isFullyAllocated ? 'success' : 'warning'} className="text-[10px]">
                {isFullyAllocated ? '100% Fully Distributed' : `${(100 - totalAllocatedPercentage).toFixed(2)}% Available`}
              </Badge>
            </div>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${isFullyAllocated ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
              {isLoading ? '...' : `${totalAllocatedPercentage.toFixed(2)}%`}
            </p>
            <div className="h-1.5 w-full bg-gray-200 dark:bg-[#222D3D] rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full ${isFullyAllocated ? 'bg-emerald-600' : 'bg-amber-500'} rounded-full transition-all`} 
                style={{ width: `${Math.min(100, totalAllocatedPercentage)}%` }} 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 bg-blue-50/20">
          <CardContent className="pt-5 pb-4">
            <div className="flex justify-between items-start">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Active Partners</p>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1 text-blue-800">
              {isLoading ? '...' : `${formatNumber(activeCount)} Partners`}
            </p>
            <p className="text-[11px] text-blue-600 mt-1">Eligible for profit sharing payouts</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-slate-300">Filtered Partners</p>
            <p className="text-2xl font-bold tabular-nums mt-1 text-gray-900 dark:text-slate-100">
              {isLoading ? '...' : `${formatNumber(filteredPartners.length)} Profiles`}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              {filteredPartners.length !== partners.length ? `Showing ${formatNumber(filteredPartners.length)} of ${formatNumber(partners.length)} total` : `Includes ${formatNumber(partners.length - activeCount)} inactive partners`}
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          Loading partners…
        </div>
      ) : partners.length === 0 ? (
        <div className="p-8 text-center text-gray-400 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837]">
          No partner accounts registered yet.
        </div>
      ) : filteredPartners.length === 0 ? (
        <FilteredEmptyState message="No partners match the selected secondary filters." onClear={handleResetFilters} />
      ) : (
        <div className="overflow-x-auto touch-pan-x rounded-xl border border-gray-200 dark:border-[#1F2837] bg-white dark:bg-[#141A24] shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="header-bar-offwhite border-b border-gray-200 dark:border-[#1F2837]">
              <tr>{[
                'Partner Name',
                'Contact Info',
                'Joining Date',
                'Profit Share (%)',
                'Share Progress',
                'Status'
              ].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
              {filteredPartners.map(p => (
                <tr key={p.publicId} className="hover:bg-gray-50 dark:hover:bg-[#1A2331]">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{p.partnerName}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-800 dark:text-slate-200 font-medium">{p.mobileNumber}</div>
                    <div className="text-[11px] text-gray-400">{p.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">{formatDate(p.joiningDate)}</td>
                  <td className="px-4 py-3 tabular-nums font-bold text-blue-700 dark:text-sky-400">
                    {p.sharePercentage.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-gray-100 dark:bg-[#222D3D] rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${p.isActive ? 'bg-blue-600' : 'bg-gray-300'} rounded-full`} 
                          style={{ width: `${Math.min(100, p.sharePercentage)}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.isActive ? 'success' : 'default'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-[#0E131C] border-t border-gray-200 dark:border-[#1F2837] font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                  Total Allocated Profit Share ({formatNumber(filteredPartners.length)} {filteredPartners.length === 1 ? 'partner' : 'partners'})
                </td>
                <td className={`px-4 py-3 tabular-nums font-bold ${isFullyAllocated ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'} text-base`}>
                  {totalAllocatedPercentage.toFixed(2)}%
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── MAIN REPORTS PAGE ─────────────────────────────────────────────────────────
const DATE_TABS: TabId[] = ['profit-loss', 'sales', 'purchases', 'expenses'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<TabId>('profit-loss');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const needsDates = DATE_TABS.includes(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-slate-100">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Detailed financial reports, inventory valuation, customer and supplier balances, and partner profit shares with CSV export.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-pan-x bg-gray-100/60 dark:bg-[#0E131C] p-1.5 rounded-xl border border-gray-200/60 dark:border-[#1F2837] whitespace-nowrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all shrink-0 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#141A24] text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-gray-200 dark:ring-[#1F2837] font-semibold'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#141A24]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range (only for relevant tabs) */}
      {needsDates && (
        <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <DateRangePicker
            startDate={startDate} endDate={endDate}
            onStartChange={setStartDate} onEndChange={setEndDate}
          />
        </div>
      )}

      {/* Tab Content */}
      <div className="print:pt-0">
        {activeTab === 'profit-loss' && <ProfitLossTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'sales' && <SalesTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'purchases' && <PurchasesTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'expenses' && <ExpensesTab startDate={startDate} endDate={endDate} />}
        {activeTab === 'stock' && <StockTab />}
        {activeTab === 'customer-outstanding' && <CustomerOutstandingTab />}
        {activeTab === 'supplier-outstanding' && <SupplierOutstandingTab />}
        {activeTab === 'partner-equity' && <PartnerEquityTab />}
      </div>
    </div>
  );
}
