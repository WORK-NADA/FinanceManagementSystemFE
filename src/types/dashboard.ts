
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

export interface DashboardSummaryDTO {
  totalOutstanding: number;
  totalReceivable: number;
  totalExpensesThisMonth: number;
  lowStockCount: number;
  latestProfitDistribution: ResponseProfitDistributionDTO | null;
}
