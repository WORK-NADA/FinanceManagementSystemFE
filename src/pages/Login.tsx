import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { RequestLoginDTO } from '../types/auth';
import { loginSchema } from '../types/auth';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useWelcomeStore } from '../store/welcomeStore';
import { typewriterAudio } from '../lib/typewriterAudio';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { VyaparLogo } from '../components/VyaparLogo';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const theme = useThemeStore((state) => state.theme);
  const triggerWelcome = useWelcomeStore((state) => state.triggerWelcome);
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
      const displayName = data.ownerName || data.userName || 'User';
      triggerWelcome(displayName);
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
    typewriterAudio.prime();
    mutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:w-1/2 xl:w-5/12">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <VyaparLogo
              size="lg"
              variant={theme === 'dark' ? 'on-dark' : 'on-light'}
              showText
              showSubtitle
              className="mb-2"
            />
            <h2 className="mt-6 text-3xl font-serif text-gray-900 dark:text-slate-100">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Official व्यापार enterprise business, finance &amp; ERP management platform.
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
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 text-sm rounded-md border border-red-200 dark:border-rose-900/50">
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
      <div className="hidden lg:block relative w-0 flex-1 bg-[var(--color-sidebar-bg)] overflow-hidden">
        {/* Subtle ambient lighting glows */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-[var(--color-primary)]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none" />

        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-2xl text-center space-y-8">
            <div className="flex justify-center mb-2">
              <VyaparLogo size="xl" variant="on-dark" showText showSubtitle />
            </div>
            <h1 className="text-5xl font-serif text-white leading-tight">
              व्यापार — Enterprise Business &amp; Finance ERP
            </h1>
            <p className="text-xl text-gray-300 max-w-xl mx-auto font-light leading-relaxed">
              Complete control over your finances, partners, inventory, sales, and expenses in one unified, secure platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
