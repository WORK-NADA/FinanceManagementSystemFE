import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
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
  UserPlus,
  User,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Pin,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { cn } from '@/lib/cn';
import { VyaparLogo } from '../components/VyaparLogo';
import { ThemeToggle } from '../components/ThemeToggle';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, profilePicture, logout } = useAuthStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop sidebar collapse & hover-to-expand state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vyapar_sidebar_collapsed');
      return saved !== null ? saved === 'true' : true; // default to collapsed rail mode
    } catch {
      return true;
    }
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vyapar_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Whether sidebar is visually in expanded state (pinned or hovered)
  const isEffectiveExpanded = !isCollapsed || isHovered;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on route changes
  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clientNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/dashboard/customers', icon: Users },
    { name: 'Suppliers', href: '/dashboard/suppliers', icon: UserSquare2 },
    { name: 'Inventory & Stock', href: '/dashboard/stock', icon: Package },
    { name: 'Stock History', href: '/dashboard/stock-transactions', icon: ArrowRightLeft },
    { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart },
    { name: 'Supplier Payments', href: '/dashboard/purchase-payments', icon: CreditCard },
    { name: 'Sales', href: '/dashboard/sales', icon: Receipt },
    { name: 'Customer Payments', href: '/dashboard/sale-payments', icon: Wallet },
    { name: 'Expenses', href: '/dashboard/expenses', icon: Landmark },
    { name: 'Reports', href: '/dashboard/reports', icon: PieChart },
    { name: 'Partners', href: '/dashboard/partners', icon: UserPlus },
    { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
    { name: 'Profit Sharing', href: '/dashboard/profit-distribution', icon: Wallet },
  ];

  const adminNavigation = [
    { name: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Client Management', href: '/admin/clients', icon: Users },
    { name: 'Global Sales', href: '/admin/sales', icon: Receipt },
    { name: 'Global Purchases', href: '/admin/purchases', icon: ShoppingCart },
    { name: 'Global Payments', href: '/admin/payments', icon: Wallet },
    { name: 'Global Inventory', href: '/admin/inventory', icon: Package },
    { name: 'Global Expenses', href: '/admin/expenses', icon: Landmark },
    { name: 'Platform Reports', href: '/admin/reports', icon: PieChart },
    { name: 'System Health', href: '/admin/system', icon: ShieldCheck },
  ];

  const navigation = user?.role === 'ADMIN' ? adminNavigation : clientNavigation;
  const defaultHome = user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';

  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)]">
      {/* Mobile sidebar */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarOpen ? "block" : "hidden")}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-72 bg-[var(--color-sidebar-bg)] p-6 transition-transform">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/70">
            <VyaparLogo
              size="sm"
              variant="on-dark"
              showText
              showSubtitle
              onClick={() => {
                setSidebarOpen(false);
                navigate(defaultHome);
              }}
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-6 flex flex-col gap-1.5 h-[calc(100vh-120px)] overflow-y-auto pb-safe">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center min-h-[44px] rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                    isActive ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>


      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => {
          if (isCollapsed) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isCollapsed) setIsHovered(false);
        }}
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col lg:bg-[var(--color-sidebar-bg)] lg:pt-5 lg:pb-4 border-r border-slate-800/80 select-none",
          "transition-[width,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isEffectiveExpanded
            ? isCollapsed
              ? "w-72 z-40 shadow-2xl shadow-black/70 border-r border-emerald-500/40"
              : "w-72 z-30 shadow-none"
            : "w-[76px] z-30 shadow-none"
        )}
        aria-label="Sidebar navigation"
      >
        {/* Upper-left branding & pin toggle */}
        <div
          className={cn(
            "flex shrink-0 items-center pb-5 border-b border-slate-800/70 transition-all duration-300",
            isEffectiveExpanded ? "px-5 justify-between" : "px-3 justify-center"
          )}
        >
          <div className="flex items-center min-w-0 overflow-hidden">
            <VyaparLogo
              size={isEffectiveExpanded ? "md" : "sm"}
              variant="on-dark"
              showText={isEffectiveExpanded}
              showSubtitle={isEffectiveExpanded}
              onClick={() => navigate(defaultHome)}
              className="transition-all duration-300 active:scale-[0.98]"
            />
          </div>

          {isEffectiveExpanded && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 shrink-0 ml-2 cursor-pointer"
              title={isCollapsed ? "Pin sidebar open" : "Collapse sidebar (hover to expand)"}
              aria-label={isCollapsed ? "Pin sidebar open" : "Collapse sidebar (hover to expand)"}
            >
              {isCollapsed ? (
                <Pin className="h-4 w-4 rotate-45 text-emerald-400 hover:text-emerald-300" />
              ) : (
                <PanelLeftClose className="h-4 w-4 text-slate-400 hover:text-white" />
              )}
            </button>
          )}
        </div>

        {/* Navigation items */}
        <div className="mt-5 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <nav
            className={cn(
              "flex-1 space-y-1 pb-8 transition-all duration-300",
              isEffectiveExpanded ? "px-3" : "px-2"
            )}
          >
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 mb-1",
                    isEffectiveExpanded ? "px-3.5 py-2.5" : "px-0 py-2.5 justify-center",
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white"
                  )}
                  title={!isEffectiveExpanded ? item.name : undefined}
                >
                  {/* Distinct active indicator pill */}
                  {isActive && (
                    <span
                      className={cn(
                        "absolute rounded-full bg-emerald-400 transition-all duration-300",
                        isEffectiveExpanded
                          ? "left-0 top-2 bottom-2 w-1 rounded-r-full"
                          : "left-1 top-2 bottom-2 w-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      )}
                    />
                  )}

                  {/* Icon with hover micro-scale */}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-emerald-300"
                    )}
                  />

                  {/* Tab label smoothly revealed on expansion */}
                  <span
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-all duration-300 ease-out font-medium",
                      isEffectiveExpanded
                        ? "ml-3.5 opacity-100 max-w-xs"
                        : "ml-0 opacity-0 max-w-0 pointer-events-none"
                    )}
                  >
                    {item.name}
                  </span>

                  {/* Subtle right indicator on hover when expanded */}
                  {isEffectiveExpanded && !isActive && (
                    <span className="ml-auto opacity-0 group-hover:opacity-100 text-emerald-400 text-xs transition-opacity duration-150 pr-1">
                      →
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User profile / Logout bottom */}
        <div
          className={cn(
            "border-t border-slate-800/80 transition-all duration-300 shrink-0",
            isEffectiveExpanded ? "p-4" : "p-2.5"
          )}
        >
          <div
            className={cn(
              "flex items-center transition-all duration-300",
              isEffectiveExpanded ? "gap-3 justify-between" : "justify-center"
            )}
          >
            <div
              onClick={() => navigate('/profile')}
              className={cn(
                "flex items-center rounded-xl cursor-pointer group hover:bg-slate-800/80 transition-all duration-200 min-w-0",
                isEffectiveExpanded ? "gap-3 flex-1 p-1.5 -m-1.5" : "p-1.5 justify-center"
              )}
              title="View My Profile"
            >
              <div className="relative shrink-0">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Avatar"
                    className="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-700"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-[var(--color-primary)] text-white font-serif font-bold text-xs flex items-center justify-center ring-1 ring-emerald-600/50">
                    {((user?.ownerName || user?.userName || 'U').charAt(0)).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>

              <div
                className={cn(
                  "min-w-0 transition-all duration-300 overflow-hidden",
                  isEffectiveExpanded
                    ? "flex-1 opacity-100 max-w-xs"
                    : "opacity-0 max-w-0 pointer-events-none"
                )}
              >
                <p className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
                  {user?.ownerName || user?.userName}
                </p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            {isEffectiveExpanded && (
              <button
                onClick={handleLogout}
                className="shrink-0 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-col flex-1 min-h-screen transition-[padding] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          isCollapsed ? "lg:pl-[76px]" : "lg:pl-72"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200/90 dark:border-slate-800/80 bg-white/95 dark:bg-[#0F1522]/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8 shadow-xs transition-colors duration-200">
          {/* Left section: mobile hamburger & breadcrumbs/title */}
          <div className="flex items-center gap-x-3">
            <button
              type="button"
              className="-m-2 p-2 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden transition-colors cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <VyaparLogo
                size="xs"
                variant={theme === 'dark' ? 'on-dark' : 'on-light'}
                showText
                className="lg:hidden shrink-0"
                onClick={() => navigate(defaultHome)}
              />
              <div className="flex items-center gap-1.5 min-w-0 max-w-[130px] sm:max-w-[240px] md:max-w-md lg:hidden">
                <span className="text-gray-300 dark:text-slate-600 text-xs shrink-0">/</span>
                <span className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-slate-200 truncate">
                  {location.pathname === '/profile' 
                    ? 'My Profile' 
                    : location.pathname === '/admin/dashboard'
                    ? 'Admin'
                    : location.pathname === '/admin/clients'
                    ? 'Clients'
                    : location.pathname === '/admin/clients/new'
                    ? 'New Client'
                    : location.pathname.startsWith('/admin/clients/')
                    ? 'Client 360°'
                    : location.pathname === '/admin/sales'
                    ? 'Global Sales'
                    : location.pathname === '/admin/purchases'
                    ? 'Global Purchases'
                    : location.pathname === '/admin/payments'
                    ? 'Global Payments'
                    : location.pathname === '/admin/inventory'
                    ? 'Global Inventory'
                    : location.pathname === '/admin/expenses'
                    ? 'Global Expenses'
                    : location.pathname === '/admin/reports'
                    ? 'Admin Reports'
                    : location.pathname === '/admin/system'
                    ? 'System Health'
                    : location.pathname.replace('/dashboard/', '').replace('/dashboard', 'Dashboard').replace('-', ' ') || 'Overview'}
                </span>
              </div>
              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="p-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors mr-0.5 cursor-pointer"
                  title={isCollapsed ? "Expand & pin sidebar" : "Collapse sidebar (hover to expand)"}
                  aria-label={isCollapsed ? "Expand & pin sidebar" : "Collapse sidebar (hover to expand)"}
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(defaultHome)}
                  className="font-devanagari font-bold text-gray-900 dark:text-slate-100 text-lg tracking-wide hover:text-[var(--color-primary)] transition-colors cursor-pointer"
                  title="व्यापार Dashboard"
                >
                  व्यापार
                </button>
                <span className="text-gray-300 dark:text-slate-600">/</span>
                <span className="font-medium text-gray-600 dark:text-slate-300 capitalize">
                  {location.pathname === '/profile' 
                    ? 'My Profile' 
                    : location.pathname === '/admin/dashboard'
                    ? 'Admin / Platform Overview'
                    : location.pathname === '/admin/clients'
                    ? 'Admin / Client Management'
                    : location.pathname === '/admin/clients/new'
                    ? 'Admin / Register Client'
                    : location.pathname.startsWith('/admin/clients/')
                    ? 'Admin / Client 360° Profile'
                    : location.pathname === '/admin/sales'
                    ? 'Admin / Global Sales'
                    : location.pathname === '/admin/purchases'
                    ? 'Admin / Global Purchases'
                    : location.pathname === '/admin/payments'
                    ? 'Admin / Global Payments'
                    : location.pathname === '/admin/inventory'
                    ? 'Admin / Global Inventory'
                    : location.pathname === '/admin/expenses'
                    ? 'Admin / Global Expenses'
                    : location.pathname === '/admin/reports'
                    ? 'Admin / Platform Reports'
                    : location.pathname === '/admin/system'
                    ? 'Admin / System Health'
                    : location.pathname.replace('/dashboard/', '').replace('/dashboard', 'Dashboard').replace('-', ' ') || 'Overview'}
                </span>
              </div>
            </div>
          </div>


          {/* Right section: Theme Toggle & User Profile Picture & Popover Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Top-Right Light/Dark Mode Theme Switcher */}
            <ThemeToggle />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                id="top-profile-menu-button"
                aria-expanded={profileMenuOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 sm:gap-3 p-1 sm:p-1.5 sm:pr-2.5 rounded-full hover:bg-gray-100/90 dark:hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700 cursor-pointer"
              >
                <div className="relative flex-shrink-0">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt={user?.ownerName || 'User profile'}
                      className="h-9 w-9 rounded-full object-cover border border-emerald-600/30 ring-2 ring-emerald-500/20 shadow-xs"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-[var(--color-primary)] text-white font-serif font-bold text-sm flex items-center justify-center ring-2 ring-emerald-500/20 shadow-xs">
                      {((user?.ownerName || user?.userName || 'U').charAt(0)).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-xs font-semibold text-gray-900 dark:text-slate-100 leading-tight truncate max-w-[130px]">
                    {user?.ownerName || user?.userName}
                  </span>
                  {user?.role === 'ADMIN' ? (
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 leading-tight">
                      Administrator
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400 dark:text-slate-400 font-mono leading-tight">
                      @{user?.userName}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-gray-400 dark:text-slate-400 transition-transform duration-200", profileMenuOpen && "rotate-180")} />
              </button>

              {/* Profile Dropdown Popover */}
              {profileMenuOpen && (
                <div 
                  id="top-profile-dropdown"
                  className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-72 origin-top-right rounded-2xl bg-white dark:bg-[#161F2C] p-2 shadow-xl ring-1 ring-black/5 dark:ring-white/5 focus:outline-hidden z-50 animate-in fade-in zoom-in-95 duration-150 border border-gray-100 dark:border-[#243245]"
                >
                  <div className="p-3 bg-gradient-to-br from-emerald-50/70 via-gray-50 to-white dark:from-emerald-950/40 dark:via-[#161F2E] dark:to-[#121824] rounded-xl mb-1 border border-emerald-100/60 dark:border-emerald-900/30">
                    <div className="flex items-center gap-3">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt="Profile avatar"
                          className="h-11 w-11 rounded-full object-cover border border-emerald-600/30 ring-2 ring-emerald-500/30 shadow-xs flex-shrink-0"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-[var(--color-primary)] text-white font-serif font-bold text-lg flex items-center justify-center shadow-xs flex-shrink-0">
                          {((user?.ownerName || user?.userName || 'U').charAt(0)).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                          {user?.ownerName || user?.userName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {user?.role === 'ADMIN' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                              Administrator
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400 dark:text-slate-400 font-mono">@{user?.userName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {/* Theme Switcher Row inside Dropdown */}
                    <div className="flex items-center justify-between px-3 py-2 text-sm rounded-xl hover:bg-emerald-50/50 dark:hover:bg-slate-800/60 transition-colors">
                      <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">Theme</span>
                      <ThemeToggle variant="segmented" />
                    </div>

                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/profile');
                      }}
                      id="menu-item-my-profile"
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white hover:bg-emerald-50/80 dark:hover:bg-slate-800/80 rounded-xl transition-colors text-left group cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block font-medium text-gray-900 dark:text-slate-100">My Profile</span>
                        <span className="block text-[11px] text-gray-400 dark:text-slate-400 font-normal">Edit details, password & photo</span>
                      </div>
                    </button>
                  </div>

                  <div className="my-1 border-t border-gray-100 dark:border-slate-800" />

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    id="menu-item-logout"
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 dark:text-rose-400 hover:bg-red-50/80 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-left group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-red-50 dark:bg-rose-950/50 text-red-600 dark:text-rose-400 group-hover:bg-red-100 dark:group-hover:bg-rose-900/50 transition-colors">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>

  );
}
