import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  AlertTriangle, 
  Layers, 
  Boxes 
} from 'lucide-react';
import { getPlatformStocks } from '../../api/admin';
import { 
  Input, 
  Badge, 
  PageHeader, 
  ErrorState, 
  EmptyState 
} from '../../components';

export default function GlobalInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  const { data: stocks = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platformStocks'],
    queryFn: getPlatformStocks,
  });

  const filteredStocks = stocks.filter((s) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term || s.rawMaterial?.toLowerCase().includes(term);
    const isLow = s.isLowStock || Number(s.currentQuantity) <= Number(s.minimumStockLevel || 0);
    const matchesLowStock = !filterLowStockOnly || isLow;
    return matchesSearch && matchesLowStock;
  });

  const totalLines = stocks.length;
  const lowStockCount = stocks.filter((s) => s.isLowStock || Number(s.currentQuantity) <= Number(s.minimumStockLevel || 0)).length;
  const totalQuantity = stocks.reduce((acc, s) => acc + (Number(s.currentQuantity) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Inventory & Stock Oversight"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Global Inventory' },
        ]}
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 dark:text-sky-400">
            <Boxes className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Total Cataloged Items</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {totalLines}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Raw material variants across tenants</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Warnings</span>
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {lowStockCount}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Items at or below reorder limit</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Physical Volume</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {totalQuantity.toLocaleString()} Units
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Aggregated warehouse stock</p>
        </div>
      </div>

      {/* Filters Strip */}
      <div className="p-4 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search raw material / item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterLowStockOnly}
              onChange={(e) => setFilterLowStockOnly(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
            />
            Show Low Stock Items Only ({lowStockCount})
          </label>
        </div>
      </div>

      {/* Stock Catalog Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200 dark:border-[#1F2837] animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as any)?.message || 'Failed to load platform inventory.'} onRetry={() => refetch()} />
      ) : filteredStocks.length === 0 ? (
        <EmptyState
          title="No stock items found"
          description="Try adjusting your search or low-stock filter."
        />
      ) : (
        <div className="w-full space-y-3">
          <div className="hidden lg:grid lg:grid-cols-[minmax(180px,2fr)_120px_130px_130px_110px] items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider select-none guide-bar-offwhite mb-1">
            <div>Item / Raw Material</div>
            <div>Measurement Unit</div>
            <div>Current Stock Level</div>
            <div>Reorder Threshold</div>
            <div className="text-right pr-2">Inventory Status</div>
          </div>

          {filteredStocks.map((stock) => {
            const isLow = stock.isLowStock || Number(stock.currentQuantity) <= Number(stock.minimumStockLevel || 0);
            const isDepleted = Number(stock.currentQuantity) <= 0;

            return (
              <div
                key={stock.publicId}
                className="bg-white dark:bg-[#141A24] rounded-2xl border border-gray-200/90 dark:border-[#1F2837] shadow-xs hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-[minmax(180px,2fr)_120px_130px_130px_110px] items-center gap-3 px-5 py-3.5 text-sm"
              >
                <div className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${isDepleted ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <span className="truncate">{stock.rawMaterial}</span>
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400">
                  <Badge variant="info" className="text-[10px]">
                    {stock.unit}
                  </Badge>
                </div>

                <div className="font-bold text-gray-900 dark:text-slate-100">
                  {Number(stock.currentQuantity).toLocaleString()} {stock.unit}
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400">
                  Min: {Number(stock.minimumStockLevel || 0).toLocaleString()} {stock.unit}
                </div>

                <div className="text-right pr-2">
                  <Badge 
                    variant={isDepleted ? 'danger' : isLow ? 'warning' : 'success'}
                    className="text-[10px]"
                  >
                    {isDepleted ? 'Depleted' : isLow ? 'Low Stock' : 'Optimal'}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
