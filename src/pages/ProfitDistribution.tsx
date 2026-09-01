import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, History } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  getProfitDistributions, getLatestProfitDistribution, distributeProfit 
} from '../api/partner';
import { profitDistributionSchema, type RequestProfitDistributionDTO } from '../types/partner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Modal, Input, PageHeader, ErrorState, TableSkeleton, EmptyState, Skeleton
} from '@/components';
import { formatCurrency, formatDate } from '@/lib';
import { toast } from '../store/toastStore';

// ── Highlight Card Component ────────────────────────────────────────────────
function LatestDistributionCard() {
  const { data: latest, isLoading } = useQuery({
    queryKey: ['profit-distribution-latest'],
    queryFn: getLatestProfitDistribution,
    retry: false, // May 404 if none exists
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!latest) return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 h-48">
      <Calculator className="h-8 w-8 mb-3 opacity-50" />
      <p className="text-sm">No profit distribution has been run yet.</p>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">Latest Distribution</h3>
          <p className="text-xs text-gray-500">{formatDate(latest.fromDate)} to {formatDate(latest.toDate)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Net Profit</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(latest.netProfit)}</p>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wide">Financial Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Total Revenue:</span> <span className="font-medium">{formatCurrency(latest.totalRevenue)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Purchase Cost:</span> <span className="font-medium text-red-700">-{formatCurrency(latest.totalPurchaseCost)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Expenses:</span> <span className="font-medium text-red-700">-{formatCurrency(latest.totalExpenses)}</span></div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold"><span className="text-gray-900">Net Profit:</span> <span className="text-emerald-700">{formatCurrency(latest.netProfit)}</span></div>
          </div>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-400 mb-3 tracking-wide">Partner Shares</h4>
          <div className="space-y-2 text-sm">
            {latest.shares.map(s => (
              <div key={s.partnerPublicId} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                <span className="font-medium">{s.partnerName} <span className="text-xs text-gray-400 font-normal">({s.sharePercentageAtDistribution}%)</span></span>
                <span className="font-semibold text-emerald-700">{formatCurrency(s.shareAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ProfitDistribution() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: distributions = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profit-distributions'],
    queryFn: getProfitDistributions,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RequestProfitDistributionDTO>({
    resolver: zodResolver(profitDistributionSchema),
  });

  const mutation = useMutation({
    mutationFn: distributeProfit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profit-distributions'] });
      queryClient.invalidateQueries({ queryKey: ['profit-distribution-latest'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] }); // shares affect lifetime earnings
      setIsModalOpen(false);
      reset();
      toast.success('Profit distribution run successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to run distribution. Check for overlapping dates.'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit Distribution"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Calculator className="h-4 w-4" /> Run Distribution
          </Button>
        }
      />

      <LatestDistributionCard />

      <div className="pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-gray-400" />
          Distribution History
        </h3>
        
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <TableSkeleton columns={6} rows={4} />
          </div>
        ) : isError ? (
          <ErrorState message={(error as any)?.message || 'Failed to load history'} onRetry={() => refetch()} />
        ) : distributions.length === 0 ? (
          <EmptyState
            title="No past distributions found"
            description="Run a new profit distribution to see it here."
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Costs</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map(d => (
                  <TableRow key={d.publicId} className="hover:bg-gray-50">
                    <TableCell className="whitespace-nowrap">{formatDate(d.createdAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(d.fromDate)} to {formatDate(d.toDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(d.totalRevenue)}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-700">-{formatCurrency(d.totalPurchaseCost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-700">-{formatCurrency(d.totalExpenses)}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-emerald-700">{formatCurrency(d.netProfit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Run Distribution Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); reset(); }} title="Run Profit Distribution">
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Calculating profit will lock in revenue, costs, and expenses for the selected period, and distribute the net profit among active partners based on their current share percentage.
          </p>
          
          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
              {(mutation.error as any)?.message || 'Failed to run distribution. Check for overlapping dates.'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="From Date *" type="date" {...register('fromDate')} error={errors.fromDate?.message} />
            <Input label="To Date *" type="date" {...register('toDate')} error={errors.toDate?.message} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" isLoading={mutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              Calculate & Distribute
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
