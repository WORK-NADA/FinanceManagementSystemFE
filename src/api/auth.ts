import { apiClient } from './axios';
import type { RequestLoginDTO, ResponseLoginDTO } from '../types/auth';

export const login = async (data: RequestLoginDTO): Promise<ResponseLoginDTO> => {
  return apiClient.post('/user/login', data);
};

/**
 * Invalidates the refresh token on the server so it can't be reused.
 * Must be called BEFORE clearing localStorage on logout.
 */
export const logoutApi = async (refreshToken: string): Promise<void> => {
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } catch {
    // Silently swallow errors — the server may be temporarily unavailable
    // or the token may already be expired. Either way, we still clear the client state.
  }
};
