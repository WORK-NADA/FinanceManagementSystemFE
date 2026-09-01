import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Ban, CheckCircle2, Search, TrendingDown, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCustomers, getActiveCustomers, createCustomer, updateCustomer, deactivateCustomer, reactivateCustomer } from '../api/customer';
import { customerSchema, type RequestCustomerDTO, type ResponseCustomerDTO } from '../types/customer';
import { getDashboardSummary } from '../api/dashboard';
import { Button, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Modal, Badge, PageHeader, ErrorState, TableSkeleton, EmptyState } from '@/components';
import { formatCurrency } from '@/lib';
import { toast } from '../store/toastStore';

export default function Customers() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ResponseCustomerDTO | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  const { data: customers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['customers', statusFilter],
    queryFn: statusFilter === 'active' ? getActiveCustomers : getCustomers,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary,
  });

  const { register, handleSubmit, reset, formState: { errors }, setError } = useForm<RequestCustomerDTO>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      address: { country: 'India' },
      openingBalance: 0,
      paymentTerms: 30,
    }
  });

  const mutation = useMutation({
    mutationFn: (data: RequestCustomerDTO) => 
      editingCustomer ? updateCustomer(editingCustomer.publicId, data) : createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      handleCloseModal();
      toast.success(editingCustomer ? 'Customer updated successfully.' : 'Customer added successfully.');
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
        toast.error(error?.message || 'Failed to save customer.');
      }
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => 
      isActive ? deactivateCustomer(id) : reactivateCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer status updated.');
    },
    onError: () => toast.error('Failed to update customer status.'),
  });

  const handleOpenModal = (customer?: ResponseCustomerDTO) => {
    if (customer) {
      setEditingCustomer(customer);
      reset({
        ...customer,
        alternateMobileNumber: customer.alternateMobileNumber || '',
        contactPerson: customer.contactPerson || '',
      });
    } else {
      setEditingCustomer(null);
      reset({ address: { country: 'India' }, openingBalance: 0, paymentTerms: 30 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    reset();
    setEditingCustomer(null);
  };

  const onSubmit = (data: RequestCustomerDTO) => {
    mutation.mutate(data);
  };

  const filteredCustomers = customers?.filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customers"
        action={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" /> Add Customer
          </Button>
        }
      />

      {/* Live Outstanding Receivables from Dashboard */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">Total Outstanding (Receivables)</p>
          <p className="text-2xl font-serif font-bold text-gray-900 mt-1">{formatCurrency(dashboardData?.totalReceivable ?? 0)}</p>
        </div>
        <div className="p-3 bg-red-50 text-red-600 rounded-lg">
          <TrendingDown className="h-6 w-6" />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <Input 
            placeholder="Search customers by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Search customers"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active')}
            options={[
              { label: 'All Customers', value: 'all' },
              { label: 'Active Only', value: 'active' }
            ]}
            aria-label="Filter by status"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <TableSkeleton columns={6} rows={5} />
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load customers'} onRetry={() => refetch()} />
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="h-8 w-8" />}
          title={searchTerm ? 'No customers match your search' : 'No customers yet'}
          description={searchTerm ? 'Try a different search term.' : 'Add your first customer to start tracking receivables.'}
          action={
            !searchTerm && (
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <Plus className="h-4 w-4" /> Add First Customer
              </Button>
            )
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Opening Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.publicId}>
                  <TableCell className="font-medium">{c.customerName}</TableCell>
                  <TableCell>
                    <div className="text-sm">{c.mobileNumber}</div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </TableCell>
                  <TableCell>{c.gstNumber}</TableCell>
                  <TableCell className="tabular-monetary font-medium">{formatCurrency(c.openingBalance)}</TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'success' : 'default'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(c)} aria-label={`Edit ${c.customerName}`}>
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={c.isActive ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to ${c.isActive ? 'deactivate' : 'reactivate'} this customer?`)) {
                          toggleStatusMutation.mutate({ id: c.publicId, isActive: c.isActive });
                        }
                      }}
                      title={c.isActive ? 'Deactivate' : 'Reactivate'}
                      aria-label={c.isActive ? `Deactivate ${c.customerName}` : `Reactivate ${c.customerName}`}
                    >
                      {c.isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
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
        title={editingCustomer ? "Edit Customer" : "Add New Customer"}
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Customer Name *" {...register('customerName')} error={errors.customerName?.message} />
            <Input label="Contact Person" {...register('contactPerson')} error={errors.contactPerson?.message} />
            <Input label="Mobile Number *" {...register('mobileNumber')} error={errors.mobileNumber?.message} />
            <Input label="Alternate Mobile" {...register('alternateMobileNumber')} error={errors.alternateMobileNumber?.message} />
            <Input label="Email *" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="GST Number *" {...register('gstNumber')} error={errors.gstNumber?.message} />
            <Input label="Opening Balance *" type="number" step="0.01" {...register('openingBalance', { valueAsNumber: true })} error={errors.openingBalance?.message} />
            <Input label="Payment Terms (Days) *" type="number" {...register('paymentTerms', { valueAsNumber: true })} error={errors.paymentTerms?.message} />
          </div>

          <h4 className="font-medium text-gray-900 border-b pb-2 mt-6 mb-4">Billing Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Address Line 1 *" {...register('address.addressLine1')} error={errors.address?.addressLine1?.message} />
            <Input label="Address Line 2" {...register('address.addressLine2')} error={errors.address?.addressLine2?.message} />
            <Input label="City *" {...register('address.city')} error={errors.address?.city?.message} />
            <Input label="State *" {...register('address.state')} error={errors.address?.state?.message} />
            <Input label="Pincode *" {...register('address.pincode')} error={errors.address?.pincode?.message} />
            <Input label="Country *" {...register('address.country')} error={errors.address?.country?.message} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {editingCustomer ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
