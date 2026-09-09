import { apiClient } from './axios';
import type { RequestInvestmentDTO, ResponseInvestmentDTO } from '../types/investment';

export const getInvestments = async (): Promise<ResponseInvestmentDTO[]> =>
  apiClient.get('/investment/all');

export const getInvestmentById = async (publicId: string): Promise<ResponseInvestmentDTO> =>
  apiClient.get(`/investment/${publicId}`);

export const createInvestment = async (data: RequestInvestmentDTO): Promise<ResponseInvestmentDTO> =>
  apiClient.post('/investment/add', data);

export const updateInvestment = async (publicId: string, data: RequestInvestmentDTO): Promise<ResponseInvestmentDTO> =>
  apiClient.put(`/investment/${publicId}`, data);

export const deleteInvestment = async (publicId: string): Promise<void> =>
  apiClient.delete(`/investment/${publicId}`);

export const getTotalInvestments = async (): Promise<number> =>
  apiClient.get('/investment/total');
