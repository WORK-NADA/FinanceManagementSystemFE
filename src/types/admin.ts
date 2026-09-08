import type { ResponseUserAddressDTO } from './user';

export interface TopClientSummary {
  publicId: string;
  ownerName: string;
  username: string;
  email: string;
  mobileNumber: string;
  totalSalesCount: number;
  totalSalesVolume: number;
  customerCount: number;
  enabled: boolean;
}

export interface PlatformActivityItem {
  activityType: 'SALE_INVOICE' | 'PURCHASE_BILL' | 'PAYMENT_RECEIVED' | 'PAYMENT_MADE' | 'CLIENT_REGISTERED';
  clientName: string;
  documentNumber: string;
  partyName: string;
  amount: number;
  date: string;
  status: string;
}

export interface AdminDashboardStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalStockItems: number;
  totalGrossSales: number;
  totalGrossPurchases: number;
  totalPaymentsReceived: number;
  totalPaymentsMade: number;
  totalExpenses: number;
  totalReceivables: number;
  totalPayables: number;
  netWorkingCapital: number;
  cashFlowStatus: 'SURPLUS' | 'DEFICIT' | 'BALANCED';
  topClients: TopClientSummary[];
  recentActivities: PlatformActivityItem[];
}

export interface ClientPartnerItem {
  publicId: string;
  partnerName: string;
  mobileNumber: string;
  email: string;
  sharePercentage: number;
  totalWithdrawn: number;
  isActive: boolean;
}

export interface ClientRecentSaleItem {
  publicId: string;
  saleNumber: string;
  customerName: string;
  totalAmount: number;
  paymentStatus: string;
  saleDate: string;
}

export interface ClientRecentPurchaseItem {
  publicId: string;
  purchaseNumber: string;
  supplierName: string;
  totalAmount: number;
  paymentStatus: string;
  purchaseDate: string;
}

export interface ClientRecentPaymentItem {
  publicId: string;
  paymentType: 'CUSTOMER_RECEIPT' | 'SUPPLIER_PAYMENT';
  referenceNumber: string;
  partyName: string;
  amount: number;
  paymentMode: string;
  paymentDate: string;
}

export interface Client360Data {
  publicId: string;
  ownerName: string;
  username: string;
  email: string;
  mobileNumber: string;
  role: string;
  enabled: boolean;
  accountNonLocked?: boolean;
  failedLoginAttempts?: number;
  lockTime?: string | null;
  createdAt: string;
  address?: ResponseUserAddressDTO;
  viewablePassword?: string;

  openingBalance: number;
  totalGrossSales: number;
  totalGrossPurchases: number;
  totalPaymentsReceived: number;
  totalPaymentsMade: number;
  totalExpenses: number;
  totalWithdrawals: number;
  netProfit: number;
  totalBalance: number;
  totalReceivables: number;
  totalPayables: number;
  netWorkingCapital: number;

  totalCustomers: number;
  totalSuppliers: number;
  totalStockItems: number;
  totalPartners: number;
  totalSalesCount: number;
  totalPurchasesCount: number;

  partners: ClientPartnerItem[];
  recentSales: ClientRecentSaleItem[];
  recentPurchases: ClientRecentPurchaseItem[];
  recentPayments: ClientRecentPaymentItem[];
}
