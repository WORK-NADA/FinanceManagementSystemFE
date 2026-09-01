import { apiClient } from './axios';
import type { RequestSupplierDTO, ResponseSupplierDTO } from '../types/supplier';

export const getSuppliers = async (): Promise<ResponseSupplierDTO[]> => {
  return apiClient.get('/supplier/all');
};

export const getSupplier = async (publicId: string): Promise<ResponseSupplierDTO> => {
  return apiClient.get(`/supplier/${publicId}`);
};

export const createSupplier = async (data: RequestSupplierDTO): Promise<ResponseSupplierDTO> => {
  return apiClient.post('/supplier/add', data);
};

export const updateSupplier = async (publicId: string, data: RequestSupplierDTO): Promise<ResponseSupplierDTO> => {
  return apiClient.put(`/supplier/${publicId}`, data);
};

export const deactivateSupplier = async (publicId: string): Promise<void> => {
  return apiClient.patch(`/supplier/${publicId}/deactivate`);
};

export const reactivateSupplier = async (publicId: string): Promise<void> => {
  return apiClient.patch(`/supplier/${publicId}/reactivate`);
};
