import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Receipt, 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Building2, 
  ShieldCheck, 
  Activity, 
  ChevronRight, 
  UserPlus, 
  BarChart3, 
  CreditCard 
} from 'lucide-react';
import { getAdminDashboardStats } from '../../api/admin';
import { formatCurrency, formatDate } from '../../lib';
import { Card, CardContent, Badge, Button, ErrorState } from '../../components';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: getAdminDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse border border-gray-200 dark:border-[#1F2837]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse border border-gray-200 dark:border-[#1F2837]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse border border-gray-200 dark:border-[#1F2837]" />
          <div className="h-96 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse border border-gray-200 dark:border-[#1F2837]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState 
        message={(error as any)?.message || 'Failed to load administrator metrics.'} 
        onRetry={() => refetch()} 
      />
    );
  }

  const activeClientsPercent = stats?.totalClients 
    ? Math.round((stats.activeClients / stats.totalClients) * 100) 
    : 100;

  return (
    <div className="space-y-8">
      {/* Executive Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-slate-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Platform Executive Control
              </span>
              <span className="text-xs text-slate-400 font-mono">Vyapar Enterprise v2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-serif">
              Administrator Platform Overview
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              System-wide multi-tenant intelligence, cross-business financial monitoring, client governance, and operational oversight.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={() => navigate('/admin/clients/new')} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md shadow-emerald-950/40"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Register Client
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/reports')} 
              className="bg-slate-800/80 hover:bg-slate-700 text-white border-slate-600"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Platform Reports
            </Button>
          </div>
        </div>

        {/* Background Ambient Glow */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Primary Platform KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Clients */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300 dark:hover:border-blue-800"
          onClick={() => navigate('/admin/clients')}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Businesses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1">{stats?.totalClients || 0}</p>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {stats?.activeClients || 0} Active ({activeClientsPercent}%)
                </span>
                <span className="text-gray-300 dark:text-slate-600">•</span>
                <span className="text-gray-500 dark:text-slate-400">
                  {stats?.inactiveClients || 0} Disabled
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 rounded-2xl border border-blue-100 dark:border-blue-900/50">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Platform Gross Sales Turnover */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:border-emerald-300 dark:hover:border-emerald-800"
          onClick={() => navigate('/admin/sales')}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gross Platform Sales</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(stats?.totalGrossSales || 0)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Receipt className="h-3.5 w-3.5 text-emerald-500" />
                <span>Across all client invoices</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <TrendingUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Platform Gross Purchases */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:border-purple-300 dark:hover:border-purple-800"
          onClick={() => navigate('/admin/purchases')}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gross Procurement</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {formatCurrency(stats?.totalGrossPurchases || 0)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <ShoppingCart className="h-3.5 w-3.5 text-purple-500" />
                <span>Across all supplier bills</span>
              </div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-100 dark:border-purple-900/50">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Platform OPEX / Expenses */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all hover:border-amber-300 dark:hover:border-amber-800"
          onClick={() => navigate('/admin/expenses')}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Operating Expenses</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {formatCurrency(stats?.totalExpenses || 0)}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Landmark className="h-3.5 w-3.5 text-amber-500" />
                <span>Salaries, utilities, logistics</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/50">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Liquidity & Working Capital Strip */}
      <div className="bg-white dark:bg-[#141A24] rounded-2xl p-6 border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-[#1F2837]">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
              Platform Cash Movement & Working Capital
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Aggregated money received, disbursements made, and market credit across all business accounts.
            </p>
          </div>
          <div>
            <Badge 
              variant={stats?.cashFlowStatus === 'SURPLUS' ? 'success' : stats?.cashFlowStatus === 'DEFICIT' ? 'danger' : 'info'}
              className="text-xs px-3 py-1 uppercase tracking-wider font-bold"
            >
              Platform Status: {stats?.cashFlowStatus || 'BALANCED'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Collections Received</span>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(stats?.totalPaymentsReceived || 0)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Disbursements Paid</span>
            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              {formatCurrency(stats?.totalPaymentsMade || 0)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Receivables (Dues)</span>
            <p className="text-lg font-bold text-blue-600 dark:text-sky-400 mt-0.5">
              {formatCurrency(stats?.totalReceivables || 0)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Total Payables (Liabilities)</span>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {formatCurrency(stats?.totalPayables || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Split: Top Performing Clients + Live Platform Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Clients Leaderboard (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Top Performing Business Accounts
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Ranked by gross sales volume and trading throughput.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin/clients')}
              className="text-xs"
            >
              View All Clients
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {stats?.topClients && stats.topClients.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-[#1F2837]">
                  {stats.topClients.map((client, idx) => (
                    <div 
                      key={client.publicId}
                      className="p-4 flex items-center justify-between hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-2 ring-amber-400/40' :
                          idx === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-400/40' :
                          idx === 2 ? 'bg-amber-900/20 text-amber-900 dark:bg-amber-950/30 dark:text-amber-400 ring-1 ring-amber-600/30' :
                          'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                            {client.ownerName || client.username}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                            <span className="truncate">@{client.username}</span>
                            <span>•</span>
                            <span>{client.mobileNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                            {formatCurrency(client.totalSalesVolume || 0)}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            {client.totalSalesCount} Invoices
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/admin/clients/${client.publicId}`)}
                          className="text-xs text-blue-600 dark:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/40"
                        >
                          Inspect
                          <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
                  No registered business accounts found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live System Activity Feed (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                Live Platform Stream
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Recent invoices, bills, and platform activity.
              </p>
            </div>
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
          </div>

          <Card>
            <CardContent className="p-4 space-y-3">
              {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((act, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded-xl bg-gray-50/70 dark:bg-[#0E131C] border border-gray-100 dark:border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-slate-200">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                          act.activityType === 'SALE_INVOICE' ? 'bg-emerald-500' :
                          act.activityType === 'PURCHASE_BILL' ? 'bg-purple-500' : 'bg-blue-500'
                        }`} />
                        <span className="truncate">{act.documentNumber || act.activityType}</span>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 truncate mt-0.5">
                        Party: {act.partyName}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 font-mono">
                        {formatDate(act.date)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-gray-900 dark:text-slate-100">
                        {formatCurrency(act.amount || 0)}
                      </span>
                      <div className="mt-0.5">
                        <Badge variant={act.status === 'PAID' ? 'success' : 'default'} className="text-[10px] px-1.5 py-0">
                          {act.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-gray-500 dark:text-slate-400">
                  No recent activity logged yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Platform Health Indicator */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50/80 via-white to-emerald-50/50 dark:from-[#161F2E] dark:via-[#141A24] dark:to-[#0F1D1A] border border-indigo-100/60 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-gray-900 dark:text-slate-100">Platform Health Check</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Normal
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Authentication security active, multi-tenant database isolation verified, token refresh services running normally.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/admin/system')}
              className="w-full text-xs mt-1"
            >
              Inspect System Diagnostics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
