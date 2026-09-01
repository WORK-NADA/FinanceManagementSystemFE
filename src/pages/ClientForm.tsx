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
          // Attempt to map nested field errors if backend sends them flat
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
        <Card className="border-green-100 bg-green-50/30">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Client Successfully Created!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-green-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Public ID:</span>
                <span className="font-mono font-medium">{createdClient.publicId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Name:</span>
                <span className="font-medium">{createdClient.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Username:</span>
                <span className="font-medium">{createdClient.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{createdClient.email}</span>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Owner Name"
              {...register('ownerName')}
              error={errors.ownerName?.message}
              placeholder="John Doe"
            />
            <Input
              label="Username"
              {...register('username')}
              error={errors.username?.message}
              placeholder="johndoe123"
            />
            <Input
              label="Email Address"
              type="email"
              {...register('email')}
              error={errors.email?.message}
              placeholder="john@example.com"
            />
            <Input
              label="Mobile Number"
              {...register('mobileNumber')}
              error={errors.mobileNumber?.message}
              placeholder="9876543210"
            />
            <Input
              label="Password"
              type="password"
              {...register('password')}
              error={errors.password?.message}
              placeholder="SecurePass!23"
              hint="8-20 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char"
            />
            <Input
              label="Role"
              {...register('role')}
              disabled
              readOnly
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Address Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="House / Flat No."
              {...register('userAddress.houseNo')}
              error={errors.userAddress?.houseNo?.message}
            />
            <Input
              label="Society / Building Name"
              {...register('userAddress.societyName')}
              error={errors.userAddress?.societyName?.message}
            />
            <Input
              label="Area / Locality"
              {...register('userAddress.area')}
              error={errors.userAddress?.area?.message}
            />
            <Input
              label="City"
              {...register('userAddress.city')}
              error={errors.userAddress?.city?.message}
            />
            <Input
              label="State"
              {...register('userAddress.state')}
              error={errors.userAddress?.state?.message}
            />
            <Input
              label="Country"
              {...register('userAddress.country')}
              error={errors.userAddress?.country?.message}
            />
            <Input
              label="Pincode"
              {...register('userAddress.pincode')}
              error={errors.userAddress?.pincode?.message}
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
