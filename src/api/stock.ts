import { apiClient } from './axios';
import type { 
  RequestStockDTO, 
  ResponseStockDTO, 
  RequestMinimumStockLevelDTO,
  RequestStockTransactionDTO,
  ResponseStockTransactionDTO,
  Page
} from '../types/stock';

export const getStocks = async (): Promise<ResponseStockDTO[]> => {
  return apiClient.get('/stock/all');
};

export const getLowStockItems = async (): Promise<ResponseStockDTO[]> => {
  // Filter from all stocks — backend filters by isLowStock on its side or we filter client-side
  const all: ResponseStockDTO[] = await apiClient.get('/stock/all');
  return all.filter(s => s.isLowStock);
};


export const getActiveStocks = async (): Promise<ResponseStockDTO[]> => {
  return apiClient.get('/stock/active');
};

export const createStock = async (data: RequestStockDTO): Promise<ResponseStockDTO> => {
  return apiClient.post('/stock/add', data);
};

export const updateStock = async (publicId: string, data: RequestStockDTO): Promise<ResponseStockDTO> => {
  return apiClient.put(`/stock/${publicId}`, data);
};

export const updateMinimumStockLevel = async (publicId: string, data: RequestMinimumStockLevelDTO): Promise<ResponseStockDTO> => {
  return apiClient.put(`/stock/${publicId}/minimum-level`, data);
};

export const deactivateStock = async (publicId: string): Promise<void> => {
  return apiClient.patch(`/stock/${publicId}/deactivate`);
};

export const activateStock = async (publicId: string): Promise<void> => {
  return apiClient.patch(`/stock/${publicId}/activate`);
};

export const searchStock = async (rawMaterial: string): Promise<ResponseStockDTO[]> => {
  return apiClient.get(`/stock/search?rawMaterial=${encodeURIComponent(rawMaterial)}`);
};

// Stock Transactions
export interface StockTransactionFilters {
  page?: number;
  size?: number;
  stockId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  referenceNumber?: string;
}

export const getStockTransactions = async (filters: StockTransactionFilters = {}): Promise<Page<ResponseStockTransactionDTO>> => {
  const { page = 0, size = 20, ...rest } = filters;
  const query = new URLSearchParams({ page: page.toString(), size: size.toString() });
  
  Object.entries(rest).forEach(([key, value]) => {
    if (value) query.append(key, value);
  });
  
  return apiClient.get(`/stock-transaction/all?${query.toString()}`);
};

export const createStockAdjustment = async (data: RequestStockTransactionDTO): Promise<ResponseStockTransactionDTO> => {
  return apiClient.post('/stock-transaction/adjustment', data);
};
