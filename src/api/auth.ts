import { apiClient } from './axios';
import type { RequestLoginDTO, ResponseLoginDTO } from '../types/auth';

export const login = async (data: RequestLoginDTO): Promise<ResponseLoginDTO> => {
  return apiClient.post('/user/login', data);
};
