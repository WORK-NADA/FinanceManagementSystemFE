import { apiClient } from './axios';
import type {
  RequestSaleDTO,
  ResponseSaleDTO,
  RequestSalePaymentDTO,
  ResponseSalePaymentDTO,
  SalePaymentSummaryDTO,
  PendingSaleDTO,
} from '../types/sale';
import type { Page } from '../types/stock';

// ── Sales ───────────────────────────────────────────────────────────────────
export interface SaleFilters {
  page?: number;
  size?: number;
  customerPublicId?: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}

export const getSales = async (filters: SaleFilters | number = {}, size?: number): Promise<Page<ResponseSaleDTO>> => {
  // Back-compat: Reports.tsx calls getSales(0, 100)
  if (typeof filters === 'number') {
    return apiClient.get(`/sale/all?page=${filters}&size=${size ?? 20}`);
  }
  const { page = 0, size: sz = 15, customerPublicId, startDate, endDate, fromDate, toDate, status } = filters;
  const params = new URLSearchParams({ page: String(page), size: String(sz) });
  if (customerPublicId) params.append('customerPublicId', customerPublicId);
  const resolvedFrom = fromDate || startDate;
  if (resolvedFrom) params.append('fromDate', resolvedFrom);
  const resolvedTo = toDate || endDate;
  if (resolvedTo) params.append('toDate', resolvedTo);
  if (status) params.append('status', status);
  return apiClient.get(`/sale/all?${params}`);
};

export const getSale = async (id: string): Promise<ResponseSaleDTO> =>
  apiClient.get(`/sale/${id}`);

export const createSale = async (data: RequestSaleDTO): Promise<ResponseSaleDTO> =>
  apiClient.post('/sale/add', data);

export const updateSale = async (publicId: string, data: RequestSaleDTO): Promise<ResponseSaleDTO> =>
  apiClient.put(`/sale/${publicId}`, data);

export const deleteSale = async (publicId: string): Promise<void> =>
  apiClient.delete(`/sale/${publicId}`);

// ── Sale Payments ───────────────────────────────────────────────────────────
export const getSalePayments = async (page = 0, size = 15): Promise<Page<ResponseSalePaymentDTO>> =>
  apiClient.get(`/sale-payment/all?page=${page}&size=${size}`);

export const getSalePaymentSummary = async (saleId: string): Promise<SalePaymentSummaryDTO> =>
  apiClient.get(`/sale-payment/sale/${saleId}/summary`);

export const getPaymentsBySale = async (saleId: string): Promise<ResponseSalePaymentDTO[]> =>
  apiClient.get(`/sale-payment/sale/${saleId}`);

export const getPendingSalePayments = async (): Promise<PendingSaleDTO[]> =>
  apiClient.get('/sale-payment/pending');

export const getPendingSalePaymentsByCustomer = async (customerId: string): Promise<PendingSaleDTO[]> =>
  apiClient.get(`/sale-payment/pending/customer/${customerId}`);

export const getReceivableTotal = async (): Promise<number> =>
  apiClient.get('/sale-payment/receivable-total');

export const createSalePayment = async (data: RequestSalePaymentDTO): Promise<ResponseSalePaymentDTO> =>
  apiClient.post('/sale-payment/add', data);
