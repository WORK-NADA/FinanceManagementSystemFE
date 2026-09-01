import { apiClient } from './axios';
import type {
  RequestPurchaseDTO,
  ResponsePurchaseDTO,
  RequestPurchasePaymentDTO,
  ResponsePurchasePaymentDTO,
  PurchasePaymentSummaryDTO,
  PendingPurchaseDTO,
} from '../types/purchase';
import type { Page } from '../types/stock';

// ── Purchases ──────────────────────────────────────────────────────────────
export interface PurchaseFilters {
  page?: number;
  size?: number;
  supplierPublicId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export const getPurchases = async (filters: PurchaseFilters = {}): Promise<Page<ResponsePurchaseDTO>> => {
  const { page = 0, size = 15, supplierPublicId, startDate, endDate, status } = filters;
  if (supplierPublicId) {
    return apiClient.get(`/purchase/supplier/${supplierPublicId}?page=${page}&size=${size}`);
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (status) params.append('status', status);
  return apiClient.get(`/purchase/all?${params}`);
};

export const getPurchase = async (id: string): Promise<ResponsePurchaseDTO> =>
  apiClient.get(`/purchase/${id}`);

export const createPurchase = async (data: RequestPurchaseDTO): Promise<ResponsePurchaseDTO> =>
  apiClient.post('/purchase/add', data);

// ── Purchase Payments ──────────────────────────────────────────────────────
export const getPurchasePayments = async (page = 0, size = 15): Promise<Page<ResponsePurchasePaymentDTO>> =>
  apiClient.get(`/purchase-payment/all?page=${page}&size=${size}`);

export const getPurchasePaymentSummary = async (purchaseId: string): Promise<PurchasePaymentSummaryDTO> =>
  apiClient.get(`/purchase-payment/purchase/${purchaseId}/summary`);

export const getPendingPurchasePayments = async (): Promise<PendingPurchaseDTO[]> =>
  apiClient.get('/purchase-payment/pending');

export const getPendingPaymentsBySupplier = async (supplierId: string): Promise<PendingPurchaseDTO[]> =>
  apiClient.get(`/purchase-payment/pending/supplier/${supplierId}`);

export const getOutstandingTotal = async (): Promise<number> =>
  apiClient.get('/purchase-payment/outstanding-total');

export const createPurchasePayment = async (data: RequestPurchasePaymentDTO): Promise<ResponsePurchasePaymentDTO> =>
  apiClient.post('/purchase-payment/add', data);
