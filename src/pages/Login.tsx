import { useState, useRef, useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
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
import { DeveloperSignature } from '../components/DeveloperSignature';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const theme = useThemeStore((state) => state.theme);
  const triggerWelcome = useWelcomeStore((state) => state.triggerWelcome);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const selectionRef = useRef<{
    start: number;
    end: number;
    direction?: 'forward' | 'backward' | 'none';
    hadFocus: boolean;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestLoginDTO>({
    resolver: zodResolver(loginSchema),
  });

  const { ref: rhfPasswordRef, ...passwordRegister } = register('password');

  const saveCursorPosition = () => {
    const el = passwordInputRef.current;
    if (el) {
      selectionRef.current = {
        start: el.selectionStart ?? el.value.length,
        end: el.selectionEnd ?? el.value.length,
        direction: el.selectionDirection || undefined,
        hadFocus: document.activeElement === el,
      };
    }
  };

  const handleTogglePassword = () => {
    saveCursorPosition();
    setShowPassword((prev) => !prev);
  };

  useLayoutEffect(() => {
    if (!selectionRef.current || !passwordInputRef.current) return;
    const { start, end, direction, hadFocus } = selectionRef.current;
    selectionRef.current = null;
    const el = passwordInputRef.current;

    const restore = () => {
      if (hadFocus && document.activeElement !== el) {
        el.focus();
      }
      try {
        el.setSelectionRange(start, end, direction);
      } catch {
        // Ignore any browser-specific restriction
      }
    };

    restore();
    const rafId = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(rafId);
  }, [showPassword]);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data);
      const displayName = data.ownerName || data.userName || 'User';
      triggerWelcome(displayName);
      if (data.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
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
        setServerError(error.message || 'Incorrect email or password. Please check your details and try again.');
      }
    },
  });

  const onSubmit = (data: RequestLoginDTO) => {
    setServerError('');
    typewriterAudio.prime();
    mutation.mutate({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--color-surface-bg)] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:flex-none lg:w-1/2 xl:w-5/12">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <VyaparLogo
              size="lg"
              variant={theme === 'dark' ? 'on-dark' : 'on-light'}
              showText
              showSubtitle
              className="mb-2"
            />
            <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-serif text-gray-900 dark:text-slate-100">Sign in to your account</h2>
            <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-slate-400">
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
                type={showPassword ? 'text' : 'password'}
                {...passwordRegister}
                ref={(el) => {
                  rhfPasswordRef(el);
                  passwordInputRef.current = el;
                }}
                error={errors.password?.message}
                autoComplete="current-password"
                placeholder="••••••••"
                rightIcon={
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveCursorPosition();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors focus:outline-none pointer-events-auto cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
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

          {/* Form / Mobile Attribution Signature */}
          <div className="mt-8 pt-5 border-t border-gray-200/70 dark:border-slate-800/80 flex justify-center">
            <DeveloperSignature />
          </div>
        </div>
      </div>

      {/* Right side - Image/Branding */}
      <div className="hidden lg:block relative w-0 flex-1 bg-[var(--color-sidebar-bg)] overflow-hidden">
        {/* Subtle ambient lighting glows */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 rounded-full bg-[var(--color-primary)]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none" />

        <div className="absolute inset-0 flex flex-col justify-between p-12">
          {/* Top Status */}
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Enterprise Systems Active</span>
            </div>
          </div>

          {/* Center Stage */}
          <div className="max-w-2xl text-center space-y-8 mx-auto my-auto">
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

          {/* Bottom Attribution Badge */}
          <div className="flex justify-center">
            <DeveloperSignature className="bg-white/10 dark:bg-white/10 border-white/15 text-white shadow-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
