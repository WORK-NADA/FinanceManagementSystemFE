import { z } from 'zod';

export const investmentSchema = z.object({
  partnerPublicId: z.string().min(1, 'Please select an investor partner'),
  investmentDate: z.string().min(1, 'Investment date is required'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a valid number' })
    .positive('Amount must be greater than zero')
    .min(0.01, 'Amount must be at least 0.01'),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export type RequestInvestmentDTO = z.input<typeof investmentSchema>;

export interface ResponseInvestmentDTO {
  publicId: string;
  partnerPublicId: string;
  partnerName: string;
  partnerMobile?: string;
  partnerSharePercentage?: number;
  investmentDate: string;
  amount: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}
