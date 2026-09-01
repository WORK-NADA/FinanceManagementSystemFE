import { apiClient } from './axios';
import type { RequestUserDTO, ResponseUserDTO } from '../types/user';

export const getAllClients = async (): Promise<ResponseUserDTO[]> =>
  apiClient.get('/admin/users');

export const registerClient = async (data: RequestUserDTO): Promise<ResponseUserDTO> =>
  apiClient.post('/admin/register', data);
