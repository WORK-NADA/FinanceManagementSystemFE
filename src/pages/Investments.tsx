import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  Users, 
  Calendar, 
  Search, 
  AlertCircle,
  Landmark,
  ArrowUpRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getInvestments, 
  createInvestment, 
  updateInvestment, 
  deleteInvestment 
} from '../api/investment';
import { getPartners } from '../api/partner';
import { 
  investmentSchema, 
  type RequestInvestmentDTO, 
  type ResponseInvestmentDTO 
} from '../types/investment';
import {
  Button, 
  Modal, 
  Input, 
  Select, 
  Textarea, 
  PageHeader, 
  ErrorState, 
  EmptyState, 
  Skeleton 
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';
import { Link } from 'react-router-dom';

export default function Investments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<ResponseInvestmentDTO | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<ResponseInvestmentDTO | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState('');

  // Fetch investments
  const { 
    data: investments = [], 
    isLoading: isInvestmentsLoading, 
    isError: isInvestmentsError, 
    refetch: refetchInvestments 
  } = useQuery({
    queryKey: ['investments'],
    queryFn: getInvestments,
  });

  // Fetch active partners for the dropdown
  const { 
    data: partners = [], 
  } = useQuery({
    queryKey: ['partners'],
    queryFn: getPartners,
  });

  // Only active partners for creating/updating investments
  const activePartners = useMemo(() => {
    return partners.filter((p) => p.isActive);
  }, [partners]);

  const defaultDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestInvestmentDTO>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      partnerPublicId: '',
      investmentDate: defaultDate,
      amount: undefined,
      description: '',
    },
  });

  // Reset or populate form when modal opens
  useEffect(() => {
    if (isModalOpen) {
      if (editingInvestment) {
        setValue('partnerPublicId', editingInvestment.partnerPublicId);
        setValue('investmentDate', editingInvestment.investmentDate);
        setValue('amount', editingInvestment.amount);
        setValue('description', editingInvestment.description || '');
      } else {
        reset({
          partnerPublicId: activePartners.length > 0 ? activePartners[0].publicId : '',
          investmentDate: defaultDate,
          amount: undefined,
          description: '',
        });
      }
    }
  }, [isModalOpen, editingInvestment, activePartners, defaultDate, setValue, reset]);

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: (data: RequestInvestmentDTO) => {
      if (editingInvestment) {
        return updateInvestment(editingInvestment.publicId, data);
      }
      return createInvestment(data);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['investments'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      ]);
      handleCloseModal();
      toast.success(
        editingInvestment
          ? 'Investment record updated successfully.'
          : 'Investment capital recorded successfully.'
      );
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save investment record.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (publicId: string) => deleteInvestment(publicId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['investments'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] }),
      ]);
      setIsDeleteModalOpen(false);
      setDeletingInvestment(null);
      toast.success('Investment record deleted successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete investment record.');
    },
  });

  const handleOpenAddModal = () => {
    setEditingInvestment(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (inv: ResponseInvestmentDTO) => {
    setEditingInvestment(inv);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingInvestment(null);
    reset();
  };

  const handleOpenDeleteModal = (inv: ResponseInvestmentDTO) => {
    setDeletingInvestment(inv);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = (data: RequestInvestmentDTO) => {
    saveMutation.mutate(data);
  };

  // Metrics rollups
  const totalInvestmentAmount = useMemo(() => {
    return investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [investments]);

  const uniqueInvestorsCount = useMemo(() => {
    const ids = new Set(investments.map((i) => i.partnerPublicId));
    return ids.size;
  }, [investments]);

  // Filtered investments list
  const filteredInvestments = useMemo(() => {
    return investments.filter((inv) => {
      const matchSearch =
        !searchQuery ||
        inv.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.description && inv.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPartner =
        !selectedPartnerFilter || inv.partnerPublicId === selectedPartnerFilter;
      return matchSearch && matchPartner;
    });
  }, [investments, searchQuery, selectedPartnerFilter]);

  if (isInvestmentsError) {
    return <ErrorState message="Failed to load investments." onRetry={() => refetchInvestments()} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Investments"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Investments' }]}
        action={
          <Button
            variant="primary"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Record Investment
          </Button>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
              Total Capital Invested
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalInvestmentAmount)}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">
              Cumulative actual investments
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Landmark className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
              Active Investors
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white tabular-nums mt-1">
              {uniqueInvestorsCount}{' '}
              <span className="text-sm font-sans font-normal text-gray-400">
                / {activePartners.length} partners
              </span>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">
              Partners who invested capital
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
              Investment Transactions
            </span>
            <div className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white tabular-nums mt-1">
              {investments.length}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">
              Recorded capital deposits
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-[#131924] p-4 rounded-2xl border border-slate-200/90 dark:border-[#1F2837] shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by investor or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0E131C] text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedPartnerFilter}
            onChange={(e) => setSelectedPartnerFilter(e.target.value)}
            aria-label="Filter by partner"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-[#0E131C] text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Investors</option>
            {activePartners.map((p) => (
              <option key={p.publicId} value={p.publicId}>
                {p.partnerName} ({p.sharePercentage}%)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Investments Table / List */}
      <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-200/90 dark:border-[#1F2837] shadow-xs overflow-hidden">
        {isInvestmentsLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredInvestments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Landmark className="h-10 w-10 text-gray-400" />}
              title="No investments found"
              description={
                searchQuery || selectedPartnerFilter
                  ? 'No investment records match your search or filter.'
                  : 'Start recording capital investments made by your business partners.'
              }
              action={
                !searchQuery && !selectedPartnerFilter ? (
                  <Button variant="primary" onClick={handleOpenAddModal} className="mt-2">
                    <Plus className="h-4 w-4 mr-1.5" /> Record First Investment
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="header-bar-offwhite border-b border-gray-100 dark:border-[#1F2837] text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 select-none">
                <tr>
                  <th className="px-5 py-3.5">Investor Name</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F2837]">
                {filteredInvestments.map((inv) => (
                  <tr
                    key={inv.publicId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Investor Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center border border-emerald-400/20 text-xs shrink-0">
                          {inv.partnerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-slate-100">
                            {inv.partnerName}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-slate-500">
                            {inv.partnerSharePercentage !== undefined
                              ? `Share: ${inv.partnerSharePercentage}%`
                              : inv.partnerMobile || 'Partner'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>{formatDate(inv.investmentDate)}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4 text-right">
                      <span className="font-serif font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatCurrency(inv.amount)}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4 text-gray-600 dark:text-slate-400 max-w-xs truncate">
                      {inv.description ? (
                        <span title={inv.description}>{inv.description}</span>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600 italic">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(inv)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:text-slate-400 dark:hover:text-emerald-300 transition-colors"
                          title="Edit Investment"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(inv)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-slate-400 dark:hover:text-rose-300 transition-colors"
                          title="Delete Investment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Investment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingInvestment ? 'Edit Investment' : 'Record Partner Investment'}
      >
        {activePartners.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">No Active Partners Registered</p>
                <p className="text-xs">
                  Investments must be associated with an existing partner. Please add at least one partner before recording investments.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseModal}>
                Close
              </Button>
              <Link to="/dashboard/partners">
                <Button variant="primary">
                  Go to Partners <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Investor Partner Dropdown */}
            <Select
              label="Investor Name *"
              placeholder="Select partner..."
              options={activePartners.map((p) => ({
                value: p.publicId,
                label: `${p.partnerName} (${p.sharePercentage}%)`,
              }))}
              {...register('partnerPublicId')}
              error={errors.partnerPublicId?.message}
            />

            {/* Date Input */}
            <Input
              type="date"
              label="Investment Date *"
              {...register('investmentDate')}
              error={errors.investmentDate?.message}
            />

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-sub)] mb-1">
                Investment Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-semibold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register('amount', { valueAsNumber: true })}
                  className="w-full pl-8 pr-3 py-2 text-base font-semibold border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:bg-[#0E131C] dark:border-slate-700 dark:text-white"
                />
              </div>
              {errors.amount && (
                <p role="alert" className="text-xs text-[var(--color-danger)] mt-1 font-medium">
                  {errors.amount.message}
                </p>
              )}
            </div>

            {/* Description Input */}
            <Textarea
              label="Description / Notes"
              placeholder="Provide any details or reference information about this investment..."
              rows={3}
              {...register('description')}
              error={errors.description?.message}
            />

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || saveMutation.isPending}>
                {saveMutation.isPending
                  ? 'Saving...'
                  : editingInvestment
                  ? 'Update Investment'
                  : 'Save Investment'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingInvestment(null);
        }}
        title="Delete Investment Record"
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
            Are you sure you want to delete this investment record of{' '}
            <strong className="text-gray-900 dark:text-white font-serif">
              {formatCurrency(deletingInvestment?.amount ?? 0)}
            </strong>{' '}
            made by{' '}
            <strong className="text-gray-900 dark:text-white">
              {deletingInvestment?.partnerName}
            </strong>
            ?
          </p>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300">
            This amount will be permanently removed from your recorded investments and deducted from the Dashboard Investment total.
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingInvestment(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deletingInvestment) {
                  deleteMutation.mutate(deletingInvestment.publicId);
                }
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Investment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
