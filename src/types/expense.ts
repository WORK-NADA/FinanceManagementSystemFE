import { z } from 'zod';

export const expenseSchema = z.object({
  expenseDate: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required').max(100),
  amount: z.number({ invalid_type_error: 'Amount is required' }).positive('Amount must be positive'),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI']),
  description: z.string().max(255, 'Description cannot exceed 255 characters').optional().or(z.literal('')),
  referenceNumber: z.string().max(100, 'Reference number cannot exceed 100 characters').optional().or(z.literal('')),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const isOther = data.category?.trim().toUpperCase() === 'OTHER';
  if (isOther) {
    if (!data.description || data.description.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Description is required when category is Other',
      });
    }
  }
});

export type RequestExpenseDTO = z.input<typeof expenseSchema>;

export interface ResponseExpenseDTO {
  publicId: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  amount: number;
  paymentMode: string;
  description?: string;
  referenceNumber?: string;
  remarks?: string;
  createdAt: string;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  totalAmount: number;
}
