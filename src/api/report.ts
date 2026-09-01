import { apiClient } from './axios';
import type { 
  ResponseSaleReportDTO,
  ResponsePurchaseReportDTO,
  ResponseExpenseReportDTO,
  ResponseProfitLossReportDTO,
  ResponseStockReportDTO,
  ResponseCustomerOutstandingReportDTO,
  ResponseSupplierOutstandingReportDTO
} from '../types/report';

export const getSalesReport = async (startDate: string, endDate: string): Promise<ResponseSaleReportDTO[]> => {
  return apiClient.get(`/report/sales?from=${startDate}&to=${endDate}`);
};

export const getPurchaseReport = async (startDate: string, endDate: string): Promise<ResponsePurchaseReportDTO[]> => {
  return apiClient.get(`/report/purchases?from=${startDate}&to=${endDate}`);
};

export const getExpenseReport = async (startDate: string, endDate: string): Promise<ResponseExpenseReportDTO[]> => {
  return apiClient.get(`/report/expenses?from=${startDate}&to=${endDate}`);
};

export const getProfitLossReport = async (startDate: string, endDate: string): Promise<ResponseProfitLossReportDTO> => {
  return apiClient.get(`/report/profit-loss?from=${startDate}&to=${endDate}`);
};

export const getStockReport = async (): Promise<ResponseStockReportDTO[]> => {
  return apiClient.get('/report/stock');
};

export const getCustomerOutstandingReport = async (): Promise<ResponseCustomerOutstandingReportDTO[]> => {
  return apiClient.get('/report/customers/outstanding');
};

export const getSupplierOutstandingReport = async (): Promise<ResponseSupplierOutstandingReportDTO[]> => {
  return apiClient.get('/report/suppliers/outstanding');
};
