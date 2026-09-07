import { apiClient } from './axios';
import type { RequestUserDTO, RequestUpdateUserDTO, ResponseUserDTO } from '../types/user';

export const getAllClients = async (): Promise<ResponseUserDTO[]> =>
  apiClient.get('/admin/users');

export const registerClient = async (data: RequestUserDTO): Promise<ResponseUserDTO> =>
  apiClient.post('/admin/register', data);

export const getClientByPublicId = async (publicId: string): Promise<ResponseUserDTO> =>
  apiClient.get(`/admin/users/${publicId}`);

export const updateClient = async (publicId: string, data: RequestUpdateUserDTO): Promise<ResponseUserDTO> =>
  apiClient.put(`/admin/users/${publicId}`, data);

export const deactivateClient = async (publicId: string): Promise<void> =>
  apiClient.patch(`/admin/users/${publicId}/deactivate`);

export const reactivateClient = async (publicId: string): Promise<void> =>
  apiClient.patch(`/admin/users/${publicId}/reactivate`);

export const getCurrentUserProfile = async (): Promise<ResponseUserDTO> =>
  apiClient.get('/user/me');

export const updateCurrentUserProfile = async (data: RequestUpdateUserDTO): Promise<ResponseUserDTO> =>
  apiClient.put('/user/me', data);


