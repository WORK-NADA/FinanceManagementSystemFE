import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResponseLoginDTO } from '../types/auth';

interface AuthState {
  user: Omit<ResponseLoginDTO, 'accessToken' | 'refreshToken'> | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data: ResponseLoginDTO) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (data) => {
        const { accessToken, refreshToken, ...user } = data;
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      updateTokens: (accessToken, refreshToken) => {
        set((state) => ({
          accessToken,
          refreshToken: refreshToken || state.refreshToken,
        }));
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
