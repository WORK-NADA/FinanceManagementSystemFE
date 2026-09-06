import { z } from 'zod';

export const partnerSchema = z.object({
  partnerName: z.string().min(2, 'Min 2 characters').max(150),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Valid 10-digit mobile number required'),
  email: z.string().email('Invalid email').max(150).optional().or(z.literal('')),
  sharePercentage: z.number().min(0.01).max(100, 'Must be between 0.01 and 100'),
  joiningDate: z.string().min(1, 'Join date is required'),
});

export type RequestPartnerDTO = z.input<typeof partnerSchema>;

export interface ResponsePartnerDTO {
  publicId: string;
  partnerName: string;
  mobileNumber: string;
  email?: string;
  sharePercentage: number;
  joiningDate: string;
  isActive: boolean;
  createdAt: string;
  lifetimeEarnings?: number; // Fetched optionally
}

// ── Profit Distribution ───────────────────────────────────────────────────────

export const profitDistributionSchema = z.object({
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
});

export type RequestProfitDistributionDTO = z.input<typeof profitDistributionSchema>;

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
  updatedAt?: string;
  isRecalculation?: boolean;
  shares: PartnerShareDetails[];
}

export interface PartnerHistoryDTO {
  distributionPublicId: string;
  fromDate: string;
  toDate: string;
  sharePercentageAtDistribution: number;
  shareAmount: number;
  createdAt: string;
}

// ── Live Profit Sharing & Partner Withdrawals ─────────────────────────────────

export interface PartnerLiveProfitDTO {
  partnerPublicId: string;
  partnerName: string;
  partnerEmail?: string;
  partnerPhone?: string;
  sharePercentage: number;
  active: boolean;
  totalEarnedProfit: number;
  totalWithdrawnProfit: number;
  remainingProfitAvailable: number;
}

export interface LiveProfitSharingOverviewDTO {
  totalMoneyReceived?: number;
  totalMoneyPaid?: number;
  totalSalesRevenue: number;
  totalPurchasesCost: number;
  totalExpenses: number;
  netProfit: number;
  totalDistributedProfit: number;
  totalProfitWithdrawn: number;
  totalRemainingProfit: number;
  partners: PartnerLiveProfitDTO[];
  latestDistribution?: ResponseProfitDistributionDTO;
}

export const profitWithdrawalSchema = z.object({
  partnerPublicId: z.string().min(1, 'Partner is required'),
  withdrawalDate: z.string().min(1, 'Withdrawal date is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.string().max(50).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type RequestProfitWithdrawalDTO = z.infer<typeof profitWithdrawalSchema>;

export interface ResponseProfitWithdrawalDTO {
  publicId: string;
  partnerPublicId: string;
  partnerName: string;
  partnerSharePercentage: number;
  withdrawalDate: string;
  amount: number;
  availableBeforeWithdrawal: number;
  remainingAfterWithdrawal: number;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}
