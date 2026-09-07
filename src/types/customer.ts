import { z } from 'zod';

export const customerAddressSchema = z.object({
  addressLine1: z.string().trim()
    .refine(val => val === '' || (val.length >= 3 && val.length <= 150), {
      message: 'Address line 1 must be between 3 and 150 characters',
    })
    .optional().nullable().or(z.literal('')),
  addressLine2: z.string().trim()
    .refine(val => val === '' || val.length <= 150, {
      message: 'Address line 2 cannot exceed 150 characters',
    })
    .optional().nullable().or(z.literal('')),
  city: z.string().trim()
    .refine(val => val === '' || (val.length >= 2 && val.length <= 100), {
      message: 'City must be between 2 and 100 characters',
    })
    .optional().nullable().or(z.literal('')),
  state: z.string().trim()
    .refine(val => val === '' || (val.length >= 2 && val.length <= 100), {
      message: 'State must be between 2 and 100 characters',
    })
    .optional().nullable().or(z.literal('')),
  country: z.string().trim().max(100).default('India').optional().nullable().or(z.literal('')),
  pincode: z.string().trim()
    .refine(val => val === '' || /^[0-9]{6}$/.test(val), {
      message: 'Pincode must contain exactly 6 digits',
    })
    .optional().nullable().or(z.literal('')),
}).optional().nullable();

export const customerSchema = z.object({
  customerName: z.string().trim()
    .min(2, 'Customer name must be between 2 and 150 characters')
    .max(150, 'Customer name must be between 2 and 150 characters'),
  mobileNumber: z.string().trim()
    .regex(/^[6-9][0-9]{9}$/, 'Mobile number must be a valid 10-digit Indian mobile number'),
  contactPerson: z.string().trim().max(100, 'Contact person cannot exceed 100 characters').optional().nullable().or(z.literal('')),
  alternateMobileNumber: z.string().trim()
    .refine(val => val === '' || /^[6-9][0-9]{9}$/.test(val), {
      message: 'Alternate mobile number must be a valid 10-digit Indian mobile number',
    })
    .optional().nullable().or(z.literal('')),
  email: z.string().trim()
    .refine(val => val === '' || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && val.length <= 150), {
      message: 'Invalid email format (max 150 characters)',
    })
    .optional().nullable().or(z.literal('')),
  gstNumber: z.string().trim()
    .refine(val => val === '' || /^[0-9A-Za-z]{15}$/.test(val), {
      message: 'Invalid GST number',
    })
    .optional().nullable().or(z.literal('')),
  openingBalance: z.number()
    .min(0, 'Opening balance cannot be negative')
    .max(9999999999999.99, 'Opening balance is too large')
    .default(0),
  paymentTerms: z.number().int().min(0).max(365).default(30),
  address: customerAddressSchema,
});

export type RequestCustomerDTO = z.input<typeof customerSchema>;

export interface ResponseCustomerDTO {
  publicId: string;
  customerName: string;
  mobileNumber: string;
  contactPerson?: string;
  alternateMobileNumber?: string;
  email?: string;
  gstNumber?: string;
  openingBalance: number;
  paymentTerms: number;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

