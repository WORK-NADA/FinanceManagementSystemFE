import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Landmark, 
  Search, 
  Calendar, 
  CreditCard, 
  PieChart 
} from 'lucide-react';
import { getPlatformExpenses } from '../../api/admin';
import { formatCurrency, formatDate } from '../../lib';
import { 
  Button, 
  Input, 
  Badge, 
  PageHeader, 
  ErrorState, 
  EmptyState 
} from '../../components';

export default function GlobalExpenses() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platformExpenses', page, categoryFilter, fromDate, toDate],
    queryFn: () => getPlatformExpenses({ page, size: 50, category: categoryFilter || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined }),
  });

  const expenses = data?.content || [];

  const filteredExpenses = expenses.filter((e) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      e.expenseNumber?.toLowerCase().includes(term) ||
      e.category?.toLowerCase().includes(term) ||
      e.description?.toLowerCase().includes(term) ||
      e.referenceNumber?.toLowerCase().includes(term)
    );
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const avgExpense = filteredExpenses.length ? totalExpenseAmount / filteredExpenses.length : 0;

  // Category tally
  const categoryCounts = filteredExpenses.reduce((acc: Record<string, number>, e) => {
    const cat = e.category || 'OTHER';
    acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Expenses Oversight"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Global Expenses' },
        ]}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Landmark className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Platform OPEX</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(totalExpenseAmount)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{filteredExpenses.length} Expense entries</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400">
            <PieChart className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Average Entry Value</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(avgExpense)}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Per operational expenditure</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tracked Categories</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {Object.keys(categoryCounts).length} Distinct
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Rent, Utilities, Salaries, Freight...</p>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search expense #, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs font-medium text-gray-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="">All Expense Categories</option>
            <option value="RENT">Rent</option>
            <option value="ELECTRICITY">Electricity / Utilities</option>
            <option value="SALARY">Salary / Wages</option>
            <option value="TRANSPORT">Transport / Freight</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OFFICE_SUPPLIES">Office Supplies</option>
            <option value="TEA_AND_REFRESHMENT">Tea & Refreshment</option>
            <option value="MISCELLANEOUS">Miscellaneous</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 px-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs text-gray-700 dark:text-slate-300"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 px-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0E131C] text-xs text-gray-700 dark:text-slate-300"
            />
          </div>
        </div>

        {(searchTerm || categoryFilter || fromDate || toDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
              setFromDate('');
              setToDate('');
            }}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Expenses Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200 dark:border-[#1F2837] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load platform expenses.'} onRetry={() => refetch()} />
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          title="No expenses found"
          description="Try adjusting your category or date filter."
        />
      ) : (
        <div className="w-full space-y-3">
          <div className="hidden lg:grid lg:grid-cols-[130px_minmax(140px,1.5fr)_minmax(160px,2fr)_100px_100px_110px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div>Expense #</div>
            <div>Category</div>
            <div>Description / Remarks</div>
            <div>Mode</div>
            <div>Date</div>
            <div className="text-right pr-2">Amount</div>
          </div>

          {filteredExpenses.map((expense) => (
            <div
              key={expense.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md transition-all overflow-hidden"
            >
              {/* Desktop Row */}
              <div className="hidden lg:grid lg:grid-cols-[130px_minmax(140px,1.5fr)_minmax(160px,2fr)_100px_100px_110px] items-center gap-3 px-5 py-3.5 text-sm">
                <div className="font-mono text-xs font-semibold text-gray-800 dark:text-slate-200">
                  {expense.expenseNumber}
                </div>

                <div>
                  <Badge variant="info" className="text-[10px]">
                    {expense.category?.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div className="truncate text-xs text-gray-600 dark:text-slate-300">
                  {expense.description || expense.remarks || '—'}
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {expense.paymentMode}
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400">
                  {formatDate(expense.expenseDate)}
                </div>

                <div className="text-right font-bold text-amber-600 dark:text-amber-400 pr-2">
                  {formatCurrency(expense.amount)}
                </div>
              </div>

              {/* Mobile / Tablet Card */}
              <div className="lg:hidden p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-900 dark:text-slate-100">
                      {expense.expenseNumber}
                    </span>
                    <Badge variant="info" className="text-[10px]">
                      {expense.category?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400 shrink-0 tabular-nums">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>

                {expense.description || expense.remarks ? (
                  <p className="text-xs text-gray-600 dark:text-slate-300 line-clamp-2">
                    {expense.description || expense.remarks}
                  </p>
                ) : null}

                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-800/80 pt-2">
                  <span>
                    Mode: <strong className="font-semibold text-gray-700 dark:text-slate-300">{expense.paymentMode}</strong>
                  </span>
                  <span>{formatDate(expense.expenseDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-800">
          <Button 
            variant="secondary" 
            size="sm" 
            disabled={page === 0} 
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Page {page + 1} of {data.totalPages} ({data.totalElements} items)
          </span>
          <Button 
            variant="secondary" 
            size="sm" 
            disabled={page >= data.totalPages - 1} 
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
