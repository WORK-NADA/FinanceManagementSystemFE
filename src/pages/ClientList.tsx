import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, 
  Search, 
  Edit2, 
  Ban, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  Unlock, 
  Copy, 
  KeyRound 
} from 'lucide-react';
import { 
  getAllClients, 
  getClientByPublicId,
  updateClient, 
  deactivateClient, 
  reactivateClient 
} from '../api/user';
import { unlockClient } from '../api/admin';
import { 
  requestUpdateUserSchema, 
  type RequestUpdateUserDTO, 
  type ResponseUserDTO 
} from '../types/user';
import { 
  Button, 
  Input, 
  Badge, 
  PageHeader, 
  ErrorState, 
  EmptyState,
  Modal 
} from '../components';
import { formatDate } from '../lib';
import { toast } from '../store/toastStore';

export default function ClientList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<ResponseUserDTO | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showModalCurrentPassword, setShowModalCurrentPassword] = useState(false);
  const [showModalNewPassword, setShowModalNewPassword] = useState(false);

  const togglePasswordVisibility = (publicId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [publicId]: !prev[publicId] }));
  };

  const handleCopyPassword = (pwd?: string) => {
    if (!pwd) {
      toast.error('No password available to copy');
      return;
    }
    navigator.clipboard.writeText(pwd);
    toast.success('Password copied to clipboard!');
  };

  const { data: clients, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clients'],
    queryFn: getAllClients,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RequestUpdateUserDTO>({
    resolver: zodResolver(requestUpdateUserSchema),
  });

  const editMutation = useMutation({
    mutationFn: ({ publicId, data }: { publicId: string; data: RequestUpdateUserDTO }) =>
      updateClient(publicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated successfully.');
      handleCloseEditModal();
    },
    onError: (err: any) => {
      if (err.code === 'VALIDATION_ERROR' && err.fieldErrors) {
        Object.keys(err.fieldErrors).forEach((key) => {
          if (key.startsWith('userAddress.')) {
            const nestedKey = key.split('.')[1] as any;
            setError(`userAddress.${nestedKey}` as any, {
              type: 'server',
              message: err.fieldErrors[key],
            });
          } else {
            setError(key as any, {
              type: 'server',
              message: err.fieldErrors[key],
            });
          }
        });
      } else {
        toast.error(err.message || 'Failed to update client.');
      }
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ publicId, enabled }: { publicId: string; enabled: boolean }) =>
      enabled ? deactivateClient(publicId) : reactivateClient(publicId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Client ${variables.enabled ? 'deactivated' : 'reactivated'} successfully.`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update client status.');
    },
  });

  const handleOpenEditModal = async (client: ResponseUserDTO) => {
    setLoadingEditId(client.publicId);
    let clientToEdit = client;

    // Fetch full client details to guarantee address and all fields are loaded
    try {
      const fullDetails = await getClientByPublicId(client.publicId);
      if (fullDetails) {
        clientToEdit = fullDetails;
      }
    } catch {
      // Fall back to client row data if individual fetch fails
    } finally {
      setLoadingEditId(null);
    }

    setEditingClient(clientToEdit);
    setShowModalCurrentPassword(false);
    setShowModalNewPassword(false);
    reset({
      ownerName: clientToEdit.ownerName || clientToEdit.username || '',
      email: clientToEdit.email || '',
      mobileNumber: clientToEdit.mobileNumber || '',
      newPassword: '',
      userAddress: {
        houseNo: clientToEdit.userAddress?.houseNo || '',
        societyName: clientToEdit.userAddress?.societyName || '',
        area: clientToEdit.userAddress?.area || '',
        city: clientToEdit.userAddress?.city || '',
        state: clientToEdit.userAddress?.state || '',
        country: clientToEdit.userAddress?.country || 'India',
        pincode: clientToEdit.userAddress?.pincode || '',
      },
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingClient(null);
    setShowModalCurrentPassword(false);
    setShowModalNewPassword(false);
    reset();
  };

  const onEditSubmit = (data: RequestUpdateUserDTO) => {
    if (!editingClient) return;
    editMutation.mutate({ publicId: editingClient.publicId, data });
  };

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  const unlockMutation = useMutation({
    mutationFn: (publicId: string) => unlockClient(publicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client account unlocked successfully.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to unlock client account.');
    },
  });

  const filteredClients = clients
    ?.filter((c) => c.role === 'CLIENT')
    ?.filter((c) => {
      if (statusFilter === 'ACTIVE') return c.enabled;
      if (statusFilter === 'DISABLED') return !c.enabled;
      return true;
    })
    ?.filter((c) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        c.ownerName?.toLowerCase().includes(term) ||
        c.username?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.mobileNumber?.toLowerCase().includes(term) ||
        c.role?.toLowerCase().includes(term)
      );
    }) ?? [];

  const totalCount = clients?.filter((c) => c.role === 'CLIENT').length || 0;
  const activeCount = clients?.filter((c) => c.role === 'CLIENT' && c.enabled).length || 0;
  const disabledCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Management"
        action={
          <Button onClick={() => navigate('/admin/clients/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Register New Client
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-[#141A24] rounded-xl border border-gray-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto no-scrollbar touch-pan-x whitespace-nowrap">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Clients ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DISABLED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              statusFilter === 'DISABLED'
                ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            Disabled ({disabledCount})
          </button>
        </div>

        {/* Search input */}
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by name, username, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/80 dark:border-[#1F2837] shadow-xs animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load clients'} onRetry={() => refetch()} />
      ) : filteredClients.length === 0 ? (
        <EmptyState
          title="No clients found"
          description="Try adjusting your search query or status filter."
        />
      ) : (
        <div className="w-full space-y-3">
          {/* Column Header Guide Bar (hidden on mobile/tablet) */}
          <div className="hidden lg:grid lg:grid-cols-[110px_minmax(130px,1.3fr)_minmax(130px,1.1fr)_105px_minmax(120px,1fr)_70px_70px_85px_110px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div>Public ID</div>
            <div>Name / Username</div>
            <div>Email</div>
            <div>Mobile</div>
            <div>Password</div>
            <div>Role</div>
            <div>Status</div>
            <div>Created At</div>
            <div className="text-right pr-2">Actions</div>
          </div>

          {/* List of Floating Cards */}
          {filteredClients.map((client) => (
            <div
              key={client.publicId}
              className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700 transition-all overflow-hidden"
            >
              {/* Desktop view (hidden on < lg) */}
              <div className="hidden lg:grid lg:grid-cols-[110px_minmax(130px,1.3fr)_minmax(130px,1.1fr)_105px_minmax(120px,1fr)_70px_70px_85px_110px] items-center gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-gray-600 dark:text-slate-300 bg-gray-100/90 dark:bg-[#0E131C] px-2 py-0.5 rounded border border-gray-200/80 dark:border-[#1F2837] inline-block truncate max-w-[110px]" title={client.publicId}>
                    {client.publicId}
                  </span>
                </div>
                <div className="truncate min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/clients/${client.publicId}`)}
                    className="font-semibold text-sm text-gray-900 dark:text-slate-100 hover:text-[var(--color-primary)] truncate text-left cursor-pointer transition-colors block"
                    title="Click to view 360° Profile"
                  >
                    {client.ownerName || client.username}
                  </button>
                  {client.ownerName && <div className="text-xs text-gray-500 dark:text-slate-400 truncate">@{client.username}</div>}
                </div>
                <div className="text-sm text-gray-700 dark:text-slate-300 truncate min-w-0" title={client.email}>{client.email}</div>
                <div className="text-sm text-gray-700 dark:text-slate-200 font-medium truncate min-w-0">{client.mobileNumber}</div>
                
                {/* Client Password Column */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100/90 dark:bg-[#0E131C] border border-gray-200/80 dark:border-[#1F2837] text-gray-800 dark:text-slate-200 select-all truncate max-w-[85px]">
                    {client.viewablePassword ? (
                      visiblePasswords[client.publicId] ? (
                        client.viewablePassword
                      ) : (
                        '••••••••'
                      )
                    ) : (
                      <span className="text-gray-400 dark:text-slate-500 italic text-[11px]">Not Set</span>
                    )}
                  </span>
                  {client.viewablePassword && (
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(client.publicId)}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors rounded cursor-pointer"
                        title={visiblePasswords[client.publicId] ? 'Hide password' : 'Show password'}
                        aria-label={visiblePasswords[client.publicId] ? 'Hide password' : 'Show password'}
                      >
                        {visiblePasswords[client.publicId] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(client.viewablePassword)}
                        className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded cursor-pointer"
                        title="Copy password"
                        aria-label="Copy password"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <Badge variant="info">
                    {client.role}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <Badge variant={client.enabled ? 'success' : 'default'}>
                    {client.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap min-w-0">
                  {formatDate(client.createdAt)}
                </div>
                <div className="flex items-center justify-end gap-1 min-w-0">
                  {/* 360 View Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    onClick={() => navigate(`/admin/clients/${client.publicId}`)}
                    title="Inspect Client 360° Profile"
                    aria-label={`Inspect ${client.ownerName || client.username}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-blue-50 dark:hover:bg-sky-950/30 transition-colors"
                    onClick={() => handleOpenEditModal(client)}
                    disabled={loadingEditId === client.publicId}
                    title="Edit Client Details"
                    aria-label={`Edit ${client.ownerName || client.username}`}
                  >
                    {loadingEditId === client.publicId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500 dark:text-slate-400" />
                    ) : (
                      <Edit2 className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {/* Status Toggle Button */}
                  {client.role !== 'ADMIN' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 transition-colors ${client.enabled ? "text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/30" : "text-gray-400 dark:text-slate-400 hover:text-green-600 dark:hover:text-emerald-400 hover:bg-green-50 dark:hover:bg-emerald-950/30"}`}
                      onClick={() => {
                        const action = client.enabled ? 'deactivate' : 'reactivate';
                        if (window.confirm(`Are you sure you want to ${action} this client (${client.ownerName || client.username})?`)) {
                          toggleStatusMutation.mutate({ publicId: client.publicId, enabled: client.enabled });
                        }
                      }}
                      disabled={toggleStatusMutation.isPending}
                      title={client.enabled ? 'Deactivate' : 'Reactivate'}
                      aria-label={client.enabled ? `Deactivate ${client.ownerName || client.username}` : `Reactivate ${client.ownerName || client.username}`}
                    >
                      {client.enabled ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}

                  {/* Unlock Account Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    onClick={() => {
                      if (window.confirm(`Reset lock status and failed attempts for client (${client.ownerName || client.username})?`)) {
                        unlockMutation.mutate(client.publicId);
                      }
                    }}
                    disabled={unlockMutation.isPending}
                    title="Unlock Client Account"
                    aria-label={`Unlock ${client.ownerName || client.username}`}
                  >
                    <Unlock className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Mobile & Tablet Card View (hidden on lg+) */}
              <div className="lg:hidden p-3.5 sm:p-4 space-y-3">
                {/* Top Row: Public ID, Role, Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-600 dark:text-slate-300 bg-gray-100/90 dark:bg-[#0E131C] px-2 py-0.5 rounded border border-gray-200/80 dark:border-[#1F2837]">
                      {client.publicId}
                    </span>
                    <Badge variant="info" className="text-[10px]">
                      {client.role}
                    </Badge>
                  </div>
                  <Badge variant={client.enabled ? 'success' : 'default'} className="text-[10px]">
                    {client.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>

                {/* Business Info */}
                <div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/clients/${client.publicId}`)}
                    className="font-semibold text-base text-gray-900 dark:text-slate-100 hover:text-[var(--color-primary)] text-left block"
                  >
                    {client.ownerName || client.username}
                  </button>
                  <p className="text-xs text-gray-500 dark:text-slate-400">@{client.username}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-600 dark:text-slate-300">
                    <span>{client.email}</span>
                    <span>•</span>
                    <span className="font-medium">{client.mobileNumber}</span>
                  </div>
                </div>

                {/* Credentials & Date Strip */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-[#0E131C] border border-gray-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">Password:</span>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white dark:bg-[#141A24] border border-gray-200 dark:border-slate-700 select-all">
                      {client.viewablePassword ? (
                        visiblePasswords[client.publicId] ? client.viewablePassword : '••••••••'
                      ) : (
                        <span className="text-gray-400 italic text-[10px]">Not Set</span>
                      )}
                    </span>
                    {client.viewablePassword && (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(client.publicId)}
                          className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                        >
                          {visiblePasswords[client.publicId] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(client.viewablePassword)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {formatDate(client.createdAt)}
                  </span>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5 h-8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                    onClick={() => navigate(`/admin/clients/${client.publicId}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs gap-1.5 h-8 text-blue-700 dark:text-sky-400 border-blue-200 dark:border-blue-900/50"
                    onClick={() => handleOpenEditModal(client)}
                    disabled={loadingEditId === client.publicId}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {client.role !== 'ADMIN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs gap-1 h-8 px-2.5 ${client.enabled ? 'text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' : 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'}`}
                      onClick={() => {
                        const action = client.enabled ? 'deactivate' : 'reactivate';
                        if (window.confirm(`Are you sure you want to ${action} this client (${client.ownerName || client.username})?`)) {
                          toggleStatusMutation.mutate({ publicId: client.publicId, enabled: client.enabled });
                        }
                      }}
                    >
                      {client.enabled ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 h-8 px-2.5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                    onClick={() => {
                      if (window.confirm(`Reset lock status and failed attempts for client (${client.ownerName || client.username})?`)) {
                        unlockMutation.mutate(client.publicId);
                      }
                    }}
                  >
                    <Unlock className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Client Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit Client"
        className="max-w-3xl"
      >
        {editingClient && (
          <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-6">
            {/* Context Info Banner */}
            <div className="bg-gray-50 dark:bg-[#0E131C] rounded-lg p-3 border border-gray-200 dark:border-[#1F2837] flex flex-wrap gap-4 text-xs text-gray-600 dark:text-slate-300">
              <div>
                <span className="text-gray-400 dark:text-slate-400">Username: </span>
                <span className="font-semibold text-gray-800 dark:text-slate-200">@{editingClient.username}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-slate-400">Public ID: </span>
                <span className="font-mono text-gray-800 dark:text-slate-200">{editingClient.publicId}</span>
              </div>
              <div>
                <span className="text-gray-400 dark:text-slate-400">Role: </span>
                <span className="font-semibold text-blue-700 dark:text-sky-400">{editingClient.role}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-slate-100 border-b border-gray-200 dark:border-[#1F2837] pb-2">Account Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="Owner Name *"
                  {...register('ownerName')}
                  error={errors.ownerName?.message}
                />
                <Input
                  label="Email Address *"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                />
                <Input
                  label="Mobile Number *"
                  {...register('mobileNumber')}
                  error={errors.mobileNumber?.message}
                />
              </div>

              {/* Password Management Section */}
              <h4 className="font-medium text-gray-900 dark:text-slate-100 border-b border-gray-200 dark:border-[#1F2837] pb-2 pt-2 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" />
                Account Credentials & Password
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-amber-50/40 dark:bg-amber-950/10 p-3 sm:p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">
                    Current Password (Admin View)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 font-mono text-xs px-3 py-2 rounded-lg bg-white dark:bg-[#0E131C] border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 select-all truncate">
                      {editingClient.viewablePassword ? (
                        showModalCurrentPassword ? editingClient.viewablePassword : '••••••••'
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 italic">Not set (legacy account)</span>
                      )}
                    </div>
                    {editingClient.viewablePassword && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setShowModalCurrentPassword(!showModalCurrentPassword)}
                          title={showModalCurrentPassword ? 'Hide password' : 'Show password'}
                        >
                          {showModalCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleCopyPassword(editingClient.viewablePassword)}
                          title="Copy password"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                    Live password kept in sync when updated by client or admin.
                  </p>
                </div>

                <div>
                  <Input
                    label="Reset Password (Optional)"
                    type={showModalNewPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep unchanged"
                    {...register('newPassword')}
                    error={errors.newPassword?.message}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowModalNewPassword(!showModalNewPassword)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 focus:outline-hidden"
                        tabIndex={-1}
                      >
                        {showModalNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special symbol.
                  </p>
                </div>
              </div>

              <h4 className="font-medium text-gray-900 dark:text-slate-100 border-b border-gray-200 dark:border-[#1F2837] pb-2 pt-2">Address Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <Input
                  label="House / Flat No. *"
                  {...register('userAddress.houseNo')}
                  error={errors.userAddress?.houseNo?.message}
                />
                <Input
                  label="Society / Building Name *"
                  {...register('userAddress.societyName')}
                  error={errors.userAddress?.societyName?.message}
                />
                <Input
                  label="Area / Locality *"
                  {...register('userAddress.area')}
                  error={errors.userAddress?.area?.message}
                />
                <Input
                  label="City *"
                  {...register('userAddress.city')}
                  error={errors.userAddress?.city?.message}
                />
                <Input
                  label="State *"
                  {...register('userAddress.state')}
                  error={errors.userAddress?.state?.message}
                />
                <Input
                  label="Country"
                  {...register('userAddress.country')}
                  error={errors.userAddress?.country?.message}
                  placeholder="India"
                />
                <Input
                  label="Pincode *"
                  {...register('userAddress.pincode')}
                  error={errors.userAddress?.pincode?.message}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-100 dark:border-[#1F2837]">
              <Button type="button" variant="outline" onClick={handleCloseEditModal} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" isLoading={editMutation.isPending} className="w-full sm:w-auto">
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
