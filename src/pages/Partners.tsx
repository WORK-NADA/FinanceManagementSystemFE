import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle, ChevronDown, ChevronUp, Users, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getPartners, createPartner, updatePartner, deactivatePartner, reactivatePartner,
  getPartnerHistory
} from '../api/partner';
import { z } from 'zod';
import { partnerSchema, type RequestPartnerDTO, type ResponsePartnerDTO } from '../types/partner';
import {
  Button, Modal, Input, Badge, PageHeader, ErrorState, EmptyState, Skeleton
} from '@/components';
import { formatCurrency, formatDate, formatNumber } from '@/lib';
import { toast } from '../store/toastStore';

// ── Detail Row Component ───────────────────────────────────────────────────
function PartnerHistoryRow({ partnerPublicId, lifetimeEarnings }: { partnerPublicId: string, lifetimeEarnings?: number }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['partner-history', partnerPublicId],
    queryFn: () => getPartnerHistory(partnerPublicId),
  });

  return (
    <div className="bg-gradient-to-b from-slate-50/90 to-slate-50/40 dark:from-[#18212F] dark:to-[#141A24] border-t border-gray-100 dark:border-[#1F2837] px-6 py-4 rounded-b-xl">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold uppercase text-gray-400 dark:text-slate-400 tracking-wider">Profit Sharing History</p>
        <div className="bg-white dark:bg-[#0E131C] px-3 py-1 rounded-lg border border-gray-200/80 dark:border-[#1F2837] shadow-xs flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-slate-400">Total Profit Earned:</span>
          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(lifetimeEarnings ?? 0)}</span>
        </div>
      </div>
      
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-[#0E131C] p-4 rounded-lg border border-gray-200/80 dark:border-[#1F2837] text-sm text-gray-500 dark:text-slate-400 italic">
          No profit payouts recorded for this partner yet.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0E131C] rounded-lg border border-gray-200/80 dark:border-[#1F2837] overflow-hidden shadow-xs w-full">
          <div className="hidden sm:grid sm:grid-cols-[110px_minmax(130px,1.5fr)_85px_minmax(100px,1fr)] gap-3 px-4 py-2 header-bar-offwhite border-b text-xs font-bold uppercase tracking-wider select-none">
            <div>Payout Date</div>
            <div>Period</div>
            <div>Profit Share %</div>
            <div className="text-right">Amount Received</div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-[#1F2837]">
            {history.map(h => (
              <div key={h.distributionPublicId ?? String(Math.random())} className="grid grid-cols-1 sm:grid-cols-[110px_minmax(130px,1.5fr)_85px_minmax(100px,1fr)] gap-3 px-4 py-2.5 text-sm items-center">
                <div className="text-gray-700 dark:text-slate-300 font-medium min-w-0">{h.createdAt ? formatDate(h.createdAt) : '—'}</div>
                <div className="text-gray-600 dark:text-slate-400 min-w-0 truncate">{h.fromDate && h.toDate ? `${formatDate(h.fromDate)} to ${formatDate(h.toDate)}` : '—'}</div>
                <div className="font-semibold text-gray-900 dark:text-slate-100 min-w-0">{formatNumber(h.sharePercentageAtDistribution, { maximumFractionDigits: 2 })}%</div>
                <div className="sm:text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums min-w-0">{formatCurrency(h.shareAmount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Partners() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ResponsePartnerDTO | null>(null);
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'reactivate' | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active'>('active');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: partners = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['partners'],
    queryFn: getPartners,
  });

  // Calculate total active partner share percentage
  const totalActiveShare = useMemo(() => {
    const sum = partners
      .filter(p => p.isActive)
      .reduce((acc, p) => acc + (Number(p.sharePercentage) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [partners]);

  const availableShare = Math.max(0, Math.round((100 - totalActiveShare) * 100) / 100);
  const isShareMaxed = availableShare <= 0;

  const maxAllowedShare = useMemo(() => {
    if (!editingPartner) {
      return availableShare;
    }
    if (editingPartner.isActive) {
      const otherActiveShare = Math.max(0, Math.round((totalActiveShare - Number(editingPartner.sharePercentage)) * 100) / 100);
      return Math.max(0, Math.round((100 - otherActiveShare) * 100) / 100);
    }
    return availableShare;
  }, [editingPartner, availableShare, totalActiveShare]);

  const dynamicPartnerSchema = useMemo(() => {
    return partnerSchema.extend({
      sharePercentage: z.number({ invalid_type_error: 'Profit share is required' })
        .min(0.01, 'Share percentage must be at least 0.01%')
        .max(
          maxAllowedShare,
          !editingPartner
            ? `Value must be less than or equal to ${maxAllowedShare}%. Total active share cannot exceed 100%.`
            : `Value must be less than or equal to ${maxAllowedShare}%. Total active partner share cannot exceed 100%.`
        ),
    });
  }, [maxAllowedShare, editingPartner]);

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<RequestPartnerDTO>({
    resolver: zodResolver(dynamicPartnerSchema),
    mode: 'onChange',
    defaultValues: { joiningDate: new Date().toISOString().split('T')[0] },
  });

  const mutation = useMutation({
    mutationFn: (data: RequestPartnerDTO) =>
      editingPartner ? updatePartner(editingPartner.publicId, data) : createPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] });
      handleCloseModal();
      toast.success(editingPartner ? 'Partner updated successfully.' : 'Partner added successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save partner.'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string, action: 'deactivate' | 'reactivate' }) => 
      action === 'deactivate' ? deactivatePartner(id) : reactivatePartner(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['live-profit-overview'] });
      handleCloseConfirmModal();
      toast.success(variables.action === 'deactivate' ? 'Partner deactivated.' : 'Partner reactivated.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update partner status.'),
  });

  const handleOpenModal = (partner?: ResponsePartnerDTO) => {
    if (partner) {
      setEditingPartner(partner);
      reset({
        partnerName: partner.partnerName,
        mobileNumber: partner.mobileNumber,
        email: partner.email || '',
        sharePercentage: partner.sharePercentage,
        joiningDate: partner.joiningDate ? partner.joiningDate.split('T')[0] : '',
      });
    } else {
      if (isShareMaxed) {
        toast.error('Partner share is already 100%. No additional share is available.');
        return;
      }
      setEditingPartner(null);
      reset({
        partnerName: '',
        mobileNumber: '',
        email: '',
        joiningDate: new Date().toISOString().split('T')[0],
        sharePercentage: availableShare > 0 ? Math.min(availableShare, 10) : 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); reset(); setEditingPartner(null); };

  const handleOpenConfirmModal = (partner: ResponsePartnerDTO, action: 'deactivate' | 'reactivate') => {
    if (action === 'reactivate') {
      if (partner.sharePercentage > availableShare) {
        toast.error(`Cannot reactivate partner "${partner.partnerName}". Adding ${partner.sharePercentage}% would exceed the 100% active share limit (only ${availableShare}% available). Please edit their share first.`);
        return;
      }
    }
    setEditingPartner(partner);
    setConfirmAction(action);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setEditingPartner(null);
    setConfirmAction(null);
  };

  const onFormSubmit = (data: RequestPartnerDTO) => {
    if (!editingPartner && isShareMaxed) {
      const msg = 'Partner share is already 100%. No additional share is available.';
      setError('sharePercentage', { type: 'manual', message: msg });
      toast.error(msg);
      return;
    }

    if (data.sharePercentage > maxAllowedShare) {
      const errorMsg = !editingPartner
        ? `Share cannot exceed available ${maxAllowedShare}%. Total active share cannot exceed 100%.`
        : `Total active partner share cannot exceed 100%. Maximum allowed for this partner is ${maxAllowedShare}%.`;
      setError('sharePercentage', { type: 'manual', message: errorMsg });
      toast.error(errorMsg);
      return;
    }

    mutation.mutate(data);
  };

  const filteredPartners = activeTab === 'active' ? partners.filter(p => p.isActive) : partners;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Partners"
        action={
          <Button
            onClick={() => handleOpenModal()}
            disabled={isShareMaxed}
            className={`gap-2 ${isShareMaxed ? 'opacity-60 cursor-not-allowed' : ''}`}
            title={isShareMaxed ? "Partner share is already 100%. No additional share is available." : "Add New Business Partner"}
          >
            <Plus className="h-4 w-4" /> Add Partner
          </Button>
        }
      />

      {/* 100% Share Allocation Notice or Available Share Bar */}
      {isShareMaxed ? (
        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Partner share is already 100%. No additional share is available.</p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
                All 100% of profit shares are currently allocated among active partners. To add a new partner or reactivate another partner, please edit and reduce the share of an existing active partner.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-semibold shrink-0 border border-amber-200 dark:border-amber-800">
            Total Allocated: 100%
          </span>
        </div>
      ) : (
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-gray-600 dark:text-slate-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Total Active Partner Share: <strong className="text-gray-900 dark:text-slate-100 font-semibold">{formatNumber(totalActiveShare, { maximumFractionDigits: 2 })}%</strong></span>
            <span className="text-gray-400 dark:text-slate-500">•</span>
            <span>Available for New Partners: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatNumber(availableShare, { maximumFractionDigits: 2 })}%</strong></span>
          </div>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-xs">
            {formatNumber(availableShare, { maximumFractionDigits: 2 })}% Unallocated
          </span>
        </div>
      )}

      <div className="flex items-center space-x-1.5 bg-gray-100/80 dark:bg-[#0E131C] p-1.5 rounded-xl w-fit border border-gray-200/60 dark:border-[#1F2837]">
        {(['active', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-[#141A24] text-gray-900 dark:text-slate-100 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'active' && <Users className="h-3.5 w-3.5" />}
            {tab === 'active' ? 'Active Partners' : 'All Partners'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load partners'} onRetry={() => refetch()} />
      ) : filteredPartners.length === 0 ? (
        <EmptyState
          title="No partners found"
          description="Try adjusting the filters or add a new business partner."
          action={
            !isShareMaxed ? (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add Partner
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="w-full space-y-3">
          {/* Column Header Guide Bar */}
          <div className="hidden lg:grid lg:grid-cols-[minmax(130px,1.5fr)_minmax(130px,1.2fr)_minmax(75px,0.8fr)_minmax(85px,0.9fr)_minmax(115px,1.2fr)_75px_80px_28px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div>Partner Name</div>
            <div>Contact Info</div>
            <div className="text-right">Profit Share %</div>
            <div>Joining Date</div>
            <div className="text-right">Total Profit Earned</div>
            <div>Status</div>
            <div className="text-right pr-2">Actions</div>
            <div className="text-center"></div>
          </div>

          {/* List of Floating Cards */}
          {filteredPartners.map((p) => {
            const isExpanded = expandedRow === p.publicId;
            return (
              <div
                key={p.publicId}
                className={`bg-white dark:bg-[#141A24] rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
                  !p.isActive ? 'opacity-75' : ''
                } ${
                  isExpanded
                    ? 'border-[var(--color-primary)]/50 ring-1 ring-[var(--color-primary)]/20 shadow-sm'
                    : 'border-gray-200/90 dark:border-[#1F2837] hover:border-gray-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Card Main Row */}
                <div
                  className={`grid grid-cols-1 lg:grid-cols-[minmax(130px,1.5fr)_minmax(130px,1.2fr)_minmax(75px,0.8fr)_minmax(85px,0.9fr)_minmax(115px,1.2fr)_75px_80px_28px] items-center gap-3 px-5 py-3.5 cursor-pointer select-none transition-colors rounded-2xl ${
                    isExpanded ? 'bg-slate-50/50 dark:bg-[#18212F] rounded-b-none' : 'hover:bg-gray-50/70 dark:hover:bg-[#1A2331]'
                  }`}
                  onClick={() => setExpandedRow(isExpanded ? null : p.publicId)}
                >
                  <div className="font-semibold text-sm text-gray-900 dark:text-slate-100 truncate min-w-0" title={p.partnerName}>
                    {p.partnerName}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-gray-700 dark:text-slate-200 font-medium truncate">{p.mobileNumber}</div>
                    {p.email && <div className="text-xs text-gray-500 dark:text-slate-400 truncate" title={p.email}>{p.email}</div>}
                  </div>
                  <div className="lg:text-right font-semibold tabular-nums text-gray-900 dark:text-slate-100 min-w-0">
                    {formatNumber(p.sharePercentage, { maximumFractionDigits: 2 })}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-300 whitespace-nowrap min-w-0">
                    {p.joiningDate ? formatDate(p.joiningDate) : '—'}
                  </div>
                  <div className="lg:text-right font-bold text-emerald-700 dark:text-emerald-400 tabular-nums min-w-0">
                    {formatCurrency(p.lifetimeEarnings ?? 0)}
                  </div>
                  <div className="min-w-0">
                    <Badge variant={p.isActive ? 'success' : 'default'}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-end gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/30 transition-colors"
                      onClick={() => handleOpenModal(p)}
                      title="Edit Partner"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 transition-colors ${
                        p.isActive 
                          ? "text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30" 
                          : p.sharePercentage > availableShare
                            ? "text-gray-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                            : "text-gray-400 dark:text-slate-400 hover:text-green-600 dark:hover:text-emerald-400 hover:bg-green-50 dark:hover:bg-emerald-950/30"
                      }`}
                      onClick={() => handleOpenConfirmModal(p, p.isActive ? 'deactivate' : 'reactivate')}
                      title={
                        p.isActive 
                          ? 'Deactivate' 
                          : p.sharePercentage > availableShare
                            ? `Cannot reactivate: ${p.sharePercentage}% exceeds available share (${availableShare}%)`
                            : 'Reactivate'
                      }
                    >
                      {p.isActive ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div className="flex justify-center min-w-0">
                    <div className="p-1 rounded-md text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable History Drawer */}
                {isExpanded && (
                  <PartnerHistoryRow partnerPublicId={p.publicId} lifetimeEarnings={p.lifetimeEarnings} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPartner ? "Edit Partner Details" : "Add New Partner"}>
        <form noValidate onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <Input label="Partner Name *" maxLength={150} placeholder="Enter full partner name" {...register('partnerName')} error={errors.partnerName?.message} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mobile Number *" type="tel" maxLength={10} placeholder="10-digit mobile (starts 6-9)" {...register('mobileNumber')} error={errors.mobileNumber?.message} />
            <Input label="Email Address" type="email" maxLength={150} placeholder="partner@example.com" {...register('email')} error={errors.email?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input 
                label="Profit Share (%) *" 
                type="number" 
                step="0.01"
                min={0.01}
                max={100}
                {...register('sharePercentage', { valueAsNumber: true })} 
                error={errors.sharePercentage?.message} 
              />
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                {editingPartner ? (
                  <>Maximum allowed for this partner: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatNumber(maxAllowedShare, { maximumFractionDigits: 2 })}%</strong></>
                ) : (
                  <>Available share: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatNumber(availableShare, { maximumFractionDigits: 2 })}%</strong></>
                )}
                {' '}(Total active cannot exceed 100%)
              </p>
            </div>
            <Input label="Joining Date *" type="date" {...register('joiningDate')} error={errors.joiningDate?.message} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingPartner ? 'Update Partner' : 'Save Partner'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Action Modal */}
      <Modal isOpen={isConfirmModalOpen} onClose={handleCloseConfirmModal} title={`Confirm ${confirmAction === 'reactivate' ? 'Reactivation' : 'Deactivation'}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Are you sure you want to {confirmAction} partner <span className="font-semibold text-gray-800 dark:text-slate-200">{editingPartner?.partnerName}</span>?
          </p>
          {confirmAction === 'reactivate' && editingPartner && (
            <div className="bg-gray-50 dark:bg-[#0E131C] p-3 rounded-lg border border-gray-200/60 dark:border-[#1F2837] text-xs space-y-1 text-gray-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Partner's Share:</span>
                <strong className="text-gray-900 dark:text-slate-200">{formatNumber(editingPartner.sharePercentage, { maximumFractionDigits: 2 })}%</strong>
              </div>
              <div className="flex justify-between">
                <span>Currently Available Share:</span>
                <strong className="text-emerald-700 dark:text-emerald-400">{formatNumber(availableShare, { maximumFractionDigits: 2 })}%</strong>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
            <Button type="button" variant="outline" onClick={handleCloseConfirmModal}>Cancel</Button>
            <Button 
              type="button" 
              className={confirmAction === 'deactivate' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
              isLoading={toggleStatusMutation.isPending}
              onClick={() => editingPartner && confirmAction && toggleStatusMutation.mutate({ id: editingPartner.publicId, action: confirmAction })}
            >
              {confirmAction === 'deactivate' ? 'Deactivate Partner' : 'Reactivate Partner'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
