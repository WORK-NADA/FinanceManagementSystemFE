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
}

export const getSales = async (filters: SaleFilters | number = {}, size?: number): Promise<Page<ResponseSaleDTO>> => {
  // Back-compat: Reports.tsx calls getSales(0, 100)
  if (typeof filters === 'number') {
    return apiClient.get(`/sale/all?page=${filters}&size=${size ?? 20}`);
  }
  const { page = 0, size: sz = 15, customerPublicId, startDate, endDate } = filters;
  if (customerPublicId) {
    return apiClient.get(`/sale/customer/${customerPublicId}?page=${page}&size=${sz}`);
  }
  const params = new URLSearchParams({ page: String(page), size: String(sz) });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return apiClient.get(`/sale/all?${params}`);
};

export const getSale = async (id: string): Promise<ResponseSaleDTO> =>
  apiClient.get(`/sale/${id}`);

export const createSale = async (data: RequestSaleDTO): Promise<ResponseSaleDTO> =>
  apiClient.post('/sale/add', data);

export const updateSale = async (publicId: string, data: RequestSaleDTO): Promise<ResponseSaleDTO> =>
  apiClient.put(`/sale/${publicId}`, data);

// ── Sale Payments ───────────────────────────────────────────────────────────
export const getSalePayments = async (page = 0, size = 15): Promise<Page<ResponseSalePaymentDTO>> =>
  apiClient.get(`/sale-payment/all?page=${page}&size=${size}`);

export const getSalePaymentSummary = async (saleId: string): Promise<SalePaymentSummaryDTO> =>
  apiClient.get(`/sale-payment/sale/${saleId}/summary`);

export const getPendingSalePayments = async (): Promise<PendingSaleDTO[]> =>
  apiClient.get('/sale-payment/pending');

export const getPendingSalePaymentsByCustomer = async (customerId: string): Promise<PendingSaleDTO[]> =>
  apiClient.get(`/sale-payment/pending/customer/${customerId}`);

export const getReceivableTotal = async (): Promise<number> =>
  apiClient.get('/sale-payment/receivable-total');

export const createSalePayment = async (data: RequestSalePaymentDTO): Promise<ResponseSalePaymentDTO> =>
  apiClient.post('/sale-payment/add', data);
