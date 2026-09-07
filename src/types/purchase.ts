import { z } from 'zod';

// ── Purchase Types ──────────────────────────────────────────────────────────

export const WEIGHT_UNITS = ['G', 'KG', 'TON'] as const;
export type WeightUnit = typeof WEIGHT_UNITS[number];

export const purchaseSchema = z.object({
  supplierPublicId:      z.string().min(1, 'Supplier is required'),
  rawMaterial:           z.string().min(2, 'Raw material name is required (min 2 chars)').max(100),
  weight:                z.number({ invalid_type_error: 'Weight is required' }).min(0.001, 'Weight must be at least 0.001'),
  unit:                  z.enum(WEIGHT_UNITS, { required_error: 'Unit is required' }),
  ratePerUnit:           z.number({ invalid_type_error: 'Rate per unit is required' }).positive('Rate per unit must be greater than zero'),
  gstPercentage:         z.number({ invalid_type_error: 'GST % is required' }).min(0, 'GST cannot be negative').max(100, 'GST cannot exceed 100'),
  supplierInvoiceNumber: z.string().max(50).optional(),
  purchaseDate:          z.string().min(1, 'Purchase date is required'),
});

export type RequestPurchaseDTO = z.infer<typeof purchaseSchema>;

export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'COMPLETED' | 'PAID';
export type PurchaseStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

/**
 * Checks if a purchase is fully paid based on payment status or outstanding balance.
 */
export const isPurchaseFullyPaid = (paymentStatus?: string, pendingAmount?: number): boolean => {
  if (paymentStatus) {
    const s = paymentStatus.toUpperCase();
    if (s === 'COMPLETED' || s === 'PAID') return true;
  }
  if (pendingAmount !== undefined && pendingAmount <= 0) {
    return true;
  }
  return false;
};

export interface SupplierDetails {
  publicId: string;
  supplierName: string;
  mobileNumber?: string;
  email?: string;
  gstNumber?: string;
}

export interface ResponsePurchaseDTO {
  publicId: string;
  purchaseNumber: string;
  // Supplier is a nested object — read supplier.supplierName, NOT p.supplierName
  supplier: SupplierDetails;
  rawMaterial: string;
  weight: number;
  unit: 'G' | 'KG' | 'TON';
  ratePerUnit: number;
  gstPercentage: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  supplierInvoiceNumber?: string;
  purchaseDate: string;
  purchaseStatus: PurchaseStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Purchase Payment Types ──────────────────────────────────────────────────
export const purchasePaymentSchema = z.object({
  purchasePublicId: z.string().min(1, 'Purchase is required'),
  paymentDate:      z.string().min(1, 'Payment date is required'),
  amountPaid:       z.number({ invalid_type_error: 'Payment amount is required' }).positive('Payment amount must be greater than zero'),
  paymentMode:      z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  referenceNumber:  z.string().max(100).optional(),
  remarks:          z.string().max(500).optional(),
});

export type RequestPurchasePaymentDTO = z.input<typeof purchasePaymentSchema>;

export interface ResponsePurchasePaymentDTO {
  publicId: string;
  paymentNumber?: string;
  referenceNumber?: string;
  amountPaid: number;          // backend field is amountPaid, not amount
  paymentDate: string;
  paymentMode: string;
  remarks?: string;
  createdAt: string;
  // Nested object — no top-level supplierName or purchaseNumber
  purchase: {
    publicId: string;
    purchaseNumber: string;
    supplierName: string;      // added in backend fix
    purchaseDate: string;      // added in backend fix
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paymentStatus: PaymentStatus;
  };
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
  // Matches backend ResponsePurchasePaymentDTO.PurchaseDetails
  publicId: string;
  purchaseNumber: string;
  supplierName: string;   // now populated by backend fix
  purchaseDate: string;   // now populated by backend fix
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: PaymentStatus;
}
