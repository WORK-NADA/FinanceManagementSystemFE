import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ResponseLoginDTO } from '../types/auth';

interface AuthState {
  user: Omit<ResponseLoginDTO, 'accessToken' | 'refreshToken'> | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  profilePicture: string | null;
  setAuth: (data: ResponseLoginDTO) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  updateUser: (updatedUser: Partial<Omit<ResponseLoginDTO, 'accessToken' | 'refreshToken'>>) => void;
  setProfilePicture: (pic: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      profilePicture: null,

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

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },

      setProfilePicture: (pic) => {
        set({ profilePicture: pic });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, profilePicture: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
