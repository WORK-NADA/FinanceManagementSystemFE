import { useQuery, useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { 
  ArrowDownRight, ArrowUpRight, PackageMinus, Receipt, 
  TrendingUp, AlertTriangle, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { getDashboardSummary } from '../api/dashboard';
import { getProfitLossReport } from '../api/report';
import { getLowStockItems } from '../api/stock';
import { formatCurrency, formatDate } from '@/lib';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Badge } from '@/components';

// ── Helpers ─────────────────────────────────────────────────────────────────
function KpiTile({ 
  label, value, sub, icon, color, href 
}: { label: string; value: React.ReactNode; sub: string; icon: React.ReactNode; color: string; href?: string }) {
  const inner = (
    <Card className={`group relative overflow-hidden border-l-4 ${color} hover:shadow-md transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
        <div className={`rounded-full p-2.5 opacity-80 ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 tabular-nums">{value}</div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          {sub}
          {href && <ChevronRight className="h-3 w-3 opacity-50 group-hover:opacity-100" />}
        </p>
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['lowStock'],
    queryFn: getLowStockItems,
  });

  // Build monthly trend data using the backend report endpoint
  const months = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      // get first and last day of month
      const start = `${year}-${month}-01`;
      const end = new Date(year, date.getMonth() + 1, 0).toISOString().split('T')[0];
      result.push({ start, end, label: `${year}-${month}` });
    }
    return result;
  }, []);

  const trendQueries = useQueries({
    queries: months.map((m) => ({
      queryKey: ['rep-profit-loss', m.start, m.end],
      queryFn: () => getProfitLossReport(m.start, m.end),
    })),
  });

  const isLoadingTrend = trendQueries.some(q => q.isLoading);

  const trendData = useMemo(() => {
    return trendQueries.map((q, i) => {
      const d = q.data;
      return {
        month: months[i].label,
        revenue: d?.totalRevenue ?? 0,
        cost: d?.totalPurchaseCost ?? 0,
        expenses: d?.totalExpenses ?? 0,
        profit: d?.netProfit ?? 0,
      };
    });
  }, [trendQueries, months]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-medium text-lg">Unable to load dashboard</h3>
        <p className="mt-1 text-sm">Please try refreshing the page or check your connection.</p>
      </div>
    );
  }

  const lpd = data?.latestProfitDistribution;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            {isAdmin ? 'System Overview' : 'Your Business Overview'}
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            {isAdmin
              ? 'Your personal finance data and admin controls.'
              : `Welcome back, ${user?.ownerName || user?.userName}. Here's what's happening.`}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/clients"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Admin: Manage Clients <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Total Receivable"
          value={formatCurrency(data?.totalReceivable ?? 0)}
          sub="Pending collection from customers"
          icon={<ArrowDownRight className="h-4 w-4 text-green-600" />}
          color="border-green-500"
          href="/dashboard/sale-payments"
        />
        <KpiTile
          label="Total Outstanding"
          value={formatCurrency(data?.totalOutstanding ?? 0)}
          sub="Payable to suppliers"
          icon={<ArrowUpRight className="h-4 w-4 text-red-600" />}
          color="border-red-500"
          href="/dashboard/purchase-payments"
        />
        <KpiTile
          label="Monthly Expenses"
          value={formatCurrency(data?.totalExpensesThisMonth ?? 0)}
          sub="Current month spend"
          icon={<Receipt className="h-4 w-4 text-amber-600" />}
          color="border-amber-500"
          href="/dashboard/expenses"
        />
        <KpiTile
          label="Low Stock Alerts"
          value={data?.lowStockCount ?? 0}
          sub="Items below minimum — click to view"
          icon={<PackageMinus className="h-4 w-4 text-orange-600" />}
          color="border-orange-500"
          href="/dashboard/stock"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Expense Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-[var(--color-primary)]" />
            <h3 className="font-semibold text-gray-900">Revenue vs Expenses (Last 6 Months)</h3>
          </div>
          {trendData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
              No transaction data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), '']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="Revenue" fill="#0F7B5C" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cost" name="Purchase Cost" fill="#E74C3C" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#C9A84C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low Stock Quick List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Low Stock Items</h3>
            </div>
            <Link to="/dashboard/stock" className="text-xs text-[var(--color-primary)] hover:underline">
              View all →
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
              All stock levels are healthy ✓
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64">
              {lowStockItems.slice(0, 8).map(item => (
                <div key={item.publicId} className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50 border border-orange-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.rawMaterial}</p>
                    <p className="text-xs text-gray-500">{item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-700">{item.currentQuantity}</p>
                    <p className="text-xs text-gray-400">min: {item.minimumStockLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Net Profit Trend Line */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Net Profit Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => [formatCurrency(Number(value)), 'Net Profit']} />
              <Line
                type="monotone"
                dataKey="profit"
                name="Net Profit"
                stroke="#0F7B5C"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0F7B5C' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Latest Profit Distribution */}
      {lpd ? (
        <div className="bg-[var(--color-sidebar-bg)] rounded-xl shadow-md p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-serif font-bold">Latest Profit Distribution</h3>
              <p className="text-sm text-gray-400 mt-1">
                {formatDate(lpd.fromDate)} — {formatDate(lpd.toDate)}
              </p>
            </div>
            <Link to="/dashboard/profit-distribution" className="text-xs text-[var(--color-accent)] hover:underline">
              View history →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-gray-700">
            {[
              { label: 'Total Revenue', value: lpd.totalRevenue, color: 'text-green-400' },
              { label: 'Purchase Cost', value: lpd.totalPurchaseCost, color: 'text-red-400' },
              { label: 'Expenses', value: lpd.totalExpenses, color: 'text-amber-400' },
              { label: 'Net Profit', value: lpd.netProfit, color: 'text-[var(--color-accent)]' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-sm text-gray-400">{item.label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${item.color}`}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
          {lpd.shares.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Partner Shares</p>
              <div className="flex flex-wrap gap-3">
                {lpd.shares.map(s => (
                  <div key={s.partnerPublicId} className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400">{s.partnerName} ({s.sharePercentageAtDistribution}%)</p>
                    <p className="text-sm font-bold text-[var(--color-accent)]">{formatCurrency(s.shareAmount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[var(--color-sidebar-bg)] rounded-xl shadow-md p-6 text-white flex flex-col items-center justify-center py-10">
          <h3 className="text-xl font-serif font-bold mb-2">Latest Profit Distribution</h3>
          <p className="text-gray-400 text-sm">No profit distributions have been recorded yet.</p>
        </div>
      )}
    </div>
  );
}
