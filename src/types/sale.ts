import { z } from 'zod';

// ── Sale Types ──────────────────────────────────────────────────────────────
export const saleItemSchema = z.object({
  stockPublicId: z.string().min(1, 'Stock item is required'),
  quantity: z.number().positive('Quantity must be positive'),
  pricePerUnit: z.number().positive('Price must be positive'),
});

export const saleSchema = z.object({
  customerPublicId: z.string().min(1, 'Customer is required'),
  saleDate: z.string().min(1, 'Date is required'),
  invoiceNumber: z.string().max(100).optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item required'),
  remarks: z.string().max(255).optional(),
});

export type RequestSaleDTO = z.input<typeof saleSchema>;

export interface SaleItemResponse {
  publicId: string;
  stockPublicId: string;
  rawMaterial: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export type SalePaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

export interface ResponseSaleDTO {
  publicId: string;
  saleNumber: string;
  customerPublicId: string;
  customerName: string;
  saleDate: string;
  invoiceNumber?: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  paymentStatus: SalePaymentStatus;
  items: SaleItemResponse[];
  remarks?: string;
  createdAt: string;
}

// ── Sale Payment Types ──────────────────────────────────────────────────────
export const salePaymentSchema = z.object({
  salePublicId: z.string().min(1, 'Sale is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  referenceNumber: z.string().max(100).optional(),
  remarks: z.string().max(255).optional(),
});

export type RequestSalePaymentDTO = z.input<typeof salePaymentSchema>;

export interface ResponseSalePaymentDTO {
  publicId: string;
  salePublicId: string;
  saleNumber?: string;
  customerName: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
  createdAt: string;
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
}
