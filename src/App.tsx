import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AuthProvider } from '@/contexts/AuthContext';
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Callback from "./pages/auth/Callback";
import AdminLogin from "./pages/admin/Login";
import { AuthGuard } from '@/components/AuthGuard';
import PromotionsPage from "./pages/admin/promotions/PromotionsPage";
import { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Lazy load routes
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Plans = lazy(() => import("./pages/plans/Plans")); 
const Affiliate = lazy(() => import("./pages/affiliate/Affiliate"));
const Payments = lazy(() => import("./pages/payments/Payments"));
const Withdrawals = lazy(() => import("./pages/withdrawals/Withdrawals"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const MyRank = lazy(() => import("@/pages/dashboard/MyRank"));
const SupportPage = lazy(() => import("./pages/support/SupportPage"));

// Lazy load admin routes
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const UsersPage = lazy(() => import("./pages/admin/users/UsersPage"));
const AffiliatesPage = lazy(() => import("./pages/admin/affiliates/AffiliatesPage"));
const PaymentsPage = lazy(() => import("./pages/admin/payments/PaymentsPage"));
const AdminWithdrawalsPage = lazy(() => import("./pages/admin/withdrawals/AdminWithdrawalsPage"));
const DepositsPage = lazy(() => import("./pages/admin/deposits/DepositsPage"));
const SettingsPage = lazy(() => import("./pages/admin/settings/SettingsPage"));
const AdminPlans = lazy(() => import("@/pages/admin/plans/Plans"));
const SupportManagePage = lazy(() => import("./pages/admin/support/SupportManagePage"));
const AdminNotices = lazy(() => import("./pages/admin/notices/NoticesPage"));

// Create a stable QueryClient instance outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  }
});

// Create a stable Providers component
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <AdminAuthProvider>
              {children}
            </AdminAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const App = () => {
  return (
    <Providers>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/callback" element={<Callback />} />

          {/* Routes that can be loaded before auth check */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/affiliate" element={<Affiliate />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/rank" element={<MyRank />} />
          
          {/* Strictly protected routes */}
          <Route path="/profile" element={
            <AuthGuard requireAuth>
              <Profile />
            </AuthGuard>
          } />
          <Route path="/support" element={
            <AuthGuard requireAuth>
              <SupportPage />
            </AuthGuard>
          } />
          
          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
                <Route path="deposits" element={<DepositsPage />} />
                <Route path="affiliates" element={<AffiliatesPage />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="notices" element={<AdminNotices />} />
                <Route path="support" element={<SupportManagePage />} />
                <Route path="promotions" element={<PromotionsPage />} />
              </Routes>
            }
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </Providers>
  );
};

export default App;
