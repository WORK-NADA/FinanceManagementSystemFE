import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import type { RequestLoginDTO } from '../types/auth';
import { loginSchema } from '../types/auth';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestLoginDTO>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      if (error.code === 'VALIDATION_ERROR' && error.fieldErrors) {
        Object.keys(error.fieldErrors).forEach((key) => {
          setError(key as keyof RequestLoginDTO, {
            type: 'server',
            message: error.fieldErrors[key],
          });
        });
      } else {
        setServerError(error.message || 'An unexpected error occurred during login.');
      }
    },
  });

  const onSubmit = (data: RequestLoginDTO) => {
    setServerError('');
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:w-1/2 xl:w-5/12">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <TrendingUp className="h-8 w-8" />
              <span className="text-2xl font-serif font-bold text-gray-900">FinanceMS</span>
            </div>
            <h2 className="mt-8 text-3xl font-serif text-gray-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage your wealth and business operations securely.
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                autoComplete="email"
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                autoComplete="current-password"
                placeholder="••••••••"
              />

              {serverError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {serverError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                isLoading={mutation.isPending || isSubmitting}
              >
                Sign in
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:block relative w-0 flex-1 bg-[var(--color-sidebar-bg)]">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-2xl text-center space-y-8">
            <h1 className="text-5xl font-serif text-white leading-tight">
              Premium Wealth & Business Management
            </h1>
            <p className="text-xl text-gray-400">
              Complete control over your finances, partners, stock, and expenses in one unified, secure platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
