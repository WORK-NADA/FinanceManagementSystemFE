import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCustomer } from '../api/customer';
import { customerSchema, type RequestCustomerDTO, type ResponseCustomerDTO } from '../types/customer';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { toast } from '../store/toastStore';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: ResponseCustomerDTO) => void;
}

export function CreateCustomerModal({ isOpen, onClose, onSuccess }: CreateCustomerModalProps) {
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<RequestCustomerDTO>({
    resolver: zodResolver(customerSchema),
    mode: 'onTouched',
    defaultValues: {
      customerName: '',
      mobileNumber: '',
      contactPerson: '',
      alternateMobileNumber: '',
      email: '',
      gstNumber: '',
      openingBalance: 0,
      paymentTerms: 30,
      address: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
      },
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RequestCustomerDTO) => createCustomer(data),
    onSuccess: (newCustomer) => {
      const updateCustomerList = (old: ResponseCustomerDTO[] | undefined) => {
        if (!old) return [newCustomer];
        const exists = old.some(c => c.publicId === newCustomer.publicId);
        if (exists) return old;
        return [newCustomer, ...old];
      };

      queryClient.setQueryData<ResponseCustomerDTO[]>(['customers'], updateCustomerList);
      queryClient.setQueryData<ResponseCustomerDTO[]>(['customers', 'active'], updateCustomerList);
      queryClient.setQueryData<ResponseCustomerDTO[]>(['customers', 'all'], updateCustomerList);

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });

      toast.success(`Customer "${newCustomer.customerName}" added and selected.`);
      reset();
      onSuccess(newCustomer);
      onClose();
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

  const onSubmit = (data: RequestCustomerDTO) => {
    const hasAddress = !!(data.address?.addressLine1 && data.address.addressLine1.trim().length > 0);
    const cleanedAddress = hasAddress ? {
      addressLine1: data.address!.addressLine1!.trim(),
      addressLine2: data.address!.addressLine2?.trim() || undefined,
      city: data.address!.city?.trim() || undefined,
      state: data.address!.state?.trim() || undefined,
      country: data.address!.country?.trim() || 'India',
      pincode: data.address!.pincode?.trim() || undefined,
    } : undefined;

    const cleanedData: RequestCustomerDTO = {
      ...data,
      customerName: data.customerName.trim(),
      contactPerson: data.contactPerson?.trim() || undefined,
      alternateMobileNumber: data.alternateMobileNumber?.trim() || undefined,
      email: data.email?.trim() || undefined,
      gstNumber: data.gstNumber?.trim() ? data.gstNumber.trim().toUpperCase() : undefined,
      address: cleanedAddress,
    };
    mutation.mutate(cleanedData);
  };

  const handleModalClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Add New Customer"
      className="max-w-3xl"
      zIndex={60}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Customer Name *"
            placeholder="e.g. Acme Corporation"
            {...register('customerName')}
            error={errors.customerName?.message}
          />
          <Input
            label="Contact Person (Optional)"
            placeholder="e.g. Ramesh Patel"
            {...register('contactPerson')}
            error={errors.contactPerson?.message}
          />
          <Input
            label="Mobile Number *"
            placeholder="10-digit mobile"
            maxLength={10}
            {...register('mobileNumber')}
            error={errors.mobileNumber?.message}
          />
          <Input
            label="Alternate Mobile (Optional)"
            placeholder="10-digit mobile (optional)"
            maxLength={10}
            {...register('alternateMobileNumber')}
            error={errors.alternateMobileNumber?.message}
          />
          <Input
            label="Email (Optional)"
            type="email"
            placeholder="e.g. customer@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="GST Number (Optional)"
            placeholder="15-character GSTIN (optional)"
            maxLength={15}
            className="uppercase"
            {...register('gstNumber', {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              }
            })}
            error={errors.gstNumber?.message}
          />
          <Input
            label="Opening Balance"
            type="number"
            step="0.01"
            {...register('openingBalance', { valueAsNumber: true })}
            error={errors.openingBalance?.message}
          />
          <Input
            label="Payment Terms (Days)"
            type="number"
            {...register('paymentTerms', { valueAsNumber: true })}
            error={errors.paymentTerms?.message}
          />
        </div>

        <div className="border-t border-gray-100 dark:border-[#1F2837] pt-5 mt-2">
          <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100 dark:border-[#1F2837]">
            <h4 className="font-serif font-bold text-base text-gray-900 dark:text-slate-100">Billing Address</h4>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">Optional</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Address Line 1 (Optional)"
              placeholder="Street address or building"
              {...register('address.addressLine1')}
              error={errors.address?.addressLine1?.message}
            />
            <Input
              label="Address Line 2 (Optional)"
              placeholder="Area, landmark or floor"
              {...register('address.addressLine2')}
              error={errors.address?.addressLine2?.message}
            />
            <Input
              label="City (Optional)"
              placeholder="City"
              {...register('address.city')}
              error={errors.address?.city?.message}
            />
            <Input
              label="State (Optional)"
              placeholder="State"
              {...register('address.state')}
              error={errors.address?.state?.message}
            />
            <Input
              label="Pincode (Optional)"
              placeholder="6-digit PIN"
              maxLength={6}
              {...register('address.pincode')}
              error={errors.address?.pincode?.message}
            />
            <Input
              label="Country (Optional)"
              placeholder="India"
              {...register('address.country')}
              error={errors.address?.country?.message}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
          <Button type="button" variant="outline" onClick={handleModalClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} className="w-full sm:w-auto">
            Save Customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
