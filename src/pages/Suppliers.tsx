import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle2, Search, TrendingUp, UserSquare2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getSuppliers, createSupplier, updateSupplier, deactivateSupplier, reactivateSupplier } from '../api/supplier';
import { supplierSchema, type RequestSupplierDTO, type ResponseSupplierDTO } from '../types/supplier';
import { getDashboardSummary } from '../api/dashboard';
import { Button, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Modal, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState } from '@/components';
import { formatCurrency } from '@/lib';
import { toast } from '../store/toastStore';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ResponseSupplierDTO | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  const { data: suppliers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  });

  const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RequestSupplierDTO>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      address: { country: 'India' },
      openingBalance: 0,
      paymentTerms: 30,
    }
  });

  const mutation = useMutation({
    mutationFn: (data: RequestSupplierDTO) => 
      editingSupplier ? updateSupplier(editingSupplier.publicId, data) : createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingSupplier ? 'Supplier updated successfully.' : 'Supplier added successfully.');
    },
    onError: (error: any) => {
      if (error.code === 'VALIDATION_ERROR' && error.fieldErrors) {
        Object.keys(error.fieldErrors).forEach((key) => {
          if (key.startsWith('address.')) {
            const nestedKey = key.split('.')[1] as any;
            setError(`address.${nestedKey}` as any, { type: 'server', message: error.fieldErrors[key] });
          } else {
            setError(key as any, { type: 'server', message: error.fieldErrors[key] });
          }
        });
      } else {
        toast.error(error?.message || 'Failed to save supplier.');
      }
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      isActive ? deactivateSupplier(id) : reactivateSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier status updated.');
    },
    onError: () => toast.error('Failed to update supplier status.'),
  });

  const handleOpenModal = (supplier?: ResponseSupplierDTO) => {
    if (supplier) {
      setEditingSupplier(supplier);
      reset({
        ...supplier,
        alternateMobileNumber: supplier.alternateMobileNumber || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        gstNumber: supplier.gstNumber || '',
      });
    } else {
      setEditingSupplier(null);
      reset({ address: { country: 'India' }, openingBalance: 0, paymentTerms: 30 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingSupplier(null);
  };

  const onSubmit = (data: RequestSupplierDTO) => {
    mutation.mutate(data);
  };

  // Filter suppliers on the client side
  const filteredSuppliers = suppliers?.filter(s => {
    const matchesSearch = s.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && s.isActive);
    return matchesSearch && matchesStatus;
  }) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Suppliers"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      {/* Live Outstanding Payables from Dashboard */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">Total Outstanding (Payables)</p>
          <p className="text-2xl font-serif font-bold text-gray-900 mt-1">{formatCurrency(dashboardData?.totalOutstanding ?? 0)}</p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <TrendingUp className="h-6 w-6" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <Input 
            placeholder="Search suppliers by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active')}
            options={[
              { label: 'All Suppliers', value: 'all' },
              { label: 'Active Only', value: 'active' }
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={6} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load suppliers'} onRetry={() => refetch()} />
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<UserSquare2 className="h-8 w-8" />}
          title={searchTerm ? 'No suppliers match your search' : 'No suppliers yet'}
          description={searchTerm ? 'Try a different search term.' : 'Add your first supplier to start tracking payables.'}
          action={
            !searchTerm && (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add First Supplier
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Opening Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((s) => (
                <TableRow key={s.publicId}>
                  <TableCell className="font-medium">{s.supplierName}</TableCell>
                  <TableCell>
                    <div className="text-sm">{s.mobileNumber}</div>
                    <div className="text-xs text-gray-500">{s.email || '-'}</div>
                  </TableCell>
                  <TableCell>{s.gstNumber || '-'}</TableCell>
                  <TableCell className="tabular-monetary font-medium">{formatCurrency(s.openingBalance)}</TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? 'success' : 'default'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(s)}>
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={s.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to ${s.isActive ? 'deactivate' : 'reactivate'} this supplier?`)) {
                          toggleStatusMutation.mutate({ id: s.publicId, isActive: s.isActive });
                        }
                      }}
                      title={s.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {s.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSupplier ? "Edit Supplier" : "Add New Supplier"}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Supplier Name *" {...register('supplierName')} error={errors.supplierName?.message} />
            <Input label="Contact Person" {...register('contactPerson')} error={errors.contactPerson?.message} />
            <Input label="Mobile Number *" {...register('mobileNumber')} error={errors.mobileNumber?.message} />
            <Input label="Alternate Mobile" {...register('alternateMobileNumber')} error={errors.alternateMobileNumber?.message} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="GST Number" {...register('gstNumber')} error={errors.gstNumber?.message} />
            <Input label="Opening Balance" type="number" step="0.01" {...register('openingBalance', { valueAsNumber: true })} error={errors.openingBalance?.message} />
            <Input label="Payment Terms (Days)" type="number" {...register('paymentTerms', { valueAsNumber: true })} error={errors.paymentTerms?.message} />
          </div>

          <h4 className="font-medium text-gray-900 border-b pb-2 mt-6 mb-4">Billing Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Address Line 1" {...register('address.addressLine1')} error={errors.address?.addressLine1?.message} />
            <Input label="Address Line 2" {...register('address.addressLine2')} error={errors.address?.addressLine2?.message} />
            <Input label="City" {...register('address.city')} error={errors.address?.city?.message} />
            <Input label="State" {...register('address.state')} error={errors.address?.state?.message} />
            <Input label="Pincode" {...register('address.pincode')} error={errors.address?.pincode?.message} />
            <Input label="Country" {...register('address.country')} error={errors.address?.country?.message} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
