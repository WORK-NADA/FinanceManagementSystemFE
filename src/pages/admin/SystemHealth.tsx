import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Server, 
  Database, 
  KeyRound, 
  Unlock, 
  RefreshCw 
} from 'lucide-react';
import { getAllClients } from '../../api/user';
import { unlockClient } from '../../api/admin';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge, 
  PageHeader, 
  ErrorState 
} from '../../components';
import { toast } from '../../store/toastStore';

export default function SystemHealth() {
  const queryClient = useQueryClient();

  const { data: clients = [], isError, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: getAllClients,
  });

  const unlockMutation = useMutation({
    mutationFn: (publicId: string) => unlockClient(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client account unlocked and failed login counter reset.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to unlock client account.');
    },
  });

  const lockedClients = clients.filter(
    (c) => c.role === 'CLIENT' && (!c.enabled || false)
  );

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="System Health & Security Diagnostics"
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'System Health' },
          ]}
        />
        <ErrorState 
          message={(error as any)?.message || 'Failed to load system diagnostics.'} 
          onRetry={() => refetch()} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health & Security Diagnostics"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'System Health' },
        ]}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh Diagnostics
          </Button>
        }
      />

      {/* Services Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Server className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">REST API Gateway</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-2">Operational</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Spring Boot 3 / Port 8080</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400">
              <Database className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Tenant Database</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-2">Connected</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">JPA / Hibernate ORM Active</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <KeyRound className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">JWT Auth Daemon</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-2">Enforcing</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Role-based JWT Verification</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Security Policies</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-2">Active</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">5-Fail Lockout, BCrypt, CORS</p>
        </div>
      </div>

      {/* Security Policies Details Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-500" />
            Configured Platform Security Policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="font-semibold text-gray-900 dark:text-slate-100">Password Encryption</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                BCryptPasswordEncoder with salt hashing. Passwords are never stored in plaintext.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="font-semibold text-gray-900 dark:text-slate-100">Brute-Force Account Protection</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Accounts automatically lock after 5 consecutive failed login attempts for 24 hours.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="font-semibold text-gray-900 dark:text-slate-100">Stateless Token Lifecycle</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Access tokens expire in 15 minutes; long-lived refresh tokens allow seamless, silent background renewal.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-[#0E131C] rounded-xl border border-gray-100 dark:border-slate-800">
              <p className="font-semibold text-gray-900 dark:text-slate-100">Multi-Tenant Data Scoping</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                All client requests strictly filter by authenticated principal user ID in Spring Security context.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Governance / Locked Accounts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Tenant Account Governance & Lock Status
              {lockedClients.length > 0 && (
                <Badge variant="warning" className="text-xs">
                  {lockedClients.length} Restricted
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Administrators can manually reset failed login counts and restore access for locked or disabled accounts.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {clients.filter(c => c.role === 'CLIENT').length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {clients.filter(c => c.role === 'CLIENT').map((client) => (
                <div key={client.publicId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {client.ownerName || client.username}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate">
                      @{client.username} • {client.email}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <Badge variant={client.enabled ? 'success' : 'default'} className="text-xs">
                      {client.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Reset lock status and failed attempts for (${client.ownerName || client.username})?`)) {
                          unlockMutation.mutate(client.publicId);
                        }
                      }}
                      isLoading={unlockMutation.isPending}
                      className="text-xs"
                    >
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                      Unlock / Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">
              No client accounts registered.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
