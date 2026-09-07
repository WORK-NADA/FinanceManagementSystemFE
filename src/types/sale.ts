import { z } from 'zod';

// ── Sale Types ──────────────────────────────────────────────────────────────
export const WEIGHT_UNITS = ['G', 'KG', 'TON'] as const;
export type WeightUnit = typeof WEIGHT_UNITS[number];

export const saleSchema = z.object({
  customerPublicId:      z.string().min(1, 'Customer is required'),
  rawMaterial:           z.string().min(2, 'Raw material name is required (min 2 chars)').max(100),
  weight:                z.number({ invalid_type_error: 'Weight is required' }).min(0.001, 'Weight must be at least 0.001'),
  unit:                  z.enum(WEIGHT_UNITS, { required_error: 'Unit is required' }),
  ratePerUnit:           z.number({ invalid_type_error: 'Rate per unit is required' }).positive('Rate per unit must be greater than zero'),
  gstPercentage:         z.number({ invalid_type_error: 'GST % is required' }).min(0, 'GST cannot be negative').max(100, 'GST cannot exceed 100'),
  customerInvoiceNumber: z.string().max(50).optional(),
  saleDate:              z.string().min(1, 'Sale date is required'),
});

export type RequestSaleDTO = z.infer<typeof saleSchema>;

// We no longer need SaleItemResponse since the backend sends a flat Sale
export type SalePaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'COMPLETED';

export interface CustomerDetails {
  publicId: string;
  customerName: string;
  mobileNumber?: string;
  email?: string;
  gstNumber?: string;
}

export interface ResponseSaleDTO {
  publicId: string;
  saleNumber: string;
  customer: CustomerDetails;
  rawMaterial: string;
  weight: number;
  unit: WeightUnit;
  ratePerUnit: number;
  gstPercentage: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  customerInvoiceNumber?: string;
  saleDate: string;
  paymentStatus: SalePaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Sale Payment Types ──────────────────────────────────────────────────────
export const salePaymentSchema = z.object({
  salePublicId:    z.string().min(1, 'Sale is required'),
  paymentDate:     z.string().min(1, 'Payment date is required'),
  amountReceived:  z.number({ invalid_type_error: 'Amount is required' }).positive('Amount received must be greater than zero'),
  paymentMode:     z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  referenceNumber: z.string().max(100).optional(),
  remarks:         z.string().max(500).optional(),
});

export type RequestSalePaymentDTO = z.input<typeof salePaymentSchema>;

export interface ResponseSalePaymentDTO {
  publicId: string;
  paymentNumber?: string;
  referenceNumber?: string;
  amountReceived: number;    // backend field — not 'amount'
  paymentDate: string;
  paymentMode: string;
  remarks?: string;
  createdAt: string;
  // Nested object — no top-level saleNumber or customerName
  sale: {
    publicId: string;
    saleNumber: string;
    customerName: string;
    saleDate: string;
    totalAmount: number;
    receivedAmount: number;
    pendingAmount: number;
    paymentStatus: string;
  };
}

export interface SalePaymentSummaryDTO {
  salePublicId: string;
  saleNumber: string;
  customerName: string;
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
}

export interface PendingSaleDTO {
  publicId: string;
  saleNumber: string;
  customerName: string;
  saleDate: string;
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  paymentStatus?: string;
}
