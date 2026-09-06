import { z } from 'zod';

export const stockSchema = z.object({
  rawMaterial: z.string().min(2, 'Min 2 characters').max(150),
  unit: z.enum(['G', 'KG', 'TON']),
  minimumStockLevel: z.number().min(0, 'Must be non-negative'),
});

export type RequestStockDTO = z.infer<typeof stockSchema>;

export const minimumStockLevelSchema = z.object({
  minimumStockLevel: z.number().min(0, 'Must be non-negative'),
});
export type RequestMinimumStockLevelDTO = z.infer<typeof minimumStockLevelSchema>;

export interface ResponseStockDTO {
  publicId: string;
  rawMaterial: string;
  unit: 'G' | 'KG' | 'TON';
  currentQuantity: number;
  minimumStockLevel: number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const StockTransactionType = {
  PURCHASE_IN: 'PURCHASE_IN',
  SALE_OUT: 'SALE_OUT',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  CANCEL_PURCHASE_OUT: 'CANCEL_PURCHASE_OUT',
  CANCEL_SALE_IN: 'CANCEL_SALE_IN',
} as const;

export type StockTransactionType = typeof StockTransactionType[keyof typeof StockTransactionType];

export const stockTransactionSchema = z.object({
  stockPublicId: z.string().uuid(),
  transactionType: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT']),
  quantity: z.number().positive('Quantity must be greater than zero'),
  remarks: z.string().max(255).optional(),
});
export type RequestStockTransactionDTO = z.infer<typeof stockTransactionSchema>;

export interface ResponseStockTransactionDTO {
  publicId: string;
  stockPublicId: string;
  rawMaterial: string;
  transactionType: StockTransactionType;
  quantity: number;
  unit: string;
  referenceNumber: string;
  transactionDate: string;
  remarks?: string;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
