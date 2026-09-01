import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Wallet,
  Receipt,
  UserSquare2,
  Package,
  ShoppingCart,
  CreditCard,
  ArrowRightLeft,
  PieChart,
  Landmark,
  UserPlus
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { cn } from '@/lib/cn';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const commonNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    { name: 'Suppliers', href: '/dashboard/suppliers', icon: UserSquare2 },
    { name: 'Stock', href: '/dashboard/stock', icon: Package },
    { name: 'Stock Transactions', href: '/dashboard/stock-transactions', icon: ArrowRightLeft },
    { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart },
    { name: 'Purchase Pymt', href: '/dashboard/purchase-payments', icon: CreditCard },
    { name: 'Sales', href: '/dashboard/sales', icon: Receipt },
    { name: 'Sale Pymt', href: '/dashboard/sale-payments', icon: Wallet },
    { name: 'Expenses', href: '/dashboard/expenses', icon: Landmark },
    { name: 'Reports', href: '/dashboard/reports', icon: PieChart },
    { name: 'Partners', href: '/dashboard/partners', icon: UserPlus },
    { name: 'Profit Dist.', href: '/dashboard/profit-distribution', icon: Wallet },
  ];

  const adminNavigation = [
    { name: 'Clients', href: '/admin/clients', icon: Settings },
  ];

  const navigation = user?.role === 'ADMIN' 
    ? [...commonNavigation, ...adminNavigation]
    : commonNavigation;

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)]">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 bg-[var(--color-sidebar-bg)] p-6 transition-transform">
          <div className="flex items-center justify-between">
            <span className="text-xl font-serif font-bold text-white">FinanceMS</span>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-8 flex flex-col gap-2 h-[calc(100vh-120px)] overflow-y-auto pb-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                    isActive ? "bg-[var(--color-primary)] text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col lg:bg-[var(--color-sidebar-bg)] lg:pt-6 lg:pb-4">
        <div className="flex shrink-0 items-center px-6">
          <span className="text-2xl font-serif font-bold text-white">FinanceMS</span>
        </div>
        <div className="mt-8 flex flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 space-y-1 px-4 pb-8">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium mb-1",
                    isActive ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
        
        {/* User profile / Logout bottom */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center">
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-white truncate">{user?.ownerName || user?.userName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              <p className="text-xs text-[var(--color-accent)] mt-1">{user?.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-2 flex-shrink-0 p-2 text-gray-400 hover:text-white rounded-md hover:bg-gray-800"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex-1 text-lg font-serif font-semibold text-gray-900">FinanceMS</div>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
