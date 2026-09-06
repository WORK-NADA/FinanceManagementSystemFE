import { apiClient } from './axios';
import type { DashboardSummaryDTO } from '../types/dashboard';

export const getDashboardSummary = async (): Promise<DashboardSummaryDTO> => {
  return apiClient.get('/dashboard');
};

export const updateOpeningBalance = async (openingBalance: number): Promise<DashboardSummaryDTO> => {
  return apiClient.put('/dashboard/opening-balance', { openingBalance });
};

