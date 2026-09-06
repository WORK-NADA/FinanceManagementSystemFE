import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../components/Button';
import { VyaparLogo } from '../components/VyaparLogo';
import { useThemeStore } from '../store/themeStore';

export default function Unauthorized() {
  const navigate = useNavigate();
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#141A24] rounded-2xl shadow-xs border border-gray-200/90 dark:border-[#1F2837] p-8 text-center">
        <div className="flex justify-center mb-6">
          <VyaparLogo size="sm" variant={theme === 'dark' ? 'on-dark' : 'on-light'} showText onClick={() => navigate('/dashboard')} />
        </div>
        <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center mb-6 border border-red-100 dark:border-rose-900/40">
          <ShieldAlert className="h-8 w-8 text-red-500 dark:text-rose-400" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-slate-100 mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          No access to view this page. If you believe this is an error, please contact your administrator.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
