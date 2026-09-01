import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getPartners, createPartner, updatePartner, deactivatePartner, reactivatePartner,
  getPartnerHistory
} from '../api/partner';
import { partnerSchema, type RequestPartnerDTO, type ResponsePartnerDTO } from '../types/partner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Modal, Input, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState, Skeleton
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

// ── Detail Row Component ───────────────────────────────────────────────────
function PartnerHistoryRow({ partnerPublicId, lifetimeEarnings }: { partnerPublicId: string, lifetimeEarnings?: number }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['partner-history', partnerPublicId],
    queryFn: () => getPartnerHistory(partnerPublicId),
  });

  return (
    <TableCell colSpan={7} className="bg-slate-50 px-6 py-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-semibold uppercase text-gray-500 tracking-wide">Profit Share History</p>
        <div className="bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm flex items-center gap-2">
          <span className="text-xs text-gray-500">Lifetime Earnings:</span>
          <span className="text-sm font-bold text-emerald-700">{formatCurrency(lifetimeEarnings ?? 0)}</span>
        </div>
      </div>
      
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : history.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No profit distributions recorded for this partner yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs border-b border-gray-200">
              <th className="pb-2 font-medium">Distribution Date</th>
              <th className="pb-2 font-medium">Period</th>
              <th className="pb-2 font-medium">Share %</th>
              <th className="pb-2 font-medium text-right">Amount Received</th>
            </tr>
          </thead>
          <tbody>
            {history.map(h => (
              <tr key={h.distributionPublicId} className="border-b border-gray-100 last:border-0">
                <td className="py-2">{formatDate(h.createdAt)}</td>
                <td className="py-2">{formatDate(h.fromDate)} to {formatDate(h.toDate)}</td>
                <td className="py-2">{h.sharePercentageAtDistribution}%</td>
                <td className="py-2 text-right font-medium text-emerald-700">{formatCurrency(h.shareAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableCell>
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequestPartnerDTO>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { joinDate: new Date().toISOString().split('T')[0] },
  });

  const mutation = useMutation({
    mutationFn: (data: RequestPartnerDTO) =>
      editingPartner ? updatePartner(editingPartner.publicId, data) : createPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
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
        joinDate: partner.joinDate.split('T')[0],
      });
    } else {
      setEditingPartner(null);
      reset({ joinDate: new Date().toISOString().split('T')[0], sharePercentage: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); reset(); setEditingPartner(null); };

  const handleOpenConfirmModal = (partner: ResponsePartnerDTO, action: 'deactivate' | 'reactivate') => {
    setEditingPartner(partner);
    setConfirmAction(action);
    setIsConfirmModalOpen(true);
  };

  const handleCloseConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setEditingPartner(null);
    setConfirmAction(null);
  };

  const filteredPartners = activeTab === 'active' ? partners.filter(p => p.isActive) : partners;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Partner
          </Button>
        }
      />

      <div className="flex items-center space-x-1 bg-gray-100/50 p-1 rounded-lg w-fit">
        {(['active', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab === 'active' && <Users className="h-3.5 w-3.5" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={7} rows={4} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load partners'} onRetry={() => refetch()} />
      ) : filteredPartners.length === 0 ? (
        <EmptyState
          title="No partners found"
          description="Try adjusting the filters or add a new partner."
          action={
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus className="h-4 w-4" /> Add Partner
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Share %</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right">Lifetime Earnings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((p) => (
                <>
                  <TableRow 
                    key={p.publicId} 
                    className={`cursor-pointer hover:bg-gray-50 ${!p.isActive ? 'opacity-60' : ''}`}
                    onClick={() => setExpandedRow(expandedRow === p.publicId ? null : p.publicId)}
                  >
                    <TableCell className="font-medium">{p.partnerName}</TableCell>
                    <TableCell>
                      <div className="text-sm">{p.mobileNumber}</div>
                      {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{p.sharePercentage}%</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(p.joinDate)}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(p.lifetimeEarnings ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'success' : 'default'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenModal(p); }}>
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleOpenConfirmModal(p, p.isActive ? 'deactivate' : 'reactivate'); }}
                        title={p.isActive ? 'Deactivate' : 'Reactivate'}
                      >
                        {p.isActive ? <Ban className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                      </Button>
                      {expandedRow === p.publicId ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </TableCell>
                  </TableRow>
                  {expandedRow === p.publicId && (
                    <TableRow key={`${p.publicId}-detail`}>
                      <PartnerHistoryRow partnerPublicId={p.publicId} lifetimeEarnings={p.lifetimeEarnings} />
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPartner ? "Edit Partner" : "Add Partner"}>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <Input label="Partner Name *" {...register('partnerName')} error={errors.partnerName?.message} />
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Mobile Number *" {...register('mobileNumber')} error={errors.mobileNumber?.message} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Share Percentage (%) *" type="number" step="0.01" min="0.01" max="100"
              {...register('sharePercentage', { valueAsNumber: true })} error={errors.sharePercentage?.message} />
            <Input label="Join Date *" type="date" {...register('joinDate')} error={errors.joinDate?.message} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
          <p className="text-sm text-gray-600">
            Are you sure you want to {confirmAction} {editingPartner?.partnerName}?
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseConfirmModal}>Cancel</Button>
            <Button 
              type="button" 
              className={confirmAction === 'deactivate' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
              isLoading={toggleStatusMutation.isPending}
              onClick={() => editingPartner && confirmAction && toggleStatusMutation.mutate({ id: editingPartner.publicId, action: confirmAction })}
            >
              {confirmAction === 'deactivate' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
