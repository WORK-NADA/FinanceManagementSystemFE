import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, 
  Percent 
} from 'lucide-react';
import { getAdminDashboardStats } from '../../api/admin';
import { formatCurrency } from '../../lib';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge, 
  PageHeader, 
  ErrorState 
} from '../../components';

export default function AdminReports() {
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'leaderboard' | 'tax'>('pnl');

  const { data: stats, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['adminDashboardStats'],
    queryFn: getAdminDashboardStats,
  });

  const exportToCSV = (filename: string, rows: (string | number)[][]) => {
    const processRow = (row: (string | number)[]) => {
      return row.map((val) => {
        let text = val === null || val === undefined ? '' : String(val);
        text = text.replace(/"/g, '""');
        if (text.search(/("|,|\n)/g) >= 0) {
          text = `"${text}"`;
        }
        return text;
      }).join(',');
    };

    const csvFile = rows.map(processRow).join('\n');
    const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClientRankings = () => {
    if (!stats?.topClients) return;
    const headers = ['Rank', 'Client Name', 'Username', 'Email', 'Mobile', 'Invoices Count', 'Sales Volume (INR)', 'Customer Count', 'Status'];
    const rows = stats.topClients.map((c, idx) => [
      idx + 1,
      c.ownerName || c.username,
      c.username,
      c.email,
      c.mobileNumber,
      c.totalSalesCount,
      c.totalSalesVolume,
      c.customerCount,
      c.enabled ? 'Active' : 'Disabled',
    ]);
    exportToCSV('platform_client_rankings', [headers, ...rows]);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-14 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse" />
        <div className="h-64 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState 
        message={(error as any)?.message || 'Failed to load platform reports.'} 
        onRetry={() => refetch()} 
      />
    );
  }

  const netPlatformMargin = (stats?.totalPaymentsReceived || 0) - (stats?.totalPaymentsMade || 0) - (stats?.totalExpenses || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Financial Intelligence & Reports"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Platform Reports' },
        ]}
      />

      {/* Reports Category Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-semibold w-full sm:w-fit overflow-x-auto no-scrollbar touch-pan-x whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveReportTab('pnl')}
          className={`px-4 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'pnl'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Consolidated Platform P&L
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('leaderboard')}
          className={`px-4 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'leaderboard'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Client Comparative Rankings
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('tax')}
          className={`px-4 py-2 rounded-lg transition-all cursor-pointer shrink-0 ${
            activeReportTab === 'tax'
              ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Ecosystem Tax & GST Summary
        </button>
      </div>

      {/* Tab: Consolidated P&L */}
      {activeReportTab === 'pnl' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Gross Platform Turnover</span>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 mt-1 break-words">
                {formatCurrency(stats?.totalGrossSales || 0)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Total invoiced sales</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actual Collections (Recv)</span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 break-words">
                {formatCurrency(stats?.totalPaymentsReceived || 0)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Money realized in accounts</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actual Procurement Cost</span>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 break-words">
                {formatCurrency(stats?.totalPaymentsMade || 0)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Direct goods disbursements</p>
            </div>

            <div className="p-5 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Net Platform Margin</span>
              <p className={`text-xl sm:text-2xl font-bold mt-1 break-words ${
                netPlatformMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatCurrency(netPlatformMargin)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Recv − Paid − OPEX</p>
            </div>
          </div>

          {/* Consolidated P&L Table Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Consolidated Financial Statement (Cross-Tenant)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 divide-y divide-gray-100 dark:divide-slate-800 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 font-medium gap-1">
                  <span className="text-gray-700 dark:text-slate-300">1. Total Sales Payments Received (Revenue Realized)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold sm:text-right shrink-0">{formatCurrency(stats?.totalPaymentsReceived || 0)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 font-medium gap-1">
                  <span className="text-gray-700 dark:text-slate-300">2. Less: Total Purchase Payments Made (Direct Procurement)</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold sm:text-right shrink-0">- {formatCurrency(stats?.totalPaymentsMade || 0)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 font-bold bg-gray-50/50 dark:bg-slate-800/30 px-3 rounded-lg gap-1">
                  <span className="text-gray-900 dark:text-slate-100">= Gross Operating Surplus</span>
                  <span className="text-gray-900 dark:text-slate-100 sm:text-right shrink-0">
                    {formatCurrency((stats?.totalPaymentsReceived || 0) - (stats?.totalPaymentsMade || 0))}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2 font-medium gap-1">
                  <span className="text-gray-700 dark:text-slate-300">3. Less: Total Business Operating Expenses (OPEX)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold sm:text-right shrink-0">- {formatCurrency(stats?.totalExpenses || 0)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 font-bold bg-emerald-50/50 dark:bg-emerald-950/20 px-3 rounded-lg text-sm sm:text-base border border-emerald-200/50 dark:border-emerald-800/50 gap-1">
                  <span className="text-emerald-900 dark:text-emerald-300">= Net Platform Operating Margin</span>
                  <span className={`sm:text-right shrink-0 ${netPlatformMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(netPlatformMargin)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Client Comparative Rankings */}
      {activeReportTab === 'leaderboard' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Tenant Performance Rankings</CardTitle>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Benchmarking registered businesses by sales throughput and customer base.
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportClientRankings}
              className="text-xs self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export to CSV
            </Button>
          </CardHeader>
          <CardContent>
            {stats?.topClients && stats.topClients.length > 0 ? (
              <div className="w-full space-y-2">
                <div className="hidden lg:grid lg:grid-cols-[60px_minmax(140px,2fr)_minmax(120px,1fr)_100px_130px_90px] items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
                  <div>Rank</div>
                  <div>Business / Owner</div>
                  <div>Contact</div>
                  <div>Customers</div>
                  <div className="text-right">Sales Volume</div>
                  <div className="text-right pr-2">Status</div>
                </div>

                {stats.topClients.map((client, idx) => (
                  <div 
                    key={client.publicId}
                    className="rounded-xl border border-gray-100 dark:border-slate-800/80 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors overflow-hidden"
                  >
                    {/* Desktop Row */}
                    <div className="hidden lg:grid lg:grid-cols-[60px_minmax(140px,2fr)_minmax(120px,1fr)_100px_130px_90px] items-center gap-3 p-3.5 text-sm">
                      <div className="font-bold text-gray-500 dark:text-slate-400">
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">{client.ownerName || client.username}</p>
                        <p className="text-xs text-gray-400 font-mono">@{client.username}</p>
                      </div>

                      <div className="text-xs text-gray-600 dark:text-slate-400 truncate">
                        <p>{client.email}</p>
                        <p>{client.mobileNumber}</p>
                      </div>

                      <div className="text-xs text-gray-700 dark:text-slate-300 font-medium">
                        {client.customerCount} Parties
                      </div>

                      <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(client.totalSalesVolume || 0)}
                        <p className="text-[10px] text-gray-400 font-normal">{client.totalSalesCount} bills</p>
                      </div>

                      <div className="text-right pr-2">
                        <Badge variant={client.enabled ? 'success' : 'default'} className="text-[10px]">
                          {client.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>

                    {/* Mobile Card */}
                    <div className="lg:hidden p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-slate-800 text-xs font-bold text-gray-700 dark:text-slate-300">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-slate-100">{client.ownerName || client.username}</p>
                            <p className="text-[10px] text-gray-400 font-mono">@{client.username}</p>
                          </div>
                        </div>
                        <Badge variant={client.enabled ? 'success' : 'default'} className="text-[10px] shrink-0">
                          {client.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-gray-500 dark:text-slate-400 space-y-0.5 bg-gray-50/60 dark:bg-[#0E131C] p-2 rounded-lg">
                        <p className="truncate">{client.email}</p>
                        <p>{client.mobileNumber}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-slate-800/80">
                        <span className="text-gray-500 dark:text-slate-400">{client.customerCount} Parties</span>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatCurrency(client.totalSalesVolume || 0)}
                          </span>
                          <span className="text-[10px] text-gray-400 block">{client.totalSalesCount} bills</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">
                No client transaction rankings recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Ecosystem Tax & GST Summary */}
      {activeReportTab === 'tax' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4 text-purple-500" />
                Platform Tax Compliance & GST Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-200/70 dark:border-slate-800">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Total Invoiced Turnover</span>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                    {formatCurrency(stats?.totalGrossSales || 0)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-200/70 dark:border-slate-800">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Total Billed Purchases</span>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                    {formatCurrency(stats?.totalGrossPurchases || 0)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-200/70 dark:border-slate-800">
                  <span className="text-xs text-gray-500 dark:text-slate-400">Total Trading Entities</span>
                  <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                    {(stats?.totalCustomers || 0) + (stats?.totalSuppliers || 0)} Parties
                  </p>
                </div>
              </div>

              <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-purple-200/50 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300">
                <p className="font-semibold mb-1">GST Audit Note:</p>
                <p>
                  Vyapar calculates GST dynamically per invoice and purchase bill (CGST + SGST for intra-state transactions, IGST for inter-state transactions). Individual tax returns can be verified in party statement ledgers or individual client 360° inspection records.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
