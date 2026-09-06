import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { requestUserSchema, type RequestUserDTO, type ResponseUserDTO } from '../types/user';
import { registerClient } from '../api/user';
import { Button, Input, PageHeader, Card, CardContent, CardHeader, CardTitle } from '../components';

export default function ClientForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createdClient, setCreatedClient] = useState<ResponseUserDTO | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RequestUserDTO>({
    resolver: zodResolver(requestUserSchema),
    defaultValues: {
      role: 'CLIENT',
    },
  });

  const mutation = useMutation({
    mutationFn: registerClient,
    onSuccess: (data) => {
      setCreatedClient(data);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: any) => {
      if (error.code === 'VALIDATION_ERROR' && error.fieldErrors) {
        Object.keys(error.fieldErrors).forEach((key) => {
          if (key.startsWith('userAddress.')) {
            const nestedKey = key.split('.')[1] as any;
            setError(`userAddress.${nestedKey}` as any, {
              type: 'server',
              message: error.fieldErrors[key],
            });
          } else {
            setError(key as any, {
              type: 'server',
              message: error.fieldErrors[key],
            });
          }
        });
      }
    },
  });

  const onSubmit = (data: RequestUserDTO) => {
    mutation.mutate(data);
  };

  if (createdClient) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20">
          <CardHeader className="text-center pb-2 bg-transparent border-0">
            <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-[var(--color-primary)] rounded-full flex items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-emerald-900 dark:text-emerald-300 font-serif">Client Successfully Created!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-[#141A24] p-4 rounded-xl border border-emerald-100 dark:border-[#1F2837] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Public ID:</span>
                <span className="font-mono font-medium dark:text-slate-200">{createdClient.publicId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Name:</span>
                <span className="font-medium dark:text-slate-200">{createdClient.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Username:</span>
                <span className="font-medium dark:text-slate-200">{createdClient.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-slate-400">Email:</span>
                <span className="font-medium dark:text-slate-200">{createdClient.email}</span>
              </div>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <Button onClick={() => navigate('/admin/clients')}>Back to Clients List</Button>
              <Button variant="outline" onClick={() => setCreatedClient(null)}>Add Another Client</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Register New Client"
        breadcrumbs={[
          { label: 'Admin', href: '/dashboard' },
          { label: 'Clients', href: '/admin/clients' },
          { label: 'New Client' },
        ]}
      />

      {/*
        autoComplete="off" on the <form> prevents browsers from auto-filling
        this NEW CLIENT registration form with the currently logged-in admin's
        saved credentials (the pre-fill bug). Each field additionally carries an
        explicit autoComplete token — Chrome/Edge often ignore form-level "off",
        but the combination of "off" + field-level tokens covers all major browsers.
        "new-password" on the password field is the strongest browser signal that
        this is a registration context, not a login form.
      */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" autoComplete="off">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BE: @NotBlank + @Size(2-100) + @Pattern → REQUIRED */}
            <Input
              label="Owner Name *"
              {...register('ownerName')}
              error={errors.ownerName?.message}
              placeholder="John Doe"
              autoComplete="off"
            />
            {/* BE: @NotBlank + @Size(3-50) + @Pattern(starts with letter) → REQUIRED */}
            <Input
              label="Username *"
              {...register('username')}
              error={errors.username?.message}
              placeholder="johndoe123"
              autoComplete="username"
            />
            {/* BE: @NotBlank + @Email + @Size(max=100) → REQUIRED */}
            <Input
              label="Email Address *"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="john@example.com"
              autoComplete="email"
            />
            {/* BE: @NotBlank + @Pattern(^[6-9][0-9]{9}$) → REQUIRED */}
            <Input
              label="Mobile Number *"
              {...register('mobileNumber')}
              error={errors.mobileNumber?.message}
              placeholder="9876543210"
              autoComplete="tel"
            />
            {/* BE: @NotBlank + @Size(8-20) + @Pattern → REQUIRED */}
            <Input
              label="Password *"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="SecurePass!23"
              autoComplete="new-password"
              hint="8-20 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (@#$%^&+=!)"
            />
            {/*
              Role is always fixed to CLIENT on this form (not user-selectable).
              Shown as a read-only badge — not an editable input — so the admin
              understands this is informational only, not a field they can change.
              A hidden input keeps the RHF value wired for form submission.
            */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text-sub)]">Role</label>
              <div className="flex h-10 items-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-blue-100 text-blue-800 border border-blue-200">
                  CLIENT
                </span>
              </div>
              <input type="hidden" {...register('role')} value="CLIENT" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BE: @NotBlank + @Size(max=20) → REQUIRED */}
            <Input
              label="House / Flat No. *"
              {...register('userAddress.houseNo')}
              error={errors.userAddress?.houseNo?.message}
              autoComplete="address-line1"
            />
            {/* BE: @NotBlank + @Size(2-100) → REQUIRED */}
            <Input
              label="Society / Building Name *"
              {...register('userAddress.societyName')}
              error={errors.userAddress?.societyName?.message}
              autoComplete="off"
            />
            {/* BE: @NotBlank + @Size(2-100) → REQUIRED */}
            <Input
              label="Area / Locality *"
              {...register('userAddress.area')}
              error={errors.userAddress?.area?.message}
              autoComplete="off"
            />
            {/* BE: @NotBlank + @Size(2-100) → REQUIRED */}
            <Input
              label="City *"
              {...register('userAddress.city')}
              error={errors.userAddress?.city?.message}
              autoComplete="address-level2"
            />
            {/* BE: @NotBlank + @Size(2-100) → REQUIRED */}
            <Input
              label="State *"
              {...register('userAddress.state')}
              error={errors.userAddress?.state?.message}
              autoComplete="address-level1"
            />
            {/* BE: @Size(max=100) only — no @NotBlank → OPTIONAL */}
            <Input
              label="Country"
              {...register('userAddress.country')}
              error={errors.userAddress?.country?.message}
              autoComplete="country-name"
              placeholder="India"
            />
            {/* BE: @NotBlank + @Pattern(^[1-9][0-9]{5}$) → REQUIRED */}
            <Input
              label="Pincode *"
              {...register('userAddress.pincode')}
              error={errors.userAddress?.pincode?.message}
              autoComplete="postal-code"
              placeholder="380001"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/clients')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            Register Client
          </Button>
        </div>
      </form>
    </div>
  );
}
