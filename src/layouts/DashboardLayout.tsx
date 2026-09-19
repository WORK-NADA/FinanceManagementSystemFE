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
  GripVertical,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { cn } from '@/lib/cn';
import { VyaparLogo, VyaparIcon } from '../components/VyaparLogo';
import { DeveloperSignature } from '../components/DeveloperSignature';
import { ThemeToggle } from '../components/ThemeToggle';

export interface NavItemConfig {
  name: string;
  href: string;
  icon: any;
}

const CLIENT_FIXED_TOP: NavItemConfig[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

const CLIENT_MOVEABLE_DEFAULT: NavItemConfig[] = [
  { name: 'Sales', href: '/dashboard/sales', icon: Receipt },
  { name: 'Customer Payments', href: '/dashboard/sale-payments', icon: Wallet },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Purchases', href: '/dashboard/purchases', icon: ShoppingCart },
  { name: 'Supplier Payments', href: '/dashboard/purchase-payments', icon: CreditCard },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: UserSquare2 },
  { name: 'Inventory & Stock', href: '/dashboard/stock', icon: Package },
  { name: 'Stock History', href: '/dashboard/stock-transactions', icon: ArrowRightLeft },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Landmark },
];

const CLIENT_FIXED_BOTTOM: NavItemConfig[] = [
  { name: 'Reports', href: '/dashboard/reports', icon: PieChart },
  { name: 'Partners', href: '/dashboard/partners', icon: UserPlus },
  { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
  { name: 'Profit Sharing', href: '/dashboard/profit-distribution', icon: Wallet },
];

const ADMIN_FIXED_TOP: NavItemConfig[] = [
  { name: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
];

const ADMIN_MOVEABLE_DEFAULT: NavItemConfig[] = [
  { name: 'Client Management', href: '/admin/clients', icon: Users },
  { name: 'Global Sales', href: '/admin/sales', icon: Receipt },
  { name: 'Global Purchases', href: '/admin/purchases', icon: ShoppingCart },
  { name: 'Global Payments', href: '/admin/payments', icon: Wallet },
  { name: 'Global Inventory', href: '/admin/inventory', icon: Package },
  { name: 'Global Expenses', href: '/admin/expenses', icon: Landmark },
];

const ADMIN_FIXED_BOTTOM: NavItemConfig[] = [
  { name: 'Platform Reports', href: '/admin/reports', icon: PieChart },
  { name: 'System Health', href: '/admin/system', icon: ShieldCheck },
];

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

  const userIdentifier = user?.publicId || user?.email || user?.userName || 'user';
  const role = user?.role || 'CLIENT';
  const storageKey = `vyapar_sidebar_priority_tabs_${role}_${userIdentifier}`;

  const defaultMoveable = role === 'ADMIN' ? ADMIN_MOVEABLE_DEFAULT : CLIENT_MOVEABLE_DEFAULT;
  const fixedTop = role === 'ADMIN' ? ADMIN_FIXED_TOP : CLIENT_FIXED_TOP;
  const fixedBottom = role === 'ADMIN' ? ADMIN_FIXED_BOTTOM : CLIENT_FIXED_BOTTOM;

  const loadSavedMoveable = (): NavItemConfig[] => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedHrefs: string[] = JSON.parse(saved);
        if (Array.isArray(savedHrefs)) {
          const ordered: NavItemConfig[] = [];
          savedHrefs.forEach((href) => {
            const item = defaultMoveable.find((m) => m.href === href);
            if (item) ordered.push(item);
          });
          defaultMoveable.forEach((item) => {
            if (!ordered.some((o) => o.href === item.href)) {
              ordered.push(item);
            }
          });
          if (ordered.length === defaultMoveable.length) {
            return ordered;
          }
        }
      }
    } catch {
      // ignore
    }
    return defaultMoveable;
  };

  const [moveableTabs, setMoveableTabs] = useState<NavItemConfig[]>(loadSavedMoveable);

  useEffect(() => {
    setMoveableTabs(loadSavedMoveable());
  }, [storageKey, role]);

  const resetMoveableTabs = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setMoveableTabs(defaultMoveable);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const isCustomized = moveableTabs.some((t, i) => t.href !== defaultMoveable[i]?.href);

  // Drag and drop state
  const isDraggingRef = useRef(false);
  const draggedIndexRef = useRef<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    isDraggingRef.current = true;
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceIndex = draggedIndexRef.current ?? draggedIndex;
    if (sourceIndex === null || sourceIndex === targetIndex) {
      draggedIndexRef.current = null;
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const next = [...moveableTabs];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);

    setMoveableTabs(next);
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next.map((t) => t.href)));
    } catch {
      // ignore
    }
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 150);
  };

  const handleTabClick = (e: React.MouseEvent, href: string) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(href);
  };

  const defaultHome = role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';

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
          <nav className="mt-6 flex flex-col gap-1 h-[calc(100vh-120px)] overflow-y-auto pb-safe">
            {/* ── Section 1: Dashboard (Fixed Top) ── */}
            {fixedTop.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center min-h-[40px] rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-[0.98]",
                    isActive ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}

            {/* ── Section Divider: Dashboard -> Priority Tabs ── */}
            <div className="my-2 border-t border-slate-700/80 mx-1" />

            {/* ── Section 2: Priority Tabs Header ── */}
            <div className="flex items-center justify-between px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Priority Tabs</span>
              </div>
              {isCustomized && (
                <button
                  type="button"
                  onClick={resetMoveableTabs}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition-colors py-0.5 px-1.5 rounded hover:bg-slate-800"
                  title="Reset priority tabs"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* ── Section 2: Priority Tabs List (with Six-Dot Drag Handle) ── */}
            <div
              className="flex flex-col gap-1"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                if (e.target === e.currentTarget && draggedIndexRef.current !== null) {
                  handleDrop(e, moveableTabs.length - 1);
                }
              }}
            >
              {moveableTabs.map((item, index) => {
                const isActive = location.pathname === item.href;
                const isBeingDragged = draggedIndex === index;
                const isDragOver = dragOverIndex === index && draggedIndex !== index;
                const isOverAbove = isDragOver && index < (draggedIndex ?? 0);
                const isOverBelow = isDragOver && index > (draggedIndex ?? 0);

                return (
                  <div
                    key={item.name}
                    role="button"
                    tabIndex={0}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      handleTabClick(e, item.href);
                      if (!isDraggingRef.current) setSidebarOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSidebarOpen(false);
                        navigate(item.href);
                      }
                    }}
                    className={cn(
                      "group flex items-center min-h-[40px] rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-[0.98] select-none cursor-grab active:cursor-grabbing",
                      isActive ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40" : "text-gray-300 hover:bg-gray-800 hover:text-white",
                      isBeingDragged && "opacity-40 scale-[0.98] ring-1 ring-dashed ring-emerald-400",
                      isOverAbove && "border-t-2 border-emerald-400 bg-emerald-950/30",
                      isOverBelow && "border-b-2 border-emerald-400 bg-emerald-950/30"
                    )}
                  >
                    <item.icon className={cn("mr-2.5 h-5 w-5 flex-shrink-0 pointer-events-none", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                    <GripVertical className="mr-1.5 h-4 w-4 text-slate-400 group-hover:text-emerald-300 shrink-0 pointer-events-none" aria-hidden="true" />
                    <span className="truncate pointer-events-none">{item.name}</span>
                  </div>
                );
              })}
            </div>

            {/* ── Section Divider: Priority Tabs -> Fixed Tabs ── */}
            <div className="my-2 border-t border-slate-700/80 mx-1" />

            {/* ── Section 3: Fixed Tabs Header ── */}
            <div className="flex items-center justify-between px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-slate-500" />
                <span>Fixed Tabs</span>
              </div>
            </div>

            {/* ── Section 3: Fixed Tabs List (No Drag Handle) ── */}
            {fixedBottom.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center min-h-[40px] rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-[0.98]",
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
        <div className="mt-3 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <nav
            className={cn(
              "flex-1 space-y-0.5 pb-6 transition-all duration-300",
              isEffectiveExpanded ? "px-3" : "px-2"
            )}
          >
            {/* ── Fixed Top Tabs ── */}
            {fixedTop.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 my-0.5",
                    isEffectiveExpanded ? "px-3 py-2" : "px-0 py-2 justify-center",
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white"
                  )}
                  title={!isEffectiveExpanded ? item.name : undefined}
                >
                  {isActive && (
                    <span
                      className={cn(
                        "absolute rounded-full bg-emerald-400 transition-all duration-300",
                        isEffectiveExpanded
                          ? "left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                          : "left-1 top-1.5 bottom-1.5 w-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      )}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-300"
                    )}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-all duration-300 ease-out font-medium",
                      isEffectiveExpanded
                        ? "ml-3 opacity-100 max-w-xs"
                        : "ml-0 opacity-0 max-w-0 pointer-events-none"
                    )}
                  >
                    {item.name}
                  </span>
                  {isEffectiveExpanded && !isActive && (
                    <span className="ml-auto opacity-0 group-hover:opacity-100 text-emerald-400 text-xs transition-opacity duration-150 pr-1">
                      →
                    </span>
                  )}
                </NavLink>
              );
            })}

            {/* ── Section Divider: Dashboard -> Priority Tabs ── */}
            <div className="my-2 border-t border-slate-700/80 mx-1" />

            {/* ── Section 2: Priority Tabs Header ── */}
            {isEffectiveExpanded ? (
              <div className="flex items-center justify-between px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Priority Tabs</span>
                </div>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={resetMoveableTabs}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer py-0.5 px-1.5 rounded hover:bg-slate-800"
                    title="Reset priority tabs to default order"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="my-1.5 border-t border-slate-700/80 mx-2" />
            )}

            {/* ── Section 2: Priority Tabs List (Drag-and-Drop Only) ── */}
            <div
              className="space-y-0.5"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                if (e.target === e.currentTarget && draggedIndexRef.current !== null) {
                  handleDrop(e, moveableTabs.length - 1);
                }
              }}
            >
              {moveableTabs.map((item, index) => {
                const isActive = location.pathname === item.href;
                const isBeingDragged = draggedIndex === index;
                const isDragOver = dragOverIndex === index && draggedIndex !== index;
                const isOverAbove = isDragOver && index < (draggedIndex ?? 0);
                const isOverBelow = isDragOver && index > (draggedIndex ?? 0);

                return (
                  <div
                    key={item.name}
                    role="button"
                    tabIndex={0}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handleTabClick(e, item.href)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(item.href);
                      }
                    }}
                    className={cn(
                      "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 my-0.5 select-none cursor-grab active:cursor-grabbing",
                      isEffectiveExpanded ? "px-3 py-2" : "px-0 py-2 justify-center",
                      isActive
                        ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40"
                        : "text-slate-300 hover:bg-slate-800/90 hover:text-white",
                      isBeingDragged && "opacity-40 scale-[0.98] ring-1 ring-dashed ring-emerald-400",
                      isOverAbove && "border-t-2 border-emerald-400 bg-emerald-950/30",
                      isOverBelow && "border-b-2 border-emerald-400 bg-emerald-950/30"
                    )}
                    title={!isEffectiveExpanded ? item.name : undefined}
                  >
                    {isActive && (
                      <span
                        className={cn(
                          "absolute rounded-full bg-emerald-400 transition-all duration-300 pointer-events-none",
                          isEffectiveExpanded
                            ? "left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                            : "left-1 top-1.5 bottom-1.5 w-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        )}
                      />
                    )}

                    <item.icon
                      className={cn(
                        "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 pointer-events-none",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-300"
                      )}
                    />

                    {isEffectiveExpanded && (
                      <div className="flex items-center gap-2 ml-2.5 min-w-0 flex-1 pointer-events-none">
                        {/* Drag Handle Indicator beside tab name */}
                        <span title="Click and drag to reorder priority tab" className="inline-flex items-center">
                          <GripVertical
                            className="h-4 w-4 text-slate-400 group-hover:text-emerald-300 shrink-0 transition-colors"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="truncate font-medium">{item.name}</span>
                      </div>
                    )}

                    {isEffectiveExpanded && !isActive && (
                      <span className="ml-auto opacity-0 group-hover:opacity-100 text-emerald-400 text-xs transition-opacity duration-150 pr-1 pointer-events-none">
                        →
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Section Divider: Priority Tabs -> Fixed Tabs ── */}
            <div className="my-2 border-t border-slate-700/80 mx-1" />

            {/* ── Section 3: Fixed Tabs Header ── */}
            {isEffectiveExpanded && (
              <div className="flex items-center justify-between px-2.5 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-slate-500" />
                  <span>Fixed Tabs</span>
                </div>
              </div>
            )}

            {/* ── Section 3: Fixed Tabs List (No Drag Handle, Non-Movable) ── */}
            {fixedBottom.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200 my-0.5",
                    isEffectiveExpanded ? "px-3 py-2" : "px-0 py-2 justify-center",
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-950/40"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white"
                  )}
                  title={!isEffectiveExpanded ? item.name : undefined}
                >
                  {isActive && (
                    <span
                      className={cn(
                        "absolute rounded-full bg-emerald-400 transition-all duration-300",
                        isEffectiveExpanded
                          ? "left-0 top-1.5 bottom-1.5 w-1 rounded-r-full"
                          : "left-1 top-1.5 bottom-1.5 w-1 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                      )}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-300"
                    )}
                  />
                  <span
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-all duration-300 ease-out font-medium",
                      isEffectiveExpanded
                        ? "ml-3 opacity-100 max-w-xs"
                        : "ml-0 opacity-0 max-w-0 pointer-events-none"
                    )}
                  >
                    {item.name}
                  </span>
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
                  className="inline-flex items-center gap-1.5 font-devanagari font-bold text-gray-900 dark:text-slate-100 text-lg tracking-wide hover:text-[var(--color-primary)] transition-colors cursor-pointer group"
                  title="व्यापार Dashboard"
                >
                  <VyaparIcon size={24} variant={theme === 'dark' ? 'on-dark' : 'on-light'} className="shrink-0" />
                  <span>व्यापार</span>
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

        {/* Enterprise System Footer */}
        <footer className="mt-auto border-t border-gray-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-[#0c121e]/60 backdrop-blur-xs px-4 sm:px-6 lg:px-8 py-3 transition-colors">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              <span className="font-semibold text-gray-700 dark:text-slate-200">व्यापार</span>
              <span className="text-gray-300 dark:text-slate-700">•</span>
              <span>Enterprise ERP &amp; Finance Management</span>
              <span className="hidden md:inline text-gray-300 dark:text-slate-700">•</span>
              <span className="hidden md:inline text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Production Architecture</span>
            </div>
            <div className="shrink-0">
              <DeveloperSignature />
            </div>
          </div>
        </footer>
      </div>
    </div>

  );
}
