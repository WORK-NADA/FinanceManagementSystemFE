import { z } from 'zod';
import { addressSchema } from './customer';

export const supplierSchema = z.object({
  supplierName: z.string().min(2, 'Min 2 characters').max(150),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Valid 10-digit mobile number required'),
  contactPerson: z.string().max(100).optional().nullable(),
  alternateMobileNumber: z.string().regex(/^[0-9]{10}$/, 'Must be 10 digits').optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(150).optional().or(z.literal('')),
  gstNumber: z.string().regex(/^[0-9A-Z]{15}$/, 'Invalid GSTIN format').optional().or(z.literal('')),
  openingBalance: z.number().min(0, 'Must be positive').default(0),
  paymentTerms: z.number().int().min(0).default(30),
  address: addressSchema.optional(),
});

export type RequestSupplierDTO = z.input<typeof supplierSchema>;

export interface ResponseSupplierDTO {
  publicId: string;
  supplierName: string;
  mobileNumber: string;
  contactPerson?: string;
  alternateMobileNumber?: string;
  email?: string;
  gstNumber?: string;
  openingBalance: number;
  paymentTerms: number;
  address?: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
