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

export const searchStock = async (query: string): Promise<ResponseStockDTO[]> => {
  return apiClient.get(`/stock/search?query=${encodeURIComponent(query)}&rawMaterial=${encodeURIComponent(query)}`);
};

// Stock Transactions
export interface StockTransactionFilters {
  page?: number;
  size?: number;
  stockId?: string;
  stockPublicId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  referenceNumber?: string;
}

export const getStockTransactions = async (filters: StockTransactionFilters = {}): Promise<Page<ResponseStockTransactionDTO>> => {
  const { page = 0, size = 20, stockId, stockPublicId, type, startDate, endDate, fromDate, toDate, referenceNumber } = filters;
  const query = new URLSearchParams({ page: page.toString(), size: size.toString() });

  const resolvedStock = stockPublicId || stockId;
  if (resolvedStock) query.append('stockPublicId', resolvedStock);
  if (type) query.append('type', type);
  if (referenceNumber) query.append('referenceNumber', referenceNumber);
  const resolvedFrom = fromDate || startDate;
  if (resolvedFrom) query.append('fromDate', resolvedFrom);
  const resolvedTo = toDate || endDate;
  if (resolvedTo) query.append('toDate', resolvedTo);

  return apiClient.get(`/stock-transaction/all?${query.toString()}`);
};

export const createStockAdjustment = async (data: RequestStockTransactionDTO): Promise<ResponseStockTransactionDTO> => {
  return apiClient.post('/stock-transaction/adjustment', data);
};
