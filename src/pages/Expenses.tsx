import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, TrendingDown, PieChart as PieChartIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { 
  getExpenses, createExpense, updateExpense, deleteExpense, 
  getCategoryBreakdown, getTotalExpenses 
} from '../api/expense';
import { expenseSchema, type RequestExpenseDTO, type ResponseExpenseDTO } from '../types/expense';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Modal, Input, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState, Pagination, KpiCard
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'OTHER'] as const;
const EXPENSE_CATEGORIES = ['UTILITIES', 'SALARY', 'MAINTENANCE', 'OFFICE_SUPPLIES', 'MARKETING', 'LOGISTICS', 'OTHER'];
const COLORS = ['#0F7B5C', '#1E3A5F', '#C9A84C', '#E74C3C', '#3498DB', '#9B59B6', '#34495E'];

export default function Expenses() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ResponseExpenseDTO | null>(null);
  
  const [page, setPage] = useState(0);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [filters, setFilters] = useState({ 
    category: '', 
    startDate: firstDay.toISOString().split('T')[0], 
    endDate: today.toISOString().split('T')[0] 
  });

  const { data: expensePage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expenses', page, filters],
    queryFn: () => getExpenses({ page, size: 15, ...filters }),
  });

  const { data: totalExpenses } = useQuery({
    queryKey: ['expenses-total', filters.startDate, filters.endDate],
    queryFn: () => getTotalExpenses(filters.startDate, filters.endDate),
  });

  const { data: categoryBreakdown = [] } = useQuery({
    queryKey: ['expenses-breakdown', filters.startDate, filters.endDate],
    queryFn: () => getCategoryBreakdown(filters.startDate, filters.endDate),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequestExpenseDTO>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expenseDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH', category: 'OTHER' },
  });

  const mutation = useMutation({
    mutationFn: (data: RequestExpenseDTO) =>
      editingExpense ? updateExpense(editingExpense.publicId, data) : createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingExpense ? 'Expense updated.' : 'Expense added.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save expense.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseDeleteModal();
      toast.success('Expense deleted.');
    },
    onError: () => toast.error('Failed to delete expense.'),
  });

  const handleOpenModal = (expense?: ResponseExpenseDTO) => {
    if (expense) {
      setEditingExpense(expense);
      reset({
        expenseDate: expense.expenseDate.split('T')[0],
        category: expense.category,
        amount: expense.amount,
        paymentMode: expense.paymentMode as any,
        description: expense.description ?? '',
        referenceNumber: expense.referenceNumber ?? '',
      });
    } else {
      setEditingExpense(null);
      reset({ expenseDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH', category: 'OTHER' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); reset(); setEditingExpense(null); };

  const handleOpenDeleteModal = (expense: ResponseExpenseDTO) => {
    setEditingExpense(expense);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEditingExpense(null);
  };

  const expenses = expensePage?.content ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Log Expense
          </Button>
        }
      />

      {/* Dashboard Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <KpiCard
            title="Total Expenses"
            value={formatCurrency(totalExpenses ?? 0)}
            icon={<TrendingDown className="h-5 w-5" />}
            trend={{ value: 0, label: 'In selected period' }}
            className="border-red-100 bg-red-50/30 h-full"
          />
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center h-[200px]">
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="totalAmount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {categoryBreakdown.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  labelFormatter={(label) => String(label).replace(/_/g, ' ')}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  formatter={(value) => String(value).replace(/_/g, ' ')}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <PieChartIcon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No expense data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFilters(f => ({ ...f, category: '' })); setPage(0); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.category === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories
          </button>
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setFilters(f => ({ ...f, category: cat })); setPage(0); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.category === cat ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input type="date" className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(0); }} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input type="date" className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(0); }} />
          </div>
          {(filters.startDate || filters.endDate) && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setFilters(f => ({ ...f, startDate: firstDay.toISOString().split('T')[0], endDate: today.toISOString().split('T')[0] })); setPage(0); }}>
                Clear Dates
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={7} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load expenses'} onRetry={() => refetch()} />
      ) : expenses.length === 0 ? (
        <EmptyState
          title="No expenses found"
          description="Try adjusting the filters or add a new expense."
          action={
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Reference #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.publicId}>
                  <TableCell className="whitespace-nowrap">{formatDate(e.expenseDate)}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="text-[10px]">
                      {e.category.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-red-700">
                    {formatCurrency(e.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="info">{e.paymentMode.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{e.referenceNumber || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[160px] truncate" title={e.description}>{e.description || '—'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(e)}>
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleOpenDeleteModal(e)}>
                      <Ban className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {expensePage && expensePage.totalPages > 1 && (
            <div className="p-4 border-t border-gray-200">
              <Pagination currentPage={expensePage.number} totalPages={expensePage.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingExpense ? "Edit Expense" : "Log Expense"}>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expense Date *" type="date" {...register('expenseDate')} error={errors.expenseDate?.message} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                {...register('category')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount *" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} error={errors.amount?.message} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
              <select
                {...register('paymentMode')}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <Input label="Reference Number" {...register('referenceNumber')} error={errors.referenceNumber?.message} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...register('description')}
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="What was this expense for?"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Confirm Deactivation">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to deactivate this expense? This action will mark the expense as deleted.
          </p>
          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p><span className="font-medium">Date:</span> {editingExpense?.expenseDate && formatDate(editingExpense.expenseDate)}</p>
            <p><span className="font-medium">Amount:</span> {editingExpense && formatCurrency(editingExpense.amount)}</p>
            <p><span className="font-medium">Category:</span> {editingExpense?.category.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseDeleteModal}>Cancel</Button>
            <Button 
              type="button" 
              className="bg-red-600 hover:bg-red-700 text-white" 
              isLoading={deleteMutation.isPending}
              onClick={() => editingExpense && deleteMutation.mutate(editingExpense.publicId)}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
