import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .regex(
      /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!])(?=\S+$).{8,20}$/,
      'Password must be 8-20 characters long, containing at least one digit, one lowercase letter, one uppercase letter, one special character (@#$%^&+=!), and no whitespace'
    ),
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
