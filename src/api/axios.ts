import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Simple debounce for error toasts to prevent stacking multiple identical errors
let lastErrorTime = 0;
let lastErrorMessage = '';
const showErrorToast = (message: string) => {
  const now = Date.now();
  if (message !== lastErrorMessage || now - lastErrorTime > 3000) {
    toast.error(message);
    lastErrorMessage = message;
    lastErrorTime = now;
  }
};

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle data unwrapping and token refresh
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the { msg, data } envelope
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and specific ACCESS_TOKEN_EXPIRED code
    if (
      error.response?.status === 401 &&
      (error.response.data as any)?.code === 'ACCESS_TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const { refreshToken, updateTokens, logout } = useAuthStore.getState();
        if (!refreshToken) {
          logout();
          return Promise.reject(error);
        }

        // Call refresh endpoint directly with axios to avoid interceptor loop
        const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        // Unwrap if necessary (depending on backend implementation of /auth/refresh)
        const data = refreshResponse.data.data || refreshResponse.data;
        const newAccessToken = data.accessToken;

        updateTokens(newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Retry the original request with the new token
        // But we need to make sure we still unwrap its response correctly, so we use apiClient
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, log user out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    // Return the actual response data for other errors so components can read code, message, fieldErrors
    if (error.response?.data) {
      const apiError = error.response.data as any;
      if (apiError.message) {
        showErrorToast(apiError.message);
      }
      
      if (error.response.status === 403) {
        window.location.href = '/unauthorized';
      }

      return Promise.reject(apiError);
    }
    
    showErrorToast(error.message || 'An unexpected error occurred.');
    return Promise.reject(error);
  }
);
