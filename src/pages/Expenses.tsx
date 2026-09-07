import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, TrendingDown, PieChart as PieChartIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { 
  getExpenses, createExpense, updateExpense, deleteExpense, 
  getCategoryBreakdown, getTotalExpenses 
} from '../api/expense';
import { expenseSchema, type RequestExpenseDTO, type ResponseExpenseDTO } from '../types/expense';
import {
  Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState, Pagination, CopyableSequence
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'] as const;
const EXPENSE_CATEGORIES = ['RENT', 'ELECTRICITY', 'TRANSPORT', 'SALARY', 'MAINTENANCE', 'OFFICE_SUPPLIES', 'OTHER'];
const COLORS = ['#0F7B5C', '#1E3A5F', '#C9A84C', '#E74C3C', '#3498DB', '#9B59B6', '#34495E'];

export default function Expenses() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ResponseExpenseDTO | null>(null);
  
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ 
    category: '', 
    startDate: '', 
    endDate: '' 
  });

  const { data: expensePage, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['expenses', 'list', page, filters],
    queryFn: () => getExpenses({ page, size: 15, ...filters }),
  });

  const { data: totalExpenses, refetch: refetchTotal } = useQuery({
    queryKey: ['expenses', 'total', filters.startDate, filters.endDate],
    queryFn: () => getTotalExpenses(filters.startDate, filters.endDate),
  });

  const { data: categoryBreakdown = [], refetch: refetchBreakdown } = useQuery({
    queryKey: ['expenses', 'breakdown', filters.startDate, filters.endDate],
    queryFn: () => getCategoryBreakdown(filters.startDate, filters.endDate),
  });

  const { register, handleSubmit, reset, watch, clearErrors, formState: { errors } } = useForm<RequestExpenseDTO>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { expenseDate: new Date().toISOString().split('T')[0], paymentMode: 'CASH', category: 'OTHER' },
  });

  const selectedCategory = watch('category');
  const isDescriptionRequired = selectedCategory?.toUpperCase() === 'OTHER';

  useEffect(() => {
    if (!isDescriptionRequired && errors.description) {
      clearErrors('description');
    }
  }, [isDescriptionRequired, errors.description, clearErrors]);

  const mutation = useMutation({
    mutationFn: (data: RequestExpenseDTO) =>
      editingExpense ? updateExpense(editingExpense.publicId, data) : createExpense(data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-total'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-breakdown'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['rep-expenses-tab'] }),
        queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] }),
      ]);
      refetch();
      refetchTotal();
      refetchBreakdown();
      handleCloseModal();
      toast.success(editingExpense ? 'Expense updated.' : 'Expense added.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save expense.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-total'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses-breakdown'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
        queryClient.invalidateQueries({ queryKey: ['rep-expenses-tab'] }),
        queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] }),
      ]);
      refetch();
      refetchTotal();
      refetchBreakdown();
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
        remarks: expense.remarks ?? '',
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
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      {/* Dashboard Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs p-5 flex items-center justify-between h-full">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">Total Expenses</p>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-slate-100 mt-1">{formatCurrency(totalExpenses ?? 0)}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">In selected period</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-100/80 dark:border-amber-900/40">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs p-5 flex items-center h-[200px]">
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
                  contentStyle={{ backgroundColor: '#171F2C', borderColor: '#1F2837', borderRadius: '0.75rem', color: '#F1F5F9' }}
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
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
              <PieChartIcon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No expense data for this period</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-[#141A24] p-5 rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFilters(f => ({ ...f, category: '' })); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filters.category === '' ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'bg-gray-100 dark:bg-[#0E131C] text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#1A2331] border border-gray-200/60 dark:border-[#1F2837]'
            }`}
          >
            All Categories
          </button>
          {EXPENSE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => { setFilters(f => ({ ...f, category: cat })); setPage(0); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filters.category === cat ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'bg-gray-100 dark:bg-[#0E131C] text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-[#1A2331] border border-gray-200/60 dark:border-[#1F2837]'
              }`}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">From Date</label>
            <input type="date" className="flex h-10 w-full rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              value={filters.startDate} onChange={e => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(0); }} />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-1.5">To Date</label>
            <input type="date" className="flex h-10 w-full rounded-lg border border-gray-200/90 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
              value={filters.endDate} onChange={e => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(0); }} />
          </div>
          {(filters.startDate || filters.endDate) && (
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={() => { setFilters(f => ({ ...f, startDate: '', endDate: '' })); setPage(0); }}>
                Clear Dates
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
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
        <div className="w-full space-y-4">
          <div className="space-y-3">
            {/* Column Header Guide Bar */}
          <div className="hidden lg:grid grid-cols-[90px_minmax(150px,1.2fr)_minmax(95px,1fr)_minmax(85px,1fr)_80px_minmax(85px,1fr)_minmax(100px,1.4fr)_80px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div className="min-w-0">Date</div>
            <div className="min-w-0">Expense #</div>
            <div className="min-w-0">Category</div>
            <div className="min-w-0 text-right">Amount</div>
            <div className="min-w-0">Payment Method</div>
            <div className="min-w-0">Ref / Cheque #</div>
            <div className="min-w-0">Description</div>
            <div className="min-w-0 text-right pr-2">Actions</div>
          </div>

          {/* List of Floating Cards */}
          {expenses.map((e) => (
            <div
              key={e.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[90px_minmax(150px,1.2fr)_minmax(95px,1fr)_minmax(85px,1fr)_80px_minmax(85px,1fr)_minmax(100px,1.4fr)_80px] items-center gap-3 px-5 py-3.5 w-full"
            >
              <div className="min-w-0 text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
                {formatDate(e.expenseDate)}
              </div>
                <div className="min-w-0">
                  <CopyableSequence
                    value={e.expenseNumber}
                    badgeClassName="font-mono text-xs font-semibold text-blue-700 dark:text-sky-300 bg-blue-50 dark:bg-sky-950/40 px-2 py-0.5 rounded border border-blue-200/60 dark:border-sky-900/50 inline-flex items-center"
                  />
                </div>
                <div>
                  <Badge variant="default" className="text-[10px]">
                    {e.category.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-right text-sm tabular-nums font-bold text-red-700 dark:text-rose-400">
                  {formatCurrency(e.amount)}
                </div>
                <div>
                  <Badge variant="info">{e.paymentMode.replace(/_/g, ' ')}</Badge>
                </div>
                <div className="font-mono text-xs text-gray-500 dark:text-slate-400 truncate" title={e.referenceNumber}>
                  {e.referenceNumber || '—'}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400 truncate" title={e.description}>
                  {e.description || '—'}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/30 transition-colors"
                    onClick={() => handleOpenModal(e)}
                    title="Edit Expense"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30 transition-colors"
                    onClick={() => handleOpenDeleteModal(e)}
                    title="Delete Expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {expensePage && expensePage.totalPages > 1 && (
            <div className="mt-4 p-4 bg-white dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-[#1F2837] shadow-xs flex justify-center">
              <Pagination currentPage={expensePage.number} totalPages={expensePage.totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingExpense ? "Edit Expense" : "Add New Expense"}>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          {editingExpense && editingExpense.expenseNumber && (
            <div className="bg-gray-50 dark:bg-[#0E131C] rounded-lg px-4 py-2 flex items-center justify-between border border-gray-200/60 dark:border-[#1F2837]">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Expense Reference #</span>
              <CopyableSequence
                value={editingExpense.expenseNumber}
                plainText
                badgeClassName="font-mono font-bold text-gray-800 dark:text-slate-200"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Expense Date *" type="date" {...register('expenseDate')} error={errors.expenseDate?.message} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Category *</label>
              <select
                {...register('category')}
                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹) *" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} error={errors.amount?.message} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Payment Method *</label>
              <select
                {...register('paymentMode')}
                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-[#222D3D] bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <Input label="Reference / Cheque # (Optional)" placeholder="Cheque no., UPI ref, bank txn ID, etc." maxLength={100} {...register('referenceNumber')} error={errors.referenceNumber?.message} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Description {isDescriptionRequired ? '*' : '(Optional)'}
            </label>
            <textarea
              {...register('description')}
              maxLength={255}
              className={`flex min-h-[80px] w-full rounded-md border ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#222D3D]'} bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
              placeholder="What was this expense for?"
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Remarks (Optional)
            </label>
            <textarea
              {...register('remarks')}
              maxLength={500}
              className={`flex min-h-[70px] w-full rounded-md border ${errors.remarks ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-[#222D3D]'} bg-white dark:bg-[#0E131C] text-gray-900 dark:text-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]`}
              placeholder="Additional remarks (optional)..."
            />
            {errors.remarks && <p className="text-red-500 text-xs mt-1">{errors.remarks.message}</p>}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingExpense ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Confirm Delete Expense">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Are you sure you want to delete this expense record? This action will remove the expense from your accounts.
          </p>
          <div className="bg-gray-50 dark:bg-[#0E131C] p-3 rounded-md text-sm space-y-1.5 border border-gray-200/60 dark:border-[#1F2837]">
            {editingExpense?.expenseNumber && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600 dark:text-slate-400">Expense #:</span>
                <CopyableSequence
                  value={editingExpense.expenseNumber}
                  plainText
                  badgeClassName="font-mono font-bold text-gray-800 dark:text-slate-200"
                />
              </div>
            )}
            <p><span className="font-medium text-gray-700 dark:text-slate-300">Date:</span> <span className="text-gray-600 dark:text-slate-400">{editingExpense?.expenseDate && formatDate(editingExpense.expenseDate)}</span></p>
            <p><span className="font-medium text-gray-700 dark:text-slate-300">Amount:</span> <span className="text-gray-600 dark:text-slate-400">{editingExpense && formatCurrency(editingExpense.amount)}</span></p>
            <p><span className="font-medium text-gray-700 dark:text-slate-300">Category:</span> <span className="text-gray-600 dark:text-slate-400">{editingExpense?.category.replace(/_/g, ' ')}</span></p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button type="button" variant="outline" onClick={handleCloseDeleteModal}>Cancel</Button>
            <Button 
              type="button" 
              className="bg-red-600 hover:bg-red-700 text-white" 
              isLoading={deleteMutation.isPending}
              onClick={() => editingExpense && deleteMutation.mutate(editingExpense.publicId)}
            >
              Delete Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
