export interface ResponseSaleReportDTO {
  publicId: string;
  saleDate: string;
  totalAmount: number;
  paymentStatus: string;
  customerName: string;
}

export interface ResponsePurchaseReportDTO {
  publicId: string;
  purchaseDate: string;
  totalAmount: number;
  paymentStatus: string;
  supplierName: string;
}

export interface ResponseExpenseReportDTO {
  publicId: string;
  expenseDate: string;
  amount: number;
  description: string;
}

export interface ResponseProfitLossReportDTO {
  totalRevenue: number;
  totalPurchaseCost: number;
  totalExpenses: number;
  netProfit: number;
}

export interface ResponseStockReportDTO {
  publicId: string;
  rawMaterial: string;
  unit: string;
  currentQuantity: number;
  minimumStockLevel: number;
}

export interface ResponseCustomerOutstandingReportDTO {
  publicId: string;
  customerName: string;
  mobileNumber: string;
  totalOutstandingAmount: number;
}

export interface ResponseSupplierOutstandingReportDTO {
  publicId: string;
  supplierName: string;
  mobileNumber: string;
  totalOutstandingAmount: number;
}
