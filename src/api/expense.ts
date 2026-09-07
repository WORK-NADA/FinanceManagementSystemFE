import { apiClient } from './axios';
import type { RequestExpenseDTO, ResponseExpenseDTO, ExpenseCategoryBreakdown } from '../types/expense';
import type { Page } from '../types/stock';

export interface ExpenseFilters {
  page?: number;
  size?: number;
  category?: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
}

export const getExpenses = async (filters: ExpenseFilters = {}): Promise<Page<ResponseExpenseDTO>> => {
  const { page = 0, size = 15, category, startDate, endDate, fromDate, toDate } = filters;
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (category) params.append('category', category);
  const resolvedFrom = fromDate || startDate;
  if (resolvedFrom) params.append('fromDate', resolvedFrom);
  const resolvedTo = toDate || endDate;
  if (resolvedTo) params.append('toDate', resolvedTo);
  
  return apiClient.get(`/expense/all?${params}`);
};

export const createExpense = async (data: RequestExpenseDTO): Promise<ResponseExpenseDTO> =>
  apiClient.post('/expense/add', data);

export const updateExpense = async (id: string, data: RequestExpenseDTO): Promise<ResponseExpenseDTO> =>
  apiClient.put(`/expense/${id}`, data);

export const deleteExpense = async (id: string): Promise<void> =>
  apiClient.delete(`/expense/${id}`);

export const getCategoryBreakdown = async (startDate?: string, endDate?: string): Promise<ExpenseCategoryBreakdown[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('fromDate', startDate);
  if (endDate) params.append('toDate', endDate);
  // Backend returns Map<ExpenseCategory, BigDecimal> serialized as a plain JS object (Record<string, number>).
  // Transform it to the array shape the pie chart expects.
  const raw: Record<string, number> = await apiClient.get(`/expense/dashboard/category-breakdown?${params}`);
  return Object.entries(raw).map(([category, totalAmount]) => ({ category, totalAmount }));
};

export const getTotalExpenses = async (startDate?: string, endDate?: string): Promise<number> => {
  const params = new URLSearchParams();
  if (startDate) params.append('fromDate', startDate);
  if (endDate) params.append('toDate', endDate);
  return apiClient.get(`/expense/dashboard/total?${params}`);
};
