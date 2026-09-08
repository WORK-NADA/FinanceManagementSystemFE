import { z } from 'zod';

export const requestUserAddressSchema = z.object({
  houseNo: z.string().min(1, 'House number is required').max(20),
  societyName: z.string().min(2, 'Society name is required').max(100),
  area: z.string().min(2, 'Area is required').max(100),
  city: z.string().min(2, 'City is required').max(100),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Pincode must be a valid 6-digit Indian pincode'),
  state: z.string().min(2, 'State is required').max(100),
  // country has no @NotBlank on the backend — it is genuinely optional
  country: z.string().max(100).optional().or(z.literal('')),
});

export const requestUserSchema = z.object({
  ownerName: z.string()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name must be at most 100 characters')
    .regex(/^[a-zA-Z]+(?: [a-zA-Z]+)*$/, 'Owner name can only contain letters and single spaces'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    // Backend: ^[A-Za-z][A-Za-z0-9._ ]*$ — must start with letter, allows letters/numbers/dots/underscores/spaces
    .regex(/^[A-Za-z][A-Za-z0-9._ ]*$/, 'Username must start with a letter and can contain letters, numbers, dots, underscores, and spaces'),
  email: z.string().email('Invalid email address').max(100, 'Email cannot exceed 100 characters'),
  password: z.string()
    .regex(
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\S+$).{8,20}$/,
      'Password must be 8-20 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character (@#$%^&+=!)'
    ),
  // Backend: ^[6-9][0-9]{9}$ — valid Indian mobile number starting with 6-9
  mobileNumber: z.string().regex(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6-9)'),
  role: z.enum(['CLIENT', 'ADMIN']),
  userAddress: requestUserAddressSchema,
});

export const requestUpdateUserSchema = z.object({
  ownerName: z.string()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name must be at most 100 characters')
    .regex(/^[a-zA-Z]+(?: [a-zA-Z]+)*$/, 'Owner name can only contain letters and single spaces'),
  email: z.string().email('Invalid email address').max(100, 'Email cannot exceed 100 characters'),
  mobileNumber: z.string().regex(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6-9)'),
  userAddress: requestUserAddressSchema,
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.newPassword && data.newPassword.trim().length > 0) {
    return /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\S+$).{8,20}$/.test(data.newPassword.trim());
  }
  return true;
}, {
  message: 'Password must be 8-20 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character (@#$%^&+=!)',
  path: ['newPassword'],
});

export const profileEditSchema = z.object({
  ownerName: z.string()
    .min(2, 'Owner name must be at least 2 characters')
    .max(100, 'Owner name must be at most 100 characters')
    .regex(/^[a-zA-Z]+(?: [a-zA-Z]+)*$/, 'Owner name can only contain letters and single spaces'),
  email: z.string().email('Invalid email address').max(100, 'Email cannot exceed 100 characters'),
  mobileNumber: z.string().regex(/^[6-9][0-9]{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6-9)'),
  userAddress: requestUserAddressSchema,
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.newPassword && data.newPassword.trim().length > 0) {
    return !!data.currentPassword && data.currentPassword.trim().length > 0;
  }
  return true;
}, {
  message: 'Current password is required to change your password',
  path: ['currentPassword'],
}).refine((data) => {
  if (data.newPassword && data.newPassword.trim().length > 0) {
    return /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\S+$).{8,20}$/.test(data.newPassword.trim());
  }
  return true;
}, {
  message: 'Password must be 8-20 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character (@#$%^&+=!)',
  path: ['newPassword'],
}).refine((data) => {
  if (data.newPassword && data.newPassword.trim().length > 0) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: 'New passwords do not match',
  path: ['confirmPassword'],
});

export type RequestUserAddressDTO = z.infer<typeof requestUserAddressSchema>;
export type RequestUserDTO = z.infer<typeof requestUserSchema>;
export type RequestUpdateUserDTO = z.infer<typeof requestUpdateUserSchema>;
export type ProfileEditDTO = z.infer<typeof profileEditSchema>;

export interface ResponseUserAddressDTO {
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
  viewablePassword?: string;
}
