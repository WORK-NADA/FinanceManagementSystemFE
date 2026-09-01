import { apiClient } from './axios';
import type { DashboardSummaryDTO } from '../types/dashboard';

export const getDashboardSummary = async (): Promise<DashboardSummaryDTO> => {
  return apiClient.get('/dashboard');
};
