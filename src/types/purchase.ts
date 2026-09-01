import { z } from 'zod';

// ── Purchase Types ──────────────────────────────────────────────────────────
export const purchaseItemSchema = z.object({
  stockPublicId: z.string().min(1, 'Stock item is required'),
  quantity: z.number().positive('Quantity must be positive'),
  pricePerUnit: z.number().positive('Price must be positive'),
});

export const purchaseSchema = z.object({
  supplierPublicId: z.string().min(1, 'Supplier is required'),
  purchaseDate: z.string().min(1, 'Date is required'),
  invoiceNumber: z.string().max(100).optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item required'),
  remarks: z.string().max(255).optional(),
});

export type RequestPurchaseDTO = z.input<typeof purchaseSchema>;

export interface PurchaseItemResponse {
  publicId: string;
  stockPublicId: string;
  rawMaterial: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
}

export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

export interface ResponsePurchaseDTO {
  publicId: string;
  purchaseNumber: string;
  supplierPublicId: string;
  supplierName: string;
  purchaseDate: string;
  invoiceNumber?: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: PaymentStatus;
  items: PurchaseItemResponse[];
  remarks?: string;
  createdAt: string;
}

// ── Purchase Payment Types ──────────────────────────────────────────────────
export const purchasePaymentSchema = z.object({
  purchasePublicId: z.string().min(1, 'Purchase is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  referenceNumber: z.string().max(100).optional(),
  remarks: z.string().max(255).optional(),
});

export type RequestPurchasePaymentDTO = z.input<typeof purchasePaymentSchema>;

export interface ResponsePurchasePaymentDTO {
  publicId: string;
  purchasePublicId: string;
  purchaseNumber?: string;
  supplierName: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  remarks?: string;
  createdAt: string;
}

export interface PurchasePaymentSummaryDTO {
  purchasePublicId: string;
  purchaseNumber: string;
  supplierName: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface PendingPurchaseDTO {
  publicId: string;
  purchaseNumber: string;
  supplierName: string;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}
