import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export type RequestLoginDTO = z.infer<typeof loginSchema>;

export interface ResponseLoginDTO {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  publicId: string;
  ownerName: string;
  userName: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  firstLogin: boolean;
  loginTime: string;
}

export interface RequestRefreshTokenDTO {
  refreshToken: string;
}

export interface ResponseRefreshTokenDTO {
  accessToken: string;
}
