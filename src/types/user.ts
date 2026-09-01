import { z } from 'zod';

export const requestUserAddressSchema = z.object({
  houseNo: z.string().min(1, 'House number is required').max(50),
  societyName: z.string().min(1, 'Society name is required').max(100),
  area: z.string().min(1, 'Area is required').max(100),
  city: z.string().min(1, 'City is required').max(50),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits'),
  state: z.string().min(1, 'State is required').max(50),
  country: z.string().min(1, 'Country is required').max(50),
});

export const requestUserSchema = z.object({
  ownerName: z.string()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name must be at most 100 characters')
    .regex(/^[a-zA-Z]+(?: [a-zA-Z]+)*$/, 'Owner name can only contain letters and single spaces'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Username can only contain alphanumeric characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .regex(
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\S+$).{8,20}$/,
      'Password must be 8-20 characters long, containing at least one digit, one lowercase letter, one uppercase letter, one special character (@#$%^&+=!), and no whitespace'
    ),
  mobileNumber: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be exactly 10 digits'),
  role: z.enum(['CLIENT', 'ADMIN']),
  userAddress: requestUserAddressSchema,
});

export type RequestUserAddressDTO = z.infer<typeof requestUserAddressSchema>;
export type RequestUserDTO = z.infer<typeof requestUserSchema>;

export interface ResponseUserAddressDTO {
  id: string;
  houseNo: string;
  societyName: string;
  area: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
}

export interface ResponseUserDTO {
  publicId: string;
  ownerName: string;
  username: string;
  email: string;
  mobileNumber: string;
  role: 'CLIENT' | 'ADMIN';
  enabled: boolean;
  createdAt: string;
  userAddress?: ResponseUserAddressDTO;
}
