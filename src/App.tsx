import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from './store/authStore';
import { Toaster } from './components/Toaster';
import { WelcomeOverlay } from './components/WelcomeOverlay';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Stock from './pages/Stock';
import Purchases from './pages/Purchases';
import PurchasePayments from './pages/PurchasePayments';
import Sales from './pages/Sales';
import SalePayments from './pages/SalePayments';
import Expenses from './pages/Expenses';
import Partners from './pages/Partners';
import ProfitDistribution from './pages/ProfitDistribution';
import Reports from './pages/Reports';
import StockTransactions from './pages/StockTransactions';
import ClientList from './pages/ClientList';
import ClientForm from './pages/ClientForm';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClientDetail from './pages/admin/ClientDetail';
import GlobalSales from './pages/admin/GlobalSales';
import GlobalPurchases from './pages/admin/GlobalPurchases';
import GlobalPayments from './pages/admin/GlobalPayments';
import GlobalInventory from './pages/admin/GlobalInventory';
import GlobalExpenses from './pages/admin/GlobalExpenses';
import AdminReports from './pages/admin/AdminReports';
import SystemHealth from './pages/admin/SystemHealth';
import { setupFieldAutoSelect } from './lib/fieldAutoSelect';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Component to handle silent refresh on initial load
function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const { accessToken, refreshToken, logout, updateTokens } = useAuthStore();

  // Standardize automatic field value selection on focus/click across all forms
  useEffect(() => {
    const cleanup = setupFieldAutoSelect();
    return cleanup;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      if (!accessToken || !refreshToken) {
        setIsInitializing(false);
        return;
      }

      try {
        // Decode JWT to check expiration (simple payload extraction)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (isExpired) {
          const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
          const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const data = res.data?.data || res.data;
          updateTokens(data.accessToken);
        }
      } catch (e) {
        // If decoding or refreshing fails, logout
        logout();
      } finally {
        setIsInitializing(false);
      }
    };

    initAuth();
  }, [accessToken, refreshToken, logout, updateTokens]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return <>{children}</>;
}

const ALL_ROLES = ['CLIENT', 'ADMIN'];
const ADMIN_ONLY = ['ADMIN'];

function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Dashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInitializer>
        <Router>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route element={<DashboardLayout />}>
              {/* Client & Shared Routes */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DashboardRoute /></ProtectedRoute>} />
              <Route path="/dashboard/customers" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Customers /></ProtectedRoute>} />
              <Route path="/dashboard/suppliers" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Suppliers /></ProtectedRoute>} />
              <Route path="/dashboard/stock" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Stock /></ProtectedRoute>} />
              <Route path="/dashboard/stock-transactions" element={<ProtectedRoute allowedRoles={ALL_ROLES}><StockTransactions /></ProtectedRoute>} />
              <Route path="/dashboard/purchases" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Purchases /></ProtectedRoute>} />
              <Route path="/dashboard/purchase-payments" element={<ProtectedRoute allowedRoles={ALL_ROLES}><PurchasePayments /></ProtectedRoute>} />
              <Route path="/dashboard/sales" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Sales /></ProtectedRoute>} />
              <Route path="/dashboard/sale-payments" element={<ProtectedRoute allowedRoles={ALL_ROLES}><SalePayments /></ProtectedRoute>} />
              <Route path="/dashboard/expenses" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Expenses /></ProtectedRoute>} />
              <Route path="/dashboard/partners" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Partners /></ProtectedRoute>} />
              <Route path="/dashboard/profit-distribution" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ProfitDistribution /></ProtectedRoute>} />
              <Route path="/dashboard/profit-sharing" element={<Navigate to="/dashboard/profit-distribution" replace />} />
              <Route path="/dashboard/profit sharing" element={<Navigate to="/dashboard/profit-distribution" replace />} />
              <Route path="/dashboard/profit%20sharing" element={<Navigate to="/dashboard/profit-distribution" replace />} />
              <Route path="/dashboard/profit distribution" element={<Navigate to="/dashboard/profit-distribution" replace />} />
              <Route path="/dashboard/profit%20distribution" element={<Navigate to="/dashboard/profit-distribution" replace />} />
              <Route path="/dashboard/reports" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Reports /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Profile /></ProtectedRoute>} />

              {/* Dedicated Admin Platform Routes */}
              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><ClientList /></ProtectedRoute>} />
              <Route path="/admin/clients/new" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><ClientForm /></ProtectedRoute>} />
              <Route path="/admin/clients/:publicId" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><ClientDetail /></ProtectedRoute>} />
              <Route path="/admin/sales" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><GlobalSales /></ProtectedRoute>} />
              <Route path="/admin/purchases" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><GlobalPurchases /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><GlobalPayments /></ProtectedRoute>} />
              <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><GlobalInventory /></ProtectedRoute>} />
              <Route path="/admin/expenses" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><GlobalExpenses /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><AdminReports /></ProtectedRoute>} />
              <Route path="/admin/system" element={<ProtectedRoute allowedRoles={ADMIN_ONLY}><SystemHealth /></ProtectedRoute>} />

              {/* Catch-all dashboard subroutes */}
              <Route path="*" element={<RootRedirect />} />
            </Route>

            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Router>
        <WelcomeOverlay />
        <Toaster />
      </AppInitializer>
    </QueryClientProvider>
  );
}

export default App;
