import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, PackageMinus, Receipt,
  TrendingUp, AlertTriangle, ChevronRight, PlusCircle,
  ShoppingCart, Truck, Wallet, Activity, FileText,
  Calculator, CheckCircle2, Landmark, Sliders
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { getDashboardSummary, updateOpeningBalance } from '../api/dashboard';
import { getLowStockItems } from '../api/stock';
import { formatCurrency, formatDate } from '@/lib';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Badge, CopyableSequence, Button, Modal, Input } from '@/components';
import { toast } from '../store/toastStore';

// ── Helpers ─────────────────────────────────────────────────────────────────
function KpiTile({
  label, value, sub, icon, href
}: { label: string; value: React.ReactNode; sub: string; icon: React.ReactNode; color?: string; href?: string }) {
  const inner = (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all p-5 flex flex-col justify-between group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">{label}</span>
        <div className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-[#1C2636] text-slate-700 dark:text-slate-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors shadow-2xs">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-slate-100 tabular-nums">{value}</div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 flex items-center justify-between">
          <span>{sub}</span>
          {href && <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </p>
      </div>
    </div>
  );
  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

// ── Quick Action Dock Component ──────────────────────────────────────────────
function QuickActionDock() {
  const actions = [
    { label: 'New Sale Invoice', to: '/dashboard/sales', icon: <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> },
    { label: 'New Purchase Bill', to: '/dashboard/purchases', icon: <Truck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> },
    { label: 'Add Expense', to: '/dashboard/expenses', icon: <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" /> },
    { label: 'Receive Payment', to: '/dashboard/sale-payments', icon: <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> },
    { label: 'Pay Supplier', to: '/dashboard/purchase-payments', icon: <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" /> },
    { label: 'Share Profit', to: '/dashboard/profit-distribution', icon: <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" /> },
  ];

  return (
    <div className="bg-white dark:bg-[#131924] p-5 rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PlusCircle className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200">Quick Actions</h2>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-slate-500">Common everyday tasks</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {actions.map(act => (
          <Link
            key={act.label}
            to={act.to}
            className="group flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200/80 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/50 text-xs font-medium text-gray-700 dark:text-slate-300 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-950 dark:hover:text-emerald-300 transition-all duration-200 hover:shadow-xs hover:-translate-y-0.5"
          >
            <span className="transition-transform duration-200 group-hover:scale-110 shrink-0">
              {act.icon}
            </span>
            <span className="truncate">{act.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Cash Flow Health Bar Component ───────────────────────────────────────────
function CashFlowHealthBar({
  receivables, payables, netCapital, status
}: {
  receivables: number; payables: number; netCapital: number; status?: string
}) {
  const total = (receivables + payables) || 1;
  const recPct = Math.round((receivables / total) * 100);
  const payPct = 100 - recPct;

  const isSurplus = netCapital >= 0;

  return (
    <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[var(--color-primary)] dark:text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">Cash & Business Health Summary</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Money to collect from customers vs. money you owe suppliers</p>
          </div>
        </div>
        <Badge variant={status === 'SURPLUS' || isSurplus ? 'success' : 'danger'}>
          {status === 'SURPLUS' || isSurplus ? '✓ Healthy Cash Balance' : '⚠ High Bills Due'}
        </Badge>
      </div>

      {/* Visual Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-emerald-700 dark:text-emerald-400">To Collect ({recPct}%)</span>
          <span className="text-rose-700 dark:text-rose-400">To Pay ({payPct}%)</span>
        </div>
        <div className="h-3 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            className="bg-emerald-500 h-full transition-all duration-700"
            style={{ width: `${recPct}%` }}
            title={`To Collect: ${formatCurrency(receivables)}`}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-700"
            style={{ width: `${payPct}%` }}
            title={`To Pay: ${formatCurrency(payables)}`}
          />
        </div>
      </div>

      {/* Grid of numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100/90 dark:border-slate-800">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Money to Collect (From Customers)</p>
          <p className="text-xl font-serif font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">{formatCurrency(receivables)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Money to Pay (To Suppliers)</p>
          <p className="text-xl font-serif font-bold tabular-nums text-rose-700 dark:text-rose-400 mt-1">{formatCurrency(payables)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Net Available Balance</p>
          <p className={`text-xl font-serif font-bold tabular-nums mt-1 ${isSurplus ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-400'}`}>
            {isSurplus ? `+${formatCurrency(netCapital)}` : formatCurrency(netCapital)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';
  const isAdmin = user?.role === 'ADMIN';

  // Opening Balance Modal State
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingInput, setOpeningInput] = useState('');
  const [openingError, setOpeningError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
    refetchInterval: 20000, // Background sync every 20s
  });

  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['lowStock'],
    queryFn: getLowStockItems,
  });

  const openingMutation = useMutation({
    mutationFn: updateOpeningBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setIsOpeningModalOpen(false);
      toast.success('Company opening balance updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update opening balance');
    },
  });

  const handleOpenOpeningBalanceModal = () => {
    setOpeningInput(data?.openingBalance !== undefined ? String(data.openingBalance) : '0');
    setOpeningError('');
    setIsOpeningModalOpen(true);
  };

  const handleOpeningBalanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingInput);
    if (isNaN(val) || val < 0) {
      setOpeningError('Please enter a valid non-negative amount (0 or greater)');
      return;
    }
    openingMutation.mutate(val);
  };

  // Use the unified 6-month trends from backend, eliminating the 6-query network waterfall!
  const trendData = useMemo(() => {
    if (data?.monthlyTrends && data.monthlyTrends.length > 0) {
      return data.monthlyTrends.map(t => ({
        month: t.month,
        revenue: t.revenue,
        cost: t.cost,
        expenses: t.expenses,
        profit: t.profit,
      }));
    }
    return [];
  }, [data?.monthlyTrends]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6 text-red-700 dark:text-red-300">
        <h3 className="font-medium text-lg">Unable to load dashboard</h3>
        <p className="mt-1 text-sm">Please try refreshing the page or check your connection.</p>
      </div>
    );
  }

  const lpd = data?.latestProfitDistribution;
  const recentActivities = data?.recentActivities ?? [];
  const receivables = data?.totalReceivable ?? 0;
  const payables = data?.totalOutstanding ?? 0;
  const netCapital = data?.netWorkingCapital ?? (receivables - payables);
  const openingBalance = data?.openingBalance ?? 0;
  const totalMoneyReceived = data?.totalMoneyReceived ?? 0;
  const totalMoneyPaid = data?.totalMoneyPaid ?? 0;
  const totalExpenses = data?.totalExpenses ?? 0;
  const totalBalance = data?.totalBalance ?? (openingBalance + totalMoneyReceived - totalMoneyPaid - totalExpenses);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
            {isAdmin ? 'System & Business Overview' : 'Executive Business Dashboard'}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400 text-sm">
            {isAdmin
              ? 'Platform-level personal metrics and administrative tenant controls.'
              : `Welcome back, ${user?.ownerName || user?.userName}. Here is your enterprise real-time snapshot.`}
          </p>
        </div>
        {isAdmin && (
          <Link
            to="/admin/clients"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            Admin: Manage Clients <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Quick Action Dock */}
      <QuickActionDock />

      {/* Featured: Total Balance Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d2820] to-[#0a4635] p-6 sm:p-8 text-white shadow-lg border border-emerald-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
                <Landmark className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-widest font-bold text-emerald-300">Net Cash Position</span>
                  <Badge variant={totalBalance >= 0 ? 'success' : 'danger'} className="text-[10px] py-0.5 px-2 font-semibold">
                    {totalBalance >= 0 ? 'Cash Available' : 'Deficit'}
                  </Badge>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
                  Total Company Balance
                </h2>
              </div>
            </div>
            <p className="text-xs text-gray-300 max-w-xl">
              Live actual cash funds available with the company based on invested capital, recorded customer receipts, supplier payments, and active operating expenses.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-4 md:text-right">
            <div>
              <span className="text-xs text-emerald-300/80 font-medium block">Live Available Balance</span>
              <div className={`text-3xl sm:text-4xl lg:text-5xl font-serif font-extrabold tracking-tight tabular-nums ${totalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                {formatCurrency(totalBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* 4-Pill Formula Breakdown */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div 
            onClick={handleOpenOpeningBalanceModal}
            className="group cursor-pointer bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:border-emerald-400/40 transition-all duration-200 flex flex-col justify-between"
            title="Click to view or edit Opening Balance"
          >
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span className="font-semibold uppercase tracking-wider">Opening Balance</span>
              <span className="text-emerald-400 text-[10px] flex items-center gap-0.5 group-hover:underline font-medium">
                <Sliders className="h-3 w-3" /> Edit
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-lg font-bold text-white tabular-nums">
                {formatCurrency(openingBalance)}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Starting capital baseline</span>
          </div>

          <Link 
            to="/dashboard/sale-payments"
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:border-emerald-400/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span className="font-semibold uppercase tracking-wider">+ Money Received</span>
              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-emerald-300 tabular-nums">
              +{formatCurrency(totalMoneyReceived)}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Actual customer collections</span>
          </Link>

          <Link 
            to="/dashboard/purchase-payments"
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:border-rose-400/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span className="font-semibold uppercase tracking-wider">− Money Paid</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-rose-300 tabular-nums">
              −{formatCurrency(totalMoneyPaid)}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Actual supplier payments</span>
          </Link>

          <Link 
            to="/dashboard/expenses"
            className="group bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 hover:border-amber-400/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span className="font-semibold uppercase tracking-wider">− Total Expenses</span>
              <Receipt className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-amber-300 tabular-nums">
              −{formatCurrency(totalExpenses)}
            </div>
            <span className="text-[10px] text-gray-400 mt-1">Operational business expenses</span>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Money to Collect"
          value={formatCurrency(receivables)}
          sub="Pending collection from customers"
          icon={<ArrowDownRight className="h-4 w-4 text-green-600 dark:text-emerald-400" />}
          color="border-green-500"
          href="/dashboard/sale-payments"
        />
        <KpiTile
          label="Money to Pay"
          value={formatCurrency(payables)}
          sub="Pending payment to suppliers"
          icon={<ArrowUpRight className="h-4 w-4 text-red-600 dark:text-rose-400" />}
          color="border-red-500"
          href="/dashboard/purchase-payments"
        />
        <KpiTile
          label="This Month's Expenses"
          value={formatCurrency(data?.totalExpensesThisMonth ?? 0)}
          sub="Daily & business expenses recorded"
          icon={<Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          color="border-amber-500"
          href="/dashboard/expenses"
        />
        <KpiTile
          label="Low Stock Items"
          value={data?.lowStockCount ?? 0}
          sub="Items below minimum safe level"
          icon={<PackageMinus className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
          color="border-orange-500"
          href="/dashboard/stock"
        />
      </div>

      {/* Working Capital & Cash Flow Health Bar */}
      <CashFlowHealthBar
        receivables={receivables}
        payables={payables}
        netCapital={netCapital}
        status={data?.cashFlowStatus}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue vs Cost vs Expenses Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[var(--color-primary)] dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">Monthly Sales, Purchases & Expenses</h3>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-400">Last 6 months overview</span>
          </div>
          {trendData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
              No historical transaction data recorded yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#f0f0f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tickFormatter={v => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  contentStyle={
                    isDark
                      ? { backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }
                      : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A', borderRadius: '12px' }
                  }
                  itemStyle={isDark ? { color: '#E2E8F0' } : undefined}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: isDark ? '#94A3B8' : '#64748B' }} />
                <Bar dataKey="revenue" name="Sales" fill="#0F7B5C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Purchases" fill="#E74C3C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#C9A84C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low Stock Quick List */}
        <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">Low Stock Alerts</h3>
            </div>
            <Link to="/dashboard/stock" className="text-xs text-[var(--color-primary)] dark:text-emerald-400 font-semibold hover:underline">
              View all →
            </Link>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
              All item stock levels healthy ✓
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
              {lowStockItems.slice(0, 8).map(item => (
                <div key={item.publicId} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-200">{item.rawMaterial}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">{item.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300 tabular-nums">{item.currentQuantity}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 tabular-nums">Min safe: {item.minimumStockLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Net Profit Trend Line & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Profit Trend */}
        <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[var(--color-primary)] dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">Net Profit Trend</h3>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-400">Month-by-month profit</span>
          </div>
          {trendData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
              No trend data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#f0f0f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tickFormatter={v => `₹${(Number(v) / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Net Profit']}
                  contentStyle={
                    isDark
                      ? { backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }
                      : { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#0F172A', borderRadius: '12px' }
                  }
                  itemStyle={isDark ? { color: '#E2E8F0' } : undefined}
                />
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
          )}
        </div>

        {/* Live Operational Activity Feed */}
        <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] dark:ring-1 dark:ring-white/[0.04] shadow-xs p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[var(--color-primary)] dark:text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="font-serif font-bold text-base sm:text-lg text-gray-900 dark:text-white">Recent Business Activity</h3>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-400">Latest invoices & bills</span>
          </div>

          {recentActivities.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
              No recent transactions recorded.
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {recentActivities.map((act, i) => {
                const isSale = act.activityType === 'SALE_INVOICE';
                const isPurchase = act.activityType === 'PURCHASE_BILL';
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800/80 hover:bg-gray-100/60 dark:hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isSale ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : isPurchase ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}`}>
                        {isSale ? <ShoppingCart className="h-3.5 w-3.5" /> : isPurchase ? <Truck className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 dark:text-slate-200">{act.partyName}</span>
                          <span className="text-gray-400 dark:text-slate-500 text-[10px]">(</span>
                          <CopyableSequence
                            value={act.documentNumber}
                            plainText
                            size="xs"
                            badgeClassName="text-[10px] text-gray-500 dark:text-slate-400 font-mono font-medium"
                          />
                          <span className="text-gray-400 dark:text-slate-500 text-[10px]">)</span>
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">{formatDate(act.date)}</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`text-xs font-bold tabular-nums ${isSale ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-slate-200'}`}>
                        {isSale ? `+${formatCurrency(act.amount)}` : `-${formatCurrency(act.amount)}`}
                      </span>
                      <Badge variant={act.status === 'PAID' ? 'success' : act.status === 'PARTIALLY_PAID' ? 'warning' : 'default'} className="text-[9px] py-0 px-1.5">
                        {act.status === 'PAID' ? 'Fully Paid' : act.status === 'PARTIALLY_PAID' ? 'Partially Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Latest Profit Distribution Banner */}
      {lpd ? (
        <div className="bg-gradient-to-r from-slate-900 via-[#0a2720] to-[#0F7B5C] rounded-2xl shadow-xs border border-white/10 p-6 sm:p-7 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-xl font-serif font-bold">Latest Profit Sharing</h3>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                Settled Period: {formatDate(lpd.fromDate)} — {formatDate(lpd.toDate)}
              </p>
            </div>
            <Link to="/dashboard/profit-distribution" className="text-xs text-amber-300 font-semibold hover:underline flex items-center gap-1">
              View profit history →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t border-white/10">
            {[
              { label: 'Total Sales', value: lpd.totalRevenue, color: 'text-emerald-300' },
              { label: 'Total Purchases', value: lpd.totalPurchaseCost, color: 'text-rose-300' },
              { label: 'Total Expenses', value: lpd.totalExpenses, color: 'text-amber-300' },
              { label: 'Net Profit', value: lpd.netProfit, color: 'text-amber-400 font-serif' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-gray-300 uppercase tracking-wider">{item.label}</p>
                <p className={`text-2xl font-bold tabular-nums mt-1 ${item.color}`}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
          {lpd.shares.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-xs uppercase tracking-wider text-gray-300 mb-2.5 font-semibold">Partner Profit Shares</p>
              <div className="flex flex-wrap gap-3">
                {lpd.shares.map(s => (
                  <div key={s.partnerPublicId} className="bg-white/10 backdrop-blur-xs rounded-xl px-3.5 py-2 border border-white/15">
                    <p className="text-xs text-gray-300">{s.partnerName} ({s.sharePercentageAtDistribution}%)</p>
                    <p className="text-sm font-bold text-amber-300 mt-0.5">{formatCurrency(s.shareAmount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-slate-900 via-[#0a2720] to-[#0F7B5C] rounded-2xl shadow-xs border border-white/10 p-8 text-white flex flex-col items-center justify-center text-center">
          <h3 className="text-xl font-serif font-bold mb-1.5">Latest Profit Sharing</h3>
          <p className="text-gray-300 text-sm">No profit sharing recorded yet for this account.</p>
        </div>
      )}

      {/* Edit Opening Balance Modal */}
      <Modal 
        isOpen={isOpeningModalOpen} 
        onClose={() => setIsOpeningModalOpen(false)} 
        title="Manage Company Opening Balance"
      >
        <form onSubmit={handleOpeningBalanceSubmit} className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <p className="font-semibold mb-1 flex items-center gap-1.5 text-sm">
              <Landmark className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              What is Opening Balance?
            </p>
            <p>
              Opening Balance represents the initial starting capital or initial funds invested into the company before ongoing business operations. It acts as the foundational baseline for your <strong>Total Available Balance</strong> calculation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Opening Balance Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingInput}
                onChange={(e) => {
                  setOpeningInput(e.target.value);
                  if (openingError) setOpeningError('');
                }}
                className="w-full pl-8 pr-3 py-2 text-base font-semibold border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-[#0E131C] dark:border-slate-700 dark:text-white"
                placeholder="0.00"
                required
              />
            </div>
            {openingError && (
              <p className="text-xs text-rose-500 mt-1.5 font-medium">{openingError}</p>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-medium text-slate-800 dark:text-slate-200">Formula Breakdown:</p>
            <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
              Total Balance = Opening Balance + Total Received - Total Paid - Total Expenses
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
              Only actual payments and cash receipts affect this balance. Uncollected invoices or unpaid bills do not alter cash balance until settled.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpeningModalOpen(false)}
              disabled={openingMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={openingMutation.isPending}
              className="bg-[var(--color-primary)] hover:bg-[#0c624a] text-white"
            >
              {openingMutation.isPending ? 'Saving...' : 'Save Opening Balance'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
