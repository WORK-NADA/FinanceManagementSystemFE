import { apiClient } from './axios';
import type { RequestCustomerDTO, ResponseCustomerDTO } from '../types/customer';

export const getCustomers = async (): Promise<ResponseCustomerDTO[]> => {
  return apiClient.get('/customer/all');
};

export const getActiveCustomers = async (): Promise<ResponseCustomerDTO[]> => {
  return apiClient.get('/customer/active');
};

export const getCustomer = async (publicId: string): Promise<ResponseCustomerDTO> => {
  return apiClient.get(`/customer/${publicId}`);
};

export const createCustomer = async (data: RequestCustomerDTO): Promise<ResponseCustomerDTO> => {
  return apiClient.post('/customer/add', data);
};

export const updateCustomer = async (publicId: string, data: RequestCustomerDTO): Promise<ResponseCustomerDTO> => {
  return apiClient.put(`/customer/${publicId}`, data);
};

export const deactivateCustomer = async (publicId: string): Promise<void> => {
  return apiClient.patch(`/customer/${publicId}/deactivate`);
};

export const reactivateCustomer = async (publicId: string): Promise<void> => {
  return apiClient.patch(`/customer/${publicId}/reactivate`);
};
