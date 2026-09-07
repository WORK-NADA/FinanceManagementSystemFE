import { apiClient } from './axios';
import type { 
  RequestPartnerDTO, 
  ResponsePartnerDTO, 
  RequestProfitDistributionDTO, 
  ResponseProfitDistributionDTO, 
  PartnerHistoryDTO,
  LiveProfitSharingOverviewDTO,
  RequestProfitWithdrawalDTO,
  ResponseProfitWithdrawalDTO
} from '../types/partner';

export const getPartners = async (): Promise<ResponsePartnerDTO[]> =>
  apiClient.get('/partner/all');

export const createPartner = async (data: RequestPartnerDTO): Promise<ResponsePartnerDTO> =>
  apiClient.post('/partner/add', data);

export const updatePartner = async (id: string, data: RequestPartnerDTO): Promise<ResponsePartnerDTO> =>
  apiClient.put(`/partner/${id}`, data);

export const deactivatePartner = async (id: string): Promise<void> =>
  apiClient.patch(`/partner/${id}/deactivate`);

export const reactivatePartner = async (id: string): Promise<void> =>
  apiClient.patch(`/partner/${id}/reactivate`); // Assume reactivate based on supplier pattern

// ── Profit Distribution ───────────────────────────────────────────────────────

export const getProfitDistributions = async (): Promise<ResponseProfitDistributionDTO[]> =>
  apiClient.get('/profit-distribution/all');

export const getLatestProfitDistribution = async (): Promise<ResponseProfitDistributionDTO> =>
  apiClient.get('/profit-distribution/latest');

export const previewProfitDistribution = async (data: RequestProfitDistributionDTO): Promise<ResponseProfitDistributionDTO> =>
  apiClient.post('/profit-distribution/preview', data);

export const distributeProfit = async (data: RequestProfitDistributionDTO): Promise<ResponseProfitDistributionDTO> =>
  apiClient.post('/profit-distribution/distribute', data);

export const getPartnerHistory = async (partnerPublicId: string): Promise<PartnerHistoryDTO[]> =>
  apiClient.get(`/profit-distribution/partner/${partnerPublicId}/history`);

export const getLifetimeEarnings = async (partnerPublicId: string): Promise<number> =>
  apiClient.get(`/profit-distribution/partner/${partnerPublicId}/lifetime-earnings`);

export const getLiveProfitOverview = async (): Promise<LiveProfitSharingOverviewDTO> =>
  apiClient.get('/profit-distribution/live-overview');

export const recordProfitWithdrawal = async (data: RequestProfitWithdrawalDTO): Promise<ResponseProfitWithdrawalDTO> =>
  apiClient.post('/profit-distribution/withdraw', data);

export const getProfitWithdrawals = async (params?: { fromDate?: string; toDate?: string }): Promise<ResponseProfitWithdrawalDTO[]> =>
  apiClient.get('/profit-distribution/withdrawals', { params });

export const deleteProfitWithdrawal = async (publicId: string): Promise<void> =>
  apiClient.delete(`/profit-distribution/withdrawals/${publicId}`);

