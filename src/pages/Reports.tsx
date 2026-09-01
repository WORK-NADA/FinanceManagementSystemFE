import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { Download } from 'lucide-react';
import { 
  getSalesReport,
  getPurchaseReport,
  getExpenseReport,
  getProfitLossReport,
  getStockReport,
  getCustomerOutstandingReport,
  getSupplierOutstandingReport
} from '../api/report';
import { formatCurrency, formatDate } from '@/lib';
import { Button, Badge } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';

const COLORS = ['#0F7B5C', '#1E3A5F', '#C9A84C', '#E74C3C', '#3498DB', '#9B59B6', '#34495E'];

// ── CSV Export ───────────────────────────────────────────────────────────────
function exportCsv(headers: string[], rows: (string | number)[][], filename: string) {
  const lines = [
    headers.join(','),
    ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Shared Date Range Picker ─────────────────────────────────────────────────
function DateRangePicker({ 
  startDate, endDate, onStartChange, onEndChange 
}: { 
  startDate: string; endDate: string; 
  onStartChange: (v: string) => void; onEndChange: (v: string) => void 
}) {
  const inputCls = "h-9 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From:</label>
        <input type="date" className={inputCls} value={startDate} onChange={e => onStartChange(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To:</label>
        <input type="date" className={inputCls} value={endDate} onChange={e => onEndChange(e.target.value)} />
      </div>
    </div>
  );
}

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'profit-loss', label: 'Profit & Loss' },
  { id: 'sales', label: 'Sales Report' },
  { id: 'purchases', label: 'Purchase Report' },
  { id: 'expenses', label: 'Expense Report' },
  { id: 'stock', label: 'Stock Report' },
  { id: 'customer-outstanding', label: 'Customer Outstanding' },
  { id: 'supplier-outstanding', label: 'Supplier Outstanding' },
] as const;
type TabId = typeof TABS[number]['id'];

// ── PROFIT & LOSS TAB ────────────────────────────────────────────────────────
function ProfitLossTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['rep-profit-loss', startDate, endDate], 
    queryFn: () => getProfitLossReport(startDate, endDate) 
  });

  const totalRevenue = data?.totalRevenue ?? 0;
  const totalCost = data?.totalPurchaseCost ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const netProfit = data?.netProfit ?? 0;

  const barData = [
    { name: 'Revenue', value: totalRevenue, fill: '#0F7B5C' },
    { name: 'Purchase Cost', value: totalCost, fill: '#E74C3C' },
    { name: 'Expenses', value: totalExpenses, fill: '#C9A84C' },
    { name: 'Net Profit', value: Math.max(0, netProfit), fill: netProfit >= 0 ? '#1E3A5F' : '#E74C3C' },
  ];

  const handleExport = () => exportCsv(
    ['Metric', 'Amount'],
    [
      ['Total Revenue', totalRevenue],
      ['Purchase Cost', totalCost],
      ['Total Expenses', totalExpenses],
      ['Net Profit', netProfit],
    ],
    `profit-loss-${startDate}-${endDate}.csv`
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: totalRevenue, color: 'text-emerald-700' },
          { label: 'Purchase Cost', value: totalCost, color: 'text-red-700' },
          { label: 'Total Expenses', value: totalExpenses, color: 'text-amber-700' },
          { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? 'text-emerald-700' : 'text-red-700' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-2xl font-bold tabular-nums mt-1 ${item.color}`}>
                {isLoading ? '...' : formatCurrency(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>P&L Comparison</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v)), '']} />
                <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── SALES TAB ────────────────────────────────────────────────────────────────
function SalesTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: sales = [], isLoading } = useQuery({ 
    queryKey: ['rep-sales-tab', startDate, endDate], 
    queryFn: () => getSalesReport(startDate, endDate) 
  });

  const handleExport = () => exportCsv(
    ['Date', 'Customer', 'Total', 'Status'],
    sales.map(s => [s.saleDate, s.customerName, s.totalAmount, s.paymentStatus]),
    `sales-report-${startDate}-${endDate}.csv`
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{sales.length} records</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Date','Customer','Total','Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No sales in this period.</td></tr>
            ) : sales.map(s => (
              <tr key={s.publicId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(s.saleDate)}</td>
                <td className="px-4 py-3 font-medium">{s.customerName}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{formatCurrency(s.totalAmount)}</td>
                <td className="px-4 py-3">
                  <Badge variant={s.paymentStatus === 'PAID' ? 'success' : s.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}>
                    {s.paymentStatus?.replace('_', ' ')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
          {sales.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Totals</td>
                <td className="px-4 py-3 tabular-nums font-bold text-emerald-700">
                  {formatCurrency(sales.reduce((sum, x) => sum + x.totalAmount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── PURCHASES TAB ────────────────────────────────────────────────────────────
function PurchasesTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: purchases = [], isLoading } = useQuery({ 
    queryKey: ['rep-purchases-tab', startDate, endDate], 
    queryFn: () => getPurchaseReport(startDate, endDate) 
  });

  const handleExport = () => exportCsv(
    ['Date', 'Supplier', 'Total', 'Status'],
    purchases.map(p => [p.purchaseDate, p.supplierName, p.totalAmount, p.paymentStatus]),
    `purchase-report-${startDate}-${endDate}.csv`
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{purchases.length} records</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Date','Supplier','Total','Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">No purchases in this period.</td></tr>
            ) : purchases.map(p => (
              <tr key={p.publicId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.purchaseDate)}</td>
                <td className="px-4 py-3 font-medium">{p.supplierName}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{formatCurrency(p.totalAmount)}</td>
                <td className="px-4 py-3">
                  <Badge variant={p.paymentStatus === 'PAID' ? 'success' : p.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}>
                    {p.paymentStatus?.replace('_', ' ')}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
          {purchases.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Totals</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700">
                  {formatCurrency(purchases.reduce((sum, x) => sum + x.totalAmount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── EXPENSES TAB ─────────────────────────────────────────────────────────────
function ExpensesTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const { data: expenses = [], isLoading } = useQuery({ 
    queryKey: ['rep-expenses-tab', startDate, endDate], 
    queryFn: () => getExpenseReport(startDate, endDate) 
  });

  const handleExport = () => exportCsv(
    ['Date', 'Amount', 'Description'],
    expenses.map(e => [e.expenseDate, e.amount, e.description || '']),
    `expense-report-${startDate}-${endDate}.csv`
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{expenses.length} records</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Date','Amount','Description'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">No expenses in this period.</td></tr>
            ) : expenses.map(e => (
              <tr key={e.publicId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.expenseDate)}</td>
                <td className="px-4 py-3 tabular-nums font-semibold text-red-700">{formatCurrency(e.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{e.description || '—'}</td>
              </tr>
            ))}
          </tbody>
          {expenses.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700">
                  {formatCurrency(expenses.reduce((sum, x) => sum + x.amount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── STOCK TAB ─────────────────────────────────────────────────────────────────
function StockTab() {
  const { data: stocks = [], isLoading } = useQuery({ queryKey: ['rep-stock'], queryFn: getStockReport });

  const handleExport = () => exportCsv(
    ['Material', 'Unit', 'Qty', 'Min Level', 'Status'],
    stocks.map(s => [s.rawMaterial, s.unit, s.currentQuantity, s.minimumStockLevel, s.currentQuantity <= s.minimumStockLevel ? 'Low Stock' : 'OK']),
    'stock-report.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{stocks.length} items</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Material','Unit','Current Qty','Min Level','Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : stocks.map(s => {
              const isLowStock = s.currentQuantity <= s.minimumStockLevel;
              return (
                <tr key={s.publicId} className={`hover:bg-gray-50 ${isLowStock ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-4 py-3 font-medium">{s.rawMaterial}</td>
                  <td className="px-4 py-3 text-gray-500">{s.unit}</td>
                  <td className={`px-4 py-3 tabular-nums font-semibold ${isLowStock ? 'text-orange-700' : 'text-gray-900'}`}>{s.currentQuantity}</td>
                  <td className="px-4 py-3 tabular-nums text-gray-500">{s.minimumStockLevel}</td>
                  <td className="px-4 py-3">
                    {isLowStock ? <Badge variant="danger" className="text-[10px]">LOW STOCK</Badge> : <span className="text-green-600 text-xs">✓ OK</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── CUSTOMER OUTSTANDING TAB ──────────────────────────────────────────────────
function CustomerOutstandingTab() {
  const { data: outstanding = [], isLoading } = useQuery({ queryKey: ['rep-customers-outstanding'], queryFn: getCustomerOutstandingReport });

  const handleExport = () => exportCsv(
    ['Customer', 'Mobile', 'Pending'],
    outstanding.map(c => [c.customerName, c.mobileNumber, c.totalOutstandingAmount]),
    'customer-outstanding.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{outstanding.length} customers with outstanding balance</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Customer','Mobile','Outstanding Balance'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : outstanding.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">No outstanding balances.</td></tr>
            ) : outstanding.map(c => (
              <tr key={c.publicId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.customerName}</td>
                <td className="px-4 py-3 text-gray-500">{c.mobileNumber}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700">{formatCurrency(c.totalOutstandingAmount)}</td>
              </tr>
            ))}
          </tbody>
          {outstanding.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total Outstanding</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700">
                  {formatCurrency(outstanding.reduce((s, c) => s + c.totalOutstandingAmount, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── SUPPLIER OUTSTANDING TAB ──────────────────────────────────────────────────
function SupplierOutstandingTab() {
  const { data: outstanding = [], isLoading } = useQuery({ queryKey: ['rep-suppliers-outstanding'], queryFn: getSupplierOutstandingReport });

  const handleExport = () => exportCsv(
    ['Supplier', 'Mobile', 'Pending'],
    outstanding.map(s => [s.supplierName, s.mobileNumber, s.totalOutstandingAmount]),
    'supplier-outstanding.csv'
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{outstanding.length} suppliers with outstanding payables</p>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{['Supplier','Mobile','Outstanding Payable'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : outstanding.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">No outstanding payables.</td></tr>
            ) : outstanding.map(s => (
              <tr key={s.publicId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.supplierName}</td>
                <td className="px-4 py-3 text-gray-500">{s.mobileNumber}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700">{formatCurrency(s.totalOutstandingAmount)}</td>
              </tr>
            ))}
          </tbody>
          {outstanding.length > 0 && (
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total Payable</td>
                <td className="px-4 py-3 tabular-nums font-bold text-red-700">
                  {formatCurrency(outstanding.reduce((s, c) => s + c.totalOutstandingAmount, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Detailed financial reports with CSV export.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 bg-gray-100/50 p-1 rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range (only for relevant tabs) */}
      {needsDates && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
      </div>
    </div>
  );
}
