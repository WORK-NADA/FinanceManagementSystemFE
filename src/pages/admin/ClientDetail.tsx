import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Receipt, 
  ShoppingCart, 
  ShieldCheck, 
  ShieldAlert, 
  Ban, 
  CheckCircle2, 
  Unlock, 
  Users, 
  Package, 
  CreditCard,
  Percent
} from 'lucide-react';
import { getClient360, unlockClient } from '../../api/admin';
import { deactivateClient, reactivateClient } from '../../api/user';
import { formatCurrency, formatDate } from '../../lib';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Badge, 
  ErrorState 
} from '../../components';
import { toast } from '../../store/toastStore';

export default function ClientDetail() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'purchases' | 'payments' | 'security'>('overview');

  const { data: client, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['client360', publicId],
    queryFn: () => getClient360(publicId!),
    enabled: !!publicId,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      enabled ? deactivateClient(id) : reactivateClient(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client360', publicId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Client ${variables.enabled ? 'deactivated' : 'reactivated'} successfully.`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update client status.');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => unlockClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client360', publicId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client account unlocked and failed login attempts reset.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to unlock client account.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-48 bg-gray-200 dark:bg-[#141A24] rounded-lg animate-pulse" />
        <div className="h-44 bg-white dark:bg-[#141A24] rounded-2xl animate-pulse border border-gray-200 dark:border-[#1F2837]" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-[#141A24] rounded-xl animate-pulse border border-gray-200 dark:border-[#1F2837]" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !client) {
    return (
      <ErrorState 
        message={(error as any)?.message || 'Failed to load client 360 profile.'} 
        onRetry={() => refetch()} 
      />
    );
  }

  const isLocked = client.accountNonLocked === false || (client.failedLoginAttempts && client.failedLoginAttempts >= 5);

  return (
    <div className="space-y-8">
      {/* Top Breadcrumbs & Back Button */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/admin/clients')}
          className="text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Back to Clients List
        </Button>
        <span className="font-mono text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-slate-700">
          UUID: {client.publicId}
        </span>
      </div>

      {/* Hero Profile Banner */}
      <div className="rounded-3xl bg-white dark:bg-[#141A24] border border-gray-200/90 dark:border-[#1F2837] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-serif font-bold text-2xl flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/20">
              {((client.ownerName || client.username || 'C').charAt(0)).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100 truncate">
                  {client.ownerName || client.username}
                </h1>
                <Badge variant={client.enabled ? 'success' : 'default'} className="text-xs">
                  {client.enabled ? 'Active Account' : 'Suspended'}
                </Badge>
                {isLocked && (
                  <Badge variant="danger" className="text-xs flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Account Locked
                  </Badge>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-sky-950 text-blue-800 dark:text-sky-300">
                  {client.role || 'CLIENT'}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-600 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="font-mono text-gray-400 dark:text-slate-500">@</span>
                  <span className="font-semibold text-gray-800 dark:text-slate-200">{client.username}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <span>{client.mobileNumber}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  <span>Joined {formatDate(client.createdAt)}</span>
                </span>
              </div>

              {client.address && (
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span className="truncate">
                    {[client.address.houseNo, client.address.societyName, client.address.area, client.address.city, client.address.state, client.address.pincode].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isLocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlockMutation.mutate(client.publicId)}
                isLoading={unlockMutation.isPending}
                className="border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              >
                <Unlock className="h-4 w-4 mr-1.5" />
                Unlock Account
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const action = client.enabled ? 'deactivate' : 'reactivate';
                if (window.confirm(`Are you sure you want to ${action} this client (${client.ownerName || client.username})?`)) {
                  toggleStatusMutation.mutate({ id: client.publicId, enabled: client.enabled });
                }
              }}
              isLoading={toggleStatusMutation.isPending}
              className={client.enabled ? "hover:border-rose-500 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" : "hover:border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"}
            >
              {client.enabled ? (
                <>
                  <Ban className="h-4 w-4 mr-1.5" />
                  Deactivate Client
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Reactivate Client
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Financial Health Rollup Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Opening Balance */}
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Opening Capital</p>
          <p className="text-base font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(client.openingBalance || 0)}
          </p>
        </div>

        {/* Gross Sales */}
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Sales Invoiced</p>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(client.totalGrossSales || 0)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{client.totalSalesCount || 0} invoices</p>
        </div>

        {/* Gross Purchases */}
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Purchases Billed</p>
          <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(client.totalGrossPurchases || 0)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{client.totalPurchasesCount || 0} bills</p>
        </div>

        {/* Net Profit */}
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Net Cash Profit</p>
          <p className={`text-base font-bold mt-1 ${
            (client.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(client.netProfit || 0)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Recv − Paid − OPEX</p>
        </div>

        {/* Receivables */}
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Receivables Due</p>
          <p className="text-base font-bold text-blue-600 dark:text-sky-400 mt-1">
            {formatCurrency(client.totalReceivables || 0)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Customer market credit</p>
        </div>

        {/* Current Balance */}
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Available Balance</p>
          <p className="text-base font-bold text-gray-900 dark:text-slate-100 mt-1">
            {formatCurrency(client.totalBalance || 0)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Continuous cash ledger</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 dark:border-slate-800">
        <nav className="flex space-x-6 overflow-x-auto text-sm font-semibold">
          {[
            { id: 'overview', label: 'Overview & Partners' },
            { id: 'sales', label: `Sales Invoices (${client.recentSales?.length || 0})` },
            { id: 'purchases', label: `Purchase Bills (${client.recentPurchases?.length || 0})` },
            { id: 'payments', label: `Payment Ledger (${client.recentPayments?.length || 0})` },
            { id: 'security', label: 'Security & Access' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-1 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Trading Entities Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-2xl border border-gray-200/70 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Total Customers</span>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{client.totalCustomers || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-2xl border border-gray-200/70 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Total Suppliers</span>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{client.totalSuppliers || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-2xl border border-gray-200/70 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Inventory Items</span>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{client.totalStockItems || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-[#0E131C] rounded-2xl border border-gray-200/70 dark:border-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Active Partners</span>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{client.totalPartners || 0}</p>
              </div>
            </div>
          </div>

          {/* Partnership Structure Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4 text-emerald-500" />
                Partnership Configuration & Profit Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.partners && client.partners.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">
                  {client.partners.map((partner) => (
                    <div key={partner.publicId} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{partner.partnerName}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{partner.mobileNumber} • {partner.email}</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <Badge variant="info" className="text-xs">
                            {partner.sharePercentage}% Share
                          </Badge>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            Withdrawn: {formatCurrency(partner.totalWithdrawn || 0)}
                          </p>
                        </div>
                        <Badge variant={partner.isActive ? 'success' : 'default'} className="text-xs">
                          {partner.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-slate-400 py-4 text-center">
                  No partners configured for this client yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'sales' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-500" />
              Recent Sales Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.recentSales && client.recentSales.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {client.recentSales.map((sale) => (
                  <div key={sale.publicId} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{sale.saleNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Customer: {sale.customerName} • {formatDate(sale.saleDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.totalAmount)}</p>
                      <div className="mt-1">
                        <Badge variant={sale.paymentStatus === 'PAID' ? 'success' : 'default'} className="text-[10px]">
                          {sale.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">
                No sales invoices found for this client.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'purchases' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-500" />
              Recent Purchase Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.recentPurchases && client.recentPurchases.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {client.recentPurchases.map((purchase) => (
                  <div key={purchase.publicId} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-slate-100">{purchase.purchaseNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Supplier: {purchase.supplierName} • {formatDate(purchase.purchaseDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(purchase.totalAmount)}</p>
                      <div className="mt-1">
                        <Badge variant={purchase.paymentStatus === 'PAID' ? 'success' : 'default'} className="text-[10px]">
                          {purchase.paymentStatus}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">
                No purchase bills found for this client.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Recorded Financial Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.recentPayments && client.recentPayments.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {client.recentPayments.map((payment) => (
                  <div key={payment.publicId} className="py-3 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={payment.paymentType === 'CUSTOMER_RECEIPT' ? 'success' : 'danger'} className="text-[10px]">
                          {payment.paymentType === 'CUSTOMER_RECEIPT' ? 'Receipt (Money In)' : 'Payment (Money Out)'}
                        </Badge>
                        <span className="font-semibold text-gray-900 dark:text-slate-100">{payment.referenceNumber || 'Cash/Auto'}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Party: {payment.partyName} • Mode: {payment.paymentMode} • {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${payment.paymentType === 'CUSTOMER_RECEIPT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-slate-400 py-6 text-center">
                No payments recorded for this client.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Account Security & Governance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-[#0E131C] border border-gray-200 dark:border-slate-800">
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Account Lock Status:</span>
                <p className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">
                  {client.accountNonLocked ? 'Account Unlocked (Normal)' : 'Account Locked'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Failed Consecutive Logins:</span>
                <p className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">
                  {client.failedLoginAttempts || 0} / 5 attempts
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Lock Expiry Time:</span>
                <p className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">
                  {client.lockTime ? formatDate(client.lockTime) : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-slate-400">Registered On:</span>
                <p className="font-semibold text-gray-900 dark:text-slate-100 mt-0.5">
                  {formatDate(client.createdAt)}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                onClick={() => unlockMutation.mutate(client.publicId)}
                isLoading={unlockMutation.isPending}
                className="text-xs"
              >
                <Unlock className="h-4 w-4 mr-1.5" />
                Reset Failed Logins & Unlock Account
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
