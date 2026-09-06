export interface ResponseSaleReportDTO {
  publicId: string;
  saleNumber?: string;
  customerInvoiceNumber?: string;
  rawMaterial?: string;
  weight?: number;
  unit?: string;
  ratePerUnit?: number;
  saleDate: string;
  totalAmount: number;
  paymentStatus: string;
  customerName: string;
}

export interface ResponsePurchaseReportDTO {
  publicId: string;
  purchaseNumber?: string;
  supplierInvoiceNumber?: string;
  rawMaterial?: string;
  weight?: number;
  unit?: string;
  ratePerUnit?: number;
  purchaseDate: string;
  totalAmount: number;
  paymentStatus: string;
  supplierName: string;
}

export interface ResponseExpenseReportDTO {
  publicId: string;
  expenseNumber?: string;
  category?: string;
  paymentMode?: string;
  expenseDate: string;
  amount: number;
  description: string;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ResponseProfitLossReportDTO {
  totalRevenue: number;
  totalPurchaseCost: number;
  grossProfit?: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercentage?: number;
  salesCount?: number;
  purchasesCount?: number;
  expensesCount?: number;
  categoryBreakdown?: ExpenseCategoryBreakdown[];
}

export interface ResponseStockReportDTO {
  publicId: string;
  rawMaterial: string;
  unit: string;
  currentQuantity: number;
  minimumStockLevel: number;
  valuationRate?: number;
  totalValuation?: number;
  stockStatus?: 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK' | string;
}

export interface ResponseCustomerOutstandingReportDTO {
  customerPublicId: string;
  customerName: string;
  mobileNumber?: string;
  email?: string;
  city?: string;
  totalInvoiced?: number;
  totalReceived?: number;
  outstandingAmount: number;
  lastTransactionDate?: string;
}

export interface ResponseSupplierOutstandingReportDTO {
  supplierPublicId: string;
  supplierName: string;
  mobileNumber?: string;
  email?: string;
  city?: string;
  totalBilled?: number;
  totalPaid?: number;
  outstandingAmount: number;
  lastTransactionDate?: string;
}
