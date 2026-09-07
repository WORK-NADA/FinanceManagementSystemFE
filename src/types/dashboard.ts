export interface PartnerShareDetails {
  partnerPublicId: string;
  partnerName: string;
  sharePercentageAtDistribution: number;
  shareAmount: number;
}

export interface ResponseProfitDistributionDTO {
  publicId: string;
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  totalPurchaseCost: number;
  totalExpenses: number;
  netProfit: number;
  createdAt: string;
  shares: PartnerShareDetails[];
}

export interface MonthlyTrendItem {
  month: string;
  revenue: number;
  cost: number;
  expenses: number;
  profit: number;
}

export interface RecentActivityItem {
  activityType: 'SALE_INVOICE' | 'PURCHASE_BILL' | 'EXPENSE' | string;
  documentNumber: string;
  partyName: string;
  amount: number;
  date: string;
  status: string;
}

export interface DashboardSummaryDTO {
  totalOutstanding: number;
  totalReceivable: number;
  totalExpensesThisMonth: number;
  lowStockCount: number;
  latestProfitDistribution: ResponseProfitDistributionDTO | null;
  monthlyTrends?: MonthlyTrendItem[];
  recentActivities?: RecentActivityItem[];
  netWorkingCapital?: number;
  cashFlowStatus?: 'SURPLUS' | 'BALANCED' | 'DEFICIT' | string;
  openingBalance?: number;
  totalMoneyReceived?: number;
  totalMoneyPaid?: number;
  totalExpenses?: number;
  totalBalance?: number;
  totalWithdrawals?: number;
  netProfit?: number;
}
