import { z } from 'zod';

export const expenseSchema = z.object({
  expenseDate: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER']),
  description: z.string().max(500).optional(),
  referenceNumber: z.string().max(100).optional(),
});

export type RequestExpenseDTO = z.input<typeof expenseSchema>;

export interface ResponseExpenseDTO {
  publicId: string;
  expenseDate: string;
  category: string;
  amount: number;
  paymentMode: string;
  description?: string;
  referenceNumber?: string;
  createdAt: string;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  totalAmount: number;
}
