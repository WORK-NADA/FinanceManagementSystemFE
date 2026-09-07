import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calculator, History, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  RotateCcw, ArrowRight, Wallet, TrendingUp, TrendingDown, Download, Calendar, DollarSign, 
  ArrowDownRight, RefreshCw, X, Trash2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getProfitDistributions, 
  distributeProfit, 
  previewProfitDistribution,
  getLiveProfitOverview,
  recordProfitWithdrawal,
  getProfitWithdrawals,
  deleteProfitWithdrawal
} from '../api/partner';
import { 
  profitDistributionSchema, 
  profitWithdrawalSchema,
  type RequestProfitDistributionDTO, 
  type ResponseProfitDistributionDTO,
  type RequestProfitWithdrawalDTO,
  type PartnerLiveProfitDTO
} from '../types/partner';
import {
  Button, Modal, Input, PageHeader, ErrorState, EmptyState, Badge
} from '@/components';
import { formatCurrency, formatDate, formatNumber } from '@/lib';
import { toast } from '../store/toastStore';
import { exportProfessionalCsv, formatCsvNumber, formatCsvDate, formatCsvTimestamp } from '../utils/csvExport';

export default function ProfitDistribution() {
  const queryClient = useQueryClient();

  // Distribution Wizard State
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const [previewData, setPreviewData] = useState<ResponseProfitDistributionDTO | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerLiveProfitDTO | null>(null);

  // History Date Filter State
  const [historyFromDate, setHistoryFromDate] = useState<string>('');
  const [historyToDate, setHistoryToDate] = useState<string>('');
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { 
    data: liveOverview, 
    isLoading: isLiveLoading, 
    isError: isLiveError, 
    error: liveError, 
    refetch: refetchLive 
  } = useQuery({
    queryKey: ['live-profit-overview'],
    queryFn: getLiveProfitOverview,
    refetchInterval: 30000, // Background sync every 30s
  });

  const { 
    data: withdrawals = [], 
    isLoading: isWithdrawalsLoading, 
    isError: isWithdrawalsError, 
    error: withdrawalsError, 
    refetch: refetchWithdrawals 
  } = useQuery({
    queryKey: ['profit-withdrawals', historyFromDate, historyToDate],
    queryFn: () => getProfitWithdrawals({
      fromDate: historyFromDate || undefined,
      toDate: historyToDate || undefined,
    }),
  });

  const { 
    data: distributions = [], 
    isLoading: isDistributionsLoading, 
    isError: isDistributionsError, 
    error: distributionsError, 
    refetch: refetchDistributions 
  } = useQuery({
    queryKey: ['profit-distributions'],
    queryFn: getProfitDistributions,
  });

  // ── Form & Mutations: Withdrawal ───────────────────────────────────────────
  const {
    register: registerWithdrawal,
    handleSubmit: handleWithdrawalSubmit,
    reset: resetWithdrawal,
    setValue: setWithdrawalValue,
    watch: watchWithdrawal,
    formState: { errors: withdrawalErrors },
  } = useForm<RequestProfitWithdrawalDTO>({
    resolver: zodResolver(profitWithdrawalSchema),
    defaultValues: {
      withdrawalDate: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Bank Transfer',
    },
  });

  const watchedAmount = watchWithdrawal('amount');

  const withdrawalMutation = useMutation({
    mutationFn: recordProfitWithdrawal,
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] });
      queryClient.invalidateQueries({ queryKey: ['profit-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setIsWithdrawModalOpen(false);
      resetWithdrawal();
      setSelectedPartner(null);
      toast.success(`Withdrawal of ${formatCurrency(resp.amount)} recorded for ${resp.partnerName}!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record withdrawal.');
    },
  });

  const deleteWithdrawalMutation = useMutation({
    mutationFn: deleteProfitWithdrawal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] });
      queryClient.invalidateQueries({ queryKey: ['profit-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      toast.success('Withdrawal record deleted successfully. Available balance restored.');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to delete withdrawal record.');
    },
  });

  const handleOpenWithdrawModal = (partner: PartnerLiveProfitDTO) => {
    setSelectedPartner(partner);
    resetWithdrawal({
      partnerPublicId: partner.partnerPublicId,
      withdrawalDate: new Date().toISOString().slice(0, 10),
      amount: partner.remainingProfitAvailable > 0 ? partner.remainingProfitAvailable : undefined,
      paymentMethod: 'Bank Transfer',
      referenceNumber: '',
      notes: '',
    });
    setIsWithdrawModalOpen(true);
  };

  const onWithdrawSubmit = (data: RequestProfitWithdrawalDTO) => {
    if (!selectedPartner) return;
    if (data.amount > selectedPartner.remainingProfitAvailable) {
      toast.error(`Withdrawal amount cannot exceed available profit of ${formatCurrency(selectedPartner.remainingProfitAvailable)}`);
      return;
    }
    withdrawalMutation.mutate(data);
  };

  // ── Form & Mutations: Period Distribution ─────────────────────────────────
  const { 
    register: registerDist, 
    handleSubmit: handleDistSubmit, 
    reset: resetDist, 
    getValues: getDistValues, 
    formState: { errors: distErrors } 
  } = useForm<RequestProfitDistributionDTO>({
    resolver: zodResolver(profitDistributionSchema),
  });

  const previewMutation = useMutation({
    mutationFn: previewProfitDistribution,
    onSuccess: (data) => {
      setPreviewData(data);
      setWizardStep('PREVIEW');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to generate preview. Check dates or partner share allocation.');
    },
  });

  const distributeMutation = useMutation({
    mutationFn: distributeProfit,
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['profit-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['profit-distribution-latest'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      setIsDistributeModalOpen(false);
      setWizardStep('INPUT');
      setPreviewData(null);
      resetDist();
      if (resp?.isRecalculation) {
        toast.success('Profit distribution recalculated and updated successfully!');
      } else {
        toast.success('Profit distribution recorded and saved successfully!');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to execute profit sharing.');
    },
  });

  const handleCloseDistributeModal = () => {
    setIsDistributeModalOpen(false);
    setWizardStep('INPUT');
    setPreviewData(null);
    resetDist();
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Filtered Withdrawals List ──────────────────────────────────────────────
  const filteredWithdrawals = useMemo(() => {
    if (partnerFilter === 'ALL') return withdrawals;
    return withdrawals.filter(w => w.partnerPublicId === partnerFilter);
  }, [withdrawals, partnerFilter]);

  const hasActiveDateFilter = Boolean(historyFromDate || historyToDate);

  const handleClearDates = () => {
    setHistoryFromDate('');
    setHistoryToDate('');
  };

  // ── CSV Export ─────────────────────────────────────────────────────────────
  const handleExportWithdrawalsCsv = () => {
    if (filteredWithdrawals.length === 0) {
      toast.error('No withdrawal records available to export.');
      return;
    }

    const totalWithdrawnAmount = filteredWithdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    exportProfessionalCsv({
      filename: `Partner_Profit_Withdrawals_${historyFromDate || 'All'}_to_${historyToDate || 'Current'}`,
      documentTitle: 'Partner Profit Withdrawal Statement',
      subtitle: 'Official audit log of partner profit distributions and recorded withdrawals',
      metadata: [
        { label: 'Date Filter Range', value: hasActiveDateFilter ? `${historyFromDate || 'Beginning'} to ${historyToDate || 'Today'}` : 'All Recorded Dates' },
        { label: 'Partner Filter', value: partnerFilter === 'ALL' ? 'All Partners' : (filteredWithdrawals[0]?.partnerName || partnerFilter) },
        { label: 'Total Withdrawals Count', value: formatNumber(filteredWithdrawals.length) },
        { label: 'Total Amount Withdrawn', value: `INR ${formatCsvNumber(totalWithdrawnAmount)}` },
        { label: 'Export Generated On', value: formatCsvTimestamp() },
      ],
      sections: [
        {
          sectionTitle: 'Withdrawal Transaction Details',
          headers: [
            'Withdrawal Date',
            'Partner Name',
            'Profit Share (%)',
            'Withdrawn Amount (INR)',
            'Available Before (INR)',
            'Remaining After (INR)',
            'Payment Mode',
            'Reference #',
            'Notes',
            'Recorded At'
          ],
          rows: filteredWithdrawals.map(w => [
            formatCsvDate(w.withdrawalDate),
            w.partnerName,
            `${formatCsvNumber(w.partnerSharePercentage, 2)}%`,
            formatCsvNumber(w.amount),
            formatCsvNumber(w.availableBeforeWithdrawal),
            formatCsvNumber(w.remainingAfterWithdrawal),
            w.paymentMethod || '—',
            w.referenceNumber || '—',
            w.notes || '—',
            formatCsvTimestamp(new Date(w.createdAt)),
          ]),
          summaryRow: [
            'TOTAL',
            `${formatNumber(filteredWithdrawals.length)} Transactions`,
            '—',
            formatCsvNumber(totalWithdrawnAmount),
            '—',
            '—',
            '—',
            '—',
            '—',
            '—'
          ]
        }
      ]
    });
    toast.success('Withdrawal history CSV downloaded successfully!');
  };

  const handleRefreshAll = () => {
    refetchLive();
    refetchWithdrawals();
    refetchDistributions();
    toast.success('Profit sharing data refreshed');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <PageHeader
        title="Partner Profit Sharing"
        action={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              className="gap-1.5 text-xs text-gray-700 dark:text-slate-300"
              title="Refresh all metrics"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        }
      />

      {/* ── Top KPI Cards: Cash-Basis Business Health ─────────────────────── */}
      {isLiveLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] animate-pulse" />
          ))}
        </div>
      ) : isLiveError ? (
        <ErrorState message={(liveError as any)?.message || 'Failed to load live profit summary'} onRetry={() => refetchLive()} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Live Net Business Profit (Cash Basis) */}
          {(() => {
            const netProfitVal = liveOverview?.netProfit ?? 0;
            const isLoss = netProfitVal < 0;
            return (
              <div className={`bg-white dark:bg-[#141A24] p-5 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between border ${
                isLoss
                  ? 'border-rose-200 dark:border-rose-900/60'
                  : 'border-gray-200/90 dark:border-[#1F2837]'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-slate-400'
                  }`}>
                    {isLoss ? 'Business Net Loss' : 'Business Net Profit'}
                  </span>
                  <div className={`p-2 rounded-xl ${
                    isLoss
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isLoss ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  </div>
                </div>
                <div className="mt-3">
                  <p className={`text-2xl font-serif font-bold ${
                    isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-slate-100'
                  }`}>
                    {formatCurrency(netProfitVal)}
                  </p>
                  <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Received: <strong className="text-emerald-700 dark:text-emerald-400">+{formatCurrency(liveOverview?.totalMoneyReceived ?? liveOverview?.totalSalesRevenue ?? 0)}</strong></span>
                    <span>•</span>
                    <span>Paid: <strong className="text-rose-700 dark:text-rose-400">-{formatCurrency(liveOverview?.totalMoneyPaid ?? liveOverview?.totalPurchasesCost ?? 0)}</strong></span>
                    <span>•</span>
                    <span>Expenses: <strong className="text-amber-700 dark:text-amber-400">-{formatCurrency(liveOverview?.totalExpenses ?? 0)}</strong></span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Card 2: Total Profit Withdrawn */}
          <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Profit Withdrawn
              </span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(liveOverview?.totalProfitWithdrawn ?? 0)}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
                Total withdrawn across all partners to date
              </p>
            </div>
          </div>

          {/* Card 3: Remaining Available to Withdraw */}
          <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Available to Withdraw
              </span>
              <div className="p-2 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(liveOverview?.totalRemainingProfit ?? 0)}
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400/80 mt-2">
                Net remaining available partner balance
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: Live Partner Profit Sharing (Continuous Real-Time) ─── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-slate-100">
                  Live Partner Profit Sharing
                </h2>
                <Badge variant="success" className="text-[10px] py-0.5 px-2 font-bold tracking-wide uppercase">
                  Continuous Cash Basis
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Continuously calculated from actual customer money received minus supplier money paid and operating expenses
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Independent of periodic accounting lock records
          </span>
        </div>

        {isLiveLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] animate-pulse" />
            ))}
          </div>
        ) : !liveOverview?.partners || liveOverview.partners.length === 0 ? (
          <EmptyState
            title="No partners registered yet"
            description="Add partners in the Partners tab to view live profit sharing and record withdrawals."
          />
        ) : (
          <div className={
            liveOverview.partners.length === 1
              ? "grid grid-cols-1 max-w-md mx-auto w-full"
              : liveOverview.partners.length === 2
                ? "grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto w-full"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full"
          }>
            {liveOverview.partners.map(partner => {
              const hasAvailable = partner.remainingProfitAvailable > 0;
              return (
                <div
                  key={partner.partnerPublicId}
                  className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full"
                >
                  <div className="flex flex-col h-full justify-between">
                    {/* Partner Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#1F2837] min-h-[52px]">
                      <div>
                        <h3 className="font-semibold text-base text-gray-900 dark:text-slate-100 line-clamp-1">
                          {partner.partnerName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {partner.partnerPhone || partner.partnerEmail || 'Partner'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={partner.active ? 'success' : 'default'} className="text-[11px] font-bold whitespace-nowrap">
                          {formatNumber(partner.sharePercentage, { maximumFractionDigits: 2 })}% Share
                        </Badge>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="py-4 space-y-2.5 text-xs flex-1 flex flex-col justify-center">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-slate-400">Total Profit Earned:</span>
                        <span className={`font-semibold tabular-nums ${
                          partner.totalEarnedProfit < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-gray-900 dark:text-slate-100'
                        }`}>
                          {formatCurrency(partner.totalEarnedProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 dark:text-slate-400">Profit Already Withdrawn:</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                          -{formatCurrency(partner.totalWithdrawnProfit)}
                        </span>
                      </div>
                      <div className="pt-2.5 border-t border-gray-100 dark:border-[#1F2837] flex justify-between items-center">
                        <span className="font-semibold text-gray-800 dark:text-slate-200">
                          {partner.remainingProfitAvailable < 0 ? 'Net Loss Share:' : 'Available to Withdraw:'}
                        </span>
                        <span className={`text-base font-serif font-bold tabular-nums ${
                          partner.remainingProfitAvailable < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : hasAvailable
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-gray-400 dark:text-slate-500'
                        }`}>
                          {formatCurrency(partner.remainingProfitAvailable)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Withdraw Action */}
                  <div className="pt-3 border-t border-gray-100 dark:border-[#1F2837] mt-auto">
                    <Button

                      onClick={() => handleOpenWithdrawModal(partner)}
                      disabled={!hasAvailable}
                      className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-400 dark:disabled:text-slate-600"
                    >
                      <DollarSign className="h-4 w-4" />
                      {hasAvailable ? 'Withdraw Profit' : 'No Profit to Withdraw'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 2: Profit Withdrawal History ───────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-gray-200/80 dark:border-[#1F2837]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-gray-700 dark:text-slate-300" />
              <h2 className="text-lg font-serif font-bold text-gray-900 dark:text-slate-100">
                Profit Withdrawal History
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Detailed audit trail of all partner profit withdrawals
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportWithdrawalsCsv}
              disabled={filteredWithdrawals.length === 0}
              className="gap-1.5 text-xs text-gray-700 dark:text-slate-200 border-gray-200 dark:border-[#1F2837] hover:bg-gray-50 dark:hover:bg-[#1A2331]"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="bg-white dark:bg-[#141A24] p-4 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={historyFromDate}
                onChange={e => setHistoryFromDate(e.target.value)}
                aria-label="From Date"
                className="h-8 px-2.5 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={historyToDate}
                onChange={e => setHistoryToDate(e.target.value)}
                aria-label="To Date"
                className="h-8 px-2.5 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              />
            </div>

            {hasActiveDateFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearDates}
                className="h-8 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1 px-2.5"
              >
                <X className="h-3.5 w-3.5" /> Clear Dates
              </Button>
            )}
          </div>

          {/* Partner Filter */}
          {liveOverview?.partners && liveOverview.partners.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Partner:</span>
              <select
                value={partnerFilter}
                onChange={e => setPartnerFilter(e.target.value)}
                aria-label="Filter by Partner"
                className="h-8 px-3 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                <option value="ALL">All Partners</option>
                {liveOverview.partners.map(p => (
                  <option key={p.partnerPublicId} value={p.partnerPublicId}>
                    {p.partnerName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Withdrawal Table / Cards */}
        {isWithdrawalsLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] animate-pulse" />
            ))}
          </div>
        ) : isWithdrawalsError ? (
          <ErrorState message={(withdrawalsError as any)?.message || 'Failed to load withdrawal history'} onRetry={() => refetchWithdrawals()} />
        ) : filteredWithdrawals.length === 0 ? (
          <EmptyState
            title="No withdrawal records found"
            description={hasActiveDateFilter ? "No profit withdrawals match the selected date range. Click 'Clear Dates' to view all." : "When partners withdraw available profit, the records will appear here."}
            action={hasActiveDateFilter ? (
              <Button variant="outline" size="sm" onClick={handleClearDates} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Clear Dates
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/75 dark:bg-[#0E131C] text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-gray-100 dark:border-[#1F2837]">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3 text-right">Withdrawn Amount</th>
                    <th className="px-4 py-3 text-right">Available Before</th>
                    <th className="px-4 py-3 text-right">Remaining After</th>
                    <th className="px-4 py-3">Mode & Ref</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
                  {filteredWithdrawals.map(w => (
                    <tr key={w.publicId} className="hover:bg-gray-50/60 dark:hover:bg-[#1A2331] transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap font-medium text-gray-900 dark:text-slate-100">
                        {formatDate(w.withdrawalDate)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{w.partnerName}</span>
                        <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-1.5">({formatNumber(w.partnerSharePercentage, { maximumFractionDigits: 2 })}%)</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-serif font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                        {formatCurrency(w.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-gray-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatCurrency(w.availableBeforeWithdrawal)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                        {formatCurrency(w.remainingAfterWithdrawal)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-medium text-gray-800 dark:text-slate-200">{w.paymentMethod || '—'}</span>
                        {w.referenceNumber && (
                          <span className="block text-[10px] text-gray-400 dark:text-slate-500 font-mono">Ref: {w.referenceNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-slate-400 max-w-xs truncate" title={w.notes}>
                        {w.notes || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete this withdrawal of ${formatCurrency(w.amount)} for ${w.partnerName}? This will restore the partner's available profit.`)) {
                              deleteWithdrawalMutation.mutate(w.publicId);
                            }
                          }}
                          disabled={deleteWithdrawalMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete withdrawal record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Completed Period Profit Distributions ──────────────── */}
      <div className="space-y-4 pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-slate-100">
                  Periodic Profit Share Distributions
                </h2>
                <span className="text-[10px] py-0.5 px-2 font-bold tracking-wide uppercase rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
                  Historical / Specific Period Accounting
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Official accounting lock records and profit settlements calculated for specific date ranges
              </p>
            </div>
          </div>

          <Button 
            onClick={() => setIsDistributeModalOpen(true)} 
            className="gap-2 text-xs sm:text-sm bg-[var(--color-primary)] hover:opacity-90 shadow-xs"
          >
            <Calculator className="h-4 w-4" /> Calculate Period Profit
          </Button>
        </div>

        {isDistributionsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] animate-pulse" />
            ))}
          </div>
        ) : isDistributionsError ? (
          <ErrorState message={(distributionsError as any)?.message || 'Failed to load past distributions'} onRetry={() => refetchDistributions()} />
        ) : distributions.length === 0 ? (
          <div className="bg-gray-50 dark:bg-[#141A24] border border-gray-200 dark:border-[#1F2837] rounded-xl p-6 flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 text-center">
            <Calculator className="h-7 w-7 mb-2 opacity-50" />
            <p className="text-xs font-medium">No periodic accounting distributions generated yet.</p>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">Use "Calculate Period Profit" above if you wish to formally lock a specific time period.</p>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* Guide Bar */}
            <div className="hidden lg:grid lg:grid-cols-[28px_minmax(115px,1.1fr)_minmax(130px,1.3fr)_minmax(95px,0.9fr)_minmax(95px,0.9fr)_minmax(95px,0.9fr)_minmax(100px,1fr)] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
              <div></div>
              <div>Date Shared</div>
              <div>Time Period</div>
              <div className="text-right">Money Received</div>
              <div className="text-right">Money Paid</div>
              <div className="text-right">Expenses</div>
              <div className="text-right">Net Profit</div>
            </div>

            {/* Past Distribution Rows */}
            {distributions.map(d => {
              const isExpanded = !!expandedRows[d.publicId];
              const isRecalculated = Boolean(d.isRecalculation || (d.updatedAt && d.updatedAt !== d.createdAt));
              return (
                <div
                  key={d.publicId}
                  className={`bg-white dark:bg-[#141A24] rounded-2xl border transition-all duration-200 shadow-xs ${
                    isExpanded
                      ? 'border-[var(--color-primary)]/50 ring-1 ring-[var(--color-primary)]/20 shadow-sm'
                      : 'border-gray-200/90 dark:border-[#1F2837] hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`grid grid-cols-1 lg:grid-cols-[28px_minmax(115px,1.1fr)_minmax(130px,1.3fr)_minmax(95px,0.9fr)_minmax(95px,0.9fr)_minmax(95px,0.9fr)_minmax(100px,1fr)] items-center gap-3 px-5 py-3.5 cursor-pointer select-none rounded-2xl ${
                      isExpanded ? 'bg-slate-50/50 dark:bg-[#18212F] rounded-b-none' : 'hover:bg-gray-50/70 dark:hover:bg-[#1A2331]'
                    }`}
                    onClick={() => toggleRow(d.publicId)}
                  >
                    <div className="flex justify-center text-gray-400 min-w-0">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[var(--color-primary)]" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <div className="whitespace-nowrap font-medium text-xs text-gray-900 dark:text-slate-100 flex flex-wrap items-center gap-1.5">
                      <span>{formatDate(d.updatedAt || d.createdAt)}</span>
                      {isRecalculated && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                          Recalculated
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-slate-400 truncate">
                      {formatDate(d.fromDate)} to {formatDate(d.toDate)}
                    </div>
                    <div className="lg:text-right text-xs tabular-nums text-gray-900 dark:text-slate-100 font-medium">
                      {formatCurrency(d.totalRevenue)}
                    </div>
                    <div className="lg:text-right text-xs tabular-nums text-rose-700 dark:text-rose-400 font-medium">
                      -{formatCurrency(d.totalPurchaseCost)}
                    </div>
                    <div className="lg:text-right text-xs tabular-nums text-rose-700 dark:text-rose-400 font-medium">
                      -{formatCurrency(d.totalExpenses)}
                    </div>
                    <div className="lg:text-right text-xs tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatCurrency(d.netProfit)}
                    </div>
                  </div>

                  {/* Expandable partner breakdown */}
                  {isExpanded && (
                    <div className="bg-gradient-to-b from-slate-50/90 to-slate-50/40 dark:from-[#18212F] dark:to-[#141A24] border-t border-gray-100 dark:border-[#1F2837] p-5 rounded-b-xl">
                      <div className="bg-white dark:bg-[#0E131C] rounded-xl border border-gray-200 dark:border-[#1F2837] p-4 shadow-xs">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-300">
                            Partner Profit Shares ({formatDate(d.fromDate)} — {formatDate(d.toDate)})
                          </h4>
                          <Badge variant="success" className="text-[10px]">
                            {formatNumber(d.shares?.length ?? 0)} Partners
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {d.shares && d.shares.length > 0 ? (
                            d.shares.map(s => (
                              <div key={s.partnerPublicId} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-[#141A24] border border-gray-100 dark:border-[#1F2837]">
                                <div>
                                  <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">{s.partnerName}</p>
                                  <p className="text-[11px] text-gray-500 dark:text-slate-400">Share: {formatNumber(s.sharePercentageAtDistribution, { maximumFractionDigits: 2 })}%</p>
                                </div>
                                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(s.shareAmount)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-400 col-span-3">No partner shares recorded.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal 1: Partner Profit Withdrawal Modal ──────────────────────── */}
      <Modal
        isOpen={isWithdrawModalOpen}
        onClose={() => {
          setIsWithdrawModalOpen(false);
          setSelectedPartner(null);
          resetWithdrawal();
        }}
        title={`Withdraw Profit — ${selectedPartner?.partnerName || 'Partner'}`}
      >
        <form onSubmit={handleWithdrawalSubmit(onWithdrawSubmit)} className="space-y-4">
          {/* Partner Available Balance Header Card */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200/90 dark:border-emerald-900/50 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Current Remaining Profit Available:
              </span>
              <Badge variant="success" className="text-xs font-bold">
                {formatNumber(selectedPartner?.sharePercentage ?? 0, { maximumFractionDigits: 2 })}% Share
              </Badge>
            </div>
            <p className="text-2xl font-serif font-bold text-emerald-800 dark:text-emerald-300">
              {formatCurrency(selectedPartner?.remainingProfitAvailable ?? 0)}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90">
              You can withdraw the full amount or any partial amount up to this balance.
            </p>
          </div>

          {/* Amount input with Quick Fill button */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                Withdrawal Amount (₹) *
              </label>
              {selectedPartner && selectedPartner.remainingProfitAvailable > 0 && (
                <button
                  type="button"
                  onClick={() => setWithdrawalValue('amount', selectedPartner.remainingProfitAvailable, { shouldValidate: true })}
                  className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Withdraw All ({formatCurrency(selectedPartner.remainingProfitAvailable)})
                </button>
              )}
            </div>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter amount to withdraw"
              {...registerWithdrawal('amount', { valueAsNumber: true })}
              error={withdrawalErrors.amount?.message}
            />
            {watchedAmount && selectedPartner && (
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                Remaining after withdrawal:{' '}
                <strong className={watchedAmount > selectedPartner.remainingProfitAvailable ? 'text-rose-600' : 'text-emerald-600'}>
                  {formatCurrency(Math.max(0, (selectedPartner.remainingProfitAvailable || 0) - (watchedAmount || 0)))}
                </strong>
              </p>
            )}
          </div>

          {/* Withdrawal Date */}
          <div>
            <Input
              label="Withdrawal Date *"
              type="date"
              {...registerWithdrawal('withdrawalDate')}
              error={withdrawalErrors.withdrawalDate?.message}
            />
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                {...registerWithdrawal('paymentMethod')}
                className="w-full h-10 px-3 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <Input
                label="Reference / Transaction #"
                placeholder="Optional ref or UTR #"
                {...registerWithdrawal('referenceNumber')}
                error={withdrawalErrors.referenceNumber?.message}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Interim profit payout for Q3"
              {...registerWithdrawal('notes')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsWithdrawModalOpen(false);
                setSelectedPartner(null);
                resetWithdrawal();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={withdrawalMutation.isPending}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm Withdrawal
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal 2: 2-Step Period Profit Distribution Wizard ──────────────── */}
      <Modal 
        isOpen={isDistributeModalOpen} 
        onClose={handleCloseDistributeModal} 
        title={
          wizardStep === 'INPUT' 
            ? "Calculate Profit Sharing (Step 1 of 2)" 
            : previewData?.isRecalculation 
              ? "Review & Update Profit Sharing (Step 2 of 2)" 
              : "Review & Confirm Profit Sharing (Step 2 of 2)"
        }
      >
        {wizardStep === 'INPUT' ? (
          <form onSubmit={handleDistSubmit((data) => previewMutation.mutate(data))} className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Select the date range to calculate money received, money paid, and expenses for that specific period.
            </p>

            {previewMutation.isError && (
              <div className="bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 p-3 rounded-lg text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{(previewMutation.error as any)?.response?.data?.message || (previewMutation.error as any)?.message || 'Failed to calculate preview.'}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input label="From Date *" type="date" {...registerDist('fromDate')} error={distErrors.fromDate?.message} />
              <Input label="To Date *" type="date" {...registerDist('toDate')} error={distErrors.toDate?.message} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
              <Button type="button" variant="outline" onClick={handleCloseDistributeModal}>Cancel</Button>
              <Button type="submit" isLoading={previewMutation.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <span>Preview Partner Shares</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {distributeMutation.isError && (
              <div className="bg-red-50 dark:bg-rose-950/50 border border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-300 p-3 rounded-lg text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{(distributeMutation.error as any)?.response?.data?.message || (distributeMutation.error as any)?.message || 'Failed to distribute profit.'}</span>
              </div>
            )}

            {/* Financial Summary Preview */}
            <div className="bg-slate-50 dark:bg-[#0E131C] p-4 rounded-xl border border-gray-200 dark:border-[#1F2837] space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-[#1F2837]">
                <span className="text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Time Period</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-slate-100">{formatDate(previewData?.fromDate || '')} to {formatDate(previewData?.toDate || '')}</span>
              </div>
              <div className="flex justify-between text-xs pt-1"><span className="text-gray-600 dark:text-slate-400">Total Money Received:</span> <span className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(previewData?.totalRevenue ?? 0)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-slate-400">Total Money Paid:</span> <span className="font-semibold text-red-700 dark:text-rose-400">-{formatCurrency(previewData?.totalPurchaseCost ?? 0)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-600 dark:text-slate-400">Business Expenses:</span> <span className="font-semibold text-red-700 dark:text-rose-400">-{formatCurrency(previewData?.totalExpenses ?? 0)}</span></div>
              <div className="flex justify-between text-xs font-bold pt-2 border-t border-gray-200 dark:border-[#1F2837] text-emerald-800 dark:text-emerald-400">
                <span>Net Profit to Divide:</span>
                <span>{formatCurrency(previewData?.netProfit ?? 0)}</span>
              </div>
            </div>

            {/* Partner Shares Breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Each Partner's Profit Share</p>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {previewData?.shares.map(s => (
                  <div key={s.partnerPublicId} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 dark:bg-[#141A24] border border-gray-200 dark:border-[#1F2837]">
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">{s.partnerName}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-400">Profit Share: {formatNumber(s.sharePercentageAtDistribution, { maximumFractionDigits: 2 })}%</p>
                    </div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(s.shareAmount)}</p>
                  </div>
                ))}
              </div>
            </div>

            {previewData?.isRecalculation ? (
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start gap-2.5 text-blue-900 dark:text-blue-200 text-xs">
                <RefreshCw className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-950 dark:text-blue-100">
                    Recalculating Existing Period
                  </p>
                  <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                    This date period was previously calculated{previewData?.createdAt ? ` on ${formatDate(previewData.createdAt)}` : ''}. Confirming will update the profit distribution and partner shares with the latest figures without creating duplicate records or altering existing withdrawals.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-lg flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>
                  <strong>Note:</strong> Confirming will record these profit shares into each partner's account for this date period.
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-[#1F2837]">
              <Button type="button" variant="outline" onClick={() => setWizardStep('INPUT')} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Edit Dates
              </Button>
              <Button 
                type="button" 
                onClick={() => distributeMutation.mutate(getDistValues())} 
                isLoading={distributeMutation.isPending} 
                className={`gap-1.5 ${previewData?.isRecalculation ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {previewData?.isRecalculation ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Confirm & Update Profit Shares</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Save Profit Shares</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
