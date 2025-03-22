import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AuthProvider } from '@/contexts/AuthContext';
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import Plans from "./pages/plans/Plans";
import Affiliate from "./pages/affiliate/Affiliate";
import Payments from "./pages/payments/Payments";
import Withdrawals from "./pages/withdrawals/Withdrawals";
import Profile from "./pages/profile/Profile";
import MyRank from "@/pages/dashboard/MyRank";
import SupportPage from "./pages/support/SupportPage";
import PromotionsPage from "./pages/admin/promotions/PromotionsPage";
import Callback from "./pages/auth/Callback";

// Admin Routes
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/users/UsersPage";
import AffiliatesPage from "./pages/admin/affiliates/AffiliatesPage";
import PaymentsPage from "./pages/admin/payments/PaymentsPage";
import AdminWithdrawalsPage from "./pages/admin/withdrawals/AdminWithdrawalsPage";
import DepositsPage from "./pages/admin/deposits/DepositsPage";
import SettingsPage from "./pages/admin/settings/SettingsPage";
import AdminPlans from "@/pages/admin/plans/Plans";
import SupportManagePage from "./pages/admin/support/SupportManagePage"; // Add this import
import AdminNotices from "./pages/admin/notices/NoticesPage"; // Add this import

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/auth/login" replace />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/callback" element={<Callback />} />

              {/* Main Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/rank" element={<MyRank />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/support" element={<SupportPage />} />
              
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
            <Toaster />
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
