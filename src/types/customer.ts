import { z } from 'zod';

export const addressSchema = z.object({
  addressLine1: z.string().min(3, 'Required, min 3 chars').max(150),
  addressLine2: z.string().max(150).optional().nullable(),
  city: z.string().min(2, 'Required').max(100),
  state: z.string().min(2, 'Required').max(100),
  country: z.string().min(2, 'Required').max(100).default('India'),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Must be 6 digits'),
});

export const customerSchema = z.object({
  customerName: z.string().min(2, 'Min 2 characters').max(150),
  mobileNumber: z.string().regex(/^[6-9][0-9]{9}$/, 'Valid 10-digit mobile number starting with 6-9 required'),
  contactPerson: z.string().max(100).optional().nullable(),
  alternateMobileNumber: z.string().regex(/^[6-9][0-9]{9}$/, 'Must be 10 digits').optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(150),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Invalid GSTIN format'),
  openingBalance: z.number().min(0, 'Must be positive'),
  paymentTerms: z.number().int().min(0).max(365),
  address: addressSchema,
});

export type RequestCustomerDTO = z.input<typeof customerSchema>;

export interface ResponseCustomerDTO {
  publicId: string;
  customerName: string;
  mobileNumber: string;
  contactPerson?: string;
  alternateMobileNumber?: string;
  email: string;
  gstNumber: string;
  openingBalance: number;
  paymentTerms: number;
  address: {
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
