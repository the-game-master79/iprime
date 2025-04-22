import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, RequireAdminAuth } from "@/contexts/AdminAuthContext";
import { AuthProvider } from '@/contexts/AuthContext';
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import { AuthGuard } from '@/components/AuthGuard';
import { lazy, Suspense } from "react";
import DepositPage from "@/pages/deposit/DepositPage";
import SelectPairs from "./pages/trade/SelectPairs";
import { TradeRouteGuard } from "@/components/guards/TradeRouteGuard";
import { ChartView } from "@/pages/trade/ChartView";
import { useCacheFlush } from '@/hooks/use-cache-flush';
import Index from "./pages/Index";
import PrivacyPolicy from "@/pages/legal/PrivacyPolicy";
import TermsOfService from "@/pages/legal/TermsOfService";
import Contact from "@/pages/contact/Contact";
import { HelmetProvider } from 'react-helmet-async';
import MarginCalculator from "@/pages/trading/MarginCalculator";
import { ErrorBoundary } from 'react-error-boundary';

// Lazy load routes
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Plans = lazy(() => import("./pages/plans/Plans")); 
const Affiliate = lazy(() => import("./pages/affiliate/Affiliate"));
const Payments = lazy(() => import("./pages/payments/Payments"));
const Withdrawals = lazy(() => import("./pages/withdrawals/Withdrawals"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const MyRank = lazy(() => import("@/pages/dashboard/MyRank"));
const SupportPage = lazy(() => import("./pages/support/SupportPage"));
const Trade = lazy(() => import("./pages/trade/Trade"));

// Add new lazy imports
const TradingPage = lazy(() => import("@/pages/trading/TradingPage"));
const InvestingPage = lazy(() => import("@/pages/investing/InvestingPage")); 
const PartnersPage = lazy(() => import("@/pages/partners/PartnersPage"));
const CompanyPage = lazy(() => import("@/pages/company/CompanyPage"));

// Add admin lazy imports 
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const UsersPage = lazy(() => import("@/pages/admin/users/UsersPage"));
const AffiliatesPage = lazy(() => import("@/pages/admin/affiliates/AffiliatesPage")); 
const PaymentsPage = lazy(() => import("@/pages/admin/payments/PaymentsPage"));
const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/withdrawals/AdminWithdrawalsPage"));
const AdminDepositsPage = lazy(() => import("@/pages/admin/deposits/AdminDepositsPage"));
const PlansSubscriptionPage = lazy(() => import("@/pages/admin/plans-subscription/PlansSubscriptionPage"));
const AdminPlans = lazy(() => import("@/pages/admin/plans/Plans"));
const SettingsPage = lazy(() => import("@/pages/admin/settings/SettingsPage"));
const SupportManagePage = lazy(() => import("@/pages/admin/support/SupportManagePage"));
const AdminNotices = lazy(() => import("@/pages/admin/notices/NoticesPage"));
const PromotionsPage = lazy(() => import("@/pages/admin/promotions/PromotionsPage"));
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
import AdminPairs from "@/pages/admin/pairs/Pairs";

// Create a stable QueryClient instance outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2, // Increase retry attempts
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  }
});

// Create a stable Providers component
const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AdminAuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const App = () => {
  // Add cache flush hook at the top level
  useCacheFlush();

  return (
    <HelmetProvider>
      <Providers>
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Index />} />
            <Route path="/trading" element={<TradingPage />} />
            <Route path="/investing" element={<InvestingPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/margin-calculator" element={<MarginCalculator />} />
            <Route path="/auth/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<AuthGuard requireAuth><Dashboard /></AuthGuard>} />
            <Route path="/plans" element={<AuthGuard requireAuth><Plans /></AuthGuard>} />
            <Route path="/affiliate" element={<AuthGuard requireAuth><Affiliate /></AuthGuard>} />
            <Route path="/payments" element={<AuthGuard requireAuth><Payments /></AuthGuard>} />
            <Route path="/withdrawals" element={<AuthGuard requireAuth><Withdrawals /></AuthGuard>} />
            <Route path="/rank" element={<AuthGuard requireAuth><MyRank /></AuthGuard>} />
            <Route path="/deposit" element={<AuthGuard requireAuth><DepositPage /></AuthGuard>} />

            {/* Trade Routes */}
            <Route path="/trade/chart/:pair" element={
              <AuthGuard requireAuth>
                <TradeRouteGuard />
                <ChartView />
              </AuthGuard>
            } />
            <Route path="/trade/select" element={
              <AuthGuard requireAuth>
                <TradeRouteGuard />
                <SelectPairs />
              </AuthGuard>
            } />
            <Route path="/trade/:pair" element={
              <AuthGuard requireAuth>
                <TradeRouteGuard />
                <Trade />
              </AuthGuard>
            } />
            <Route path="/trade" element={
              <AuthGuard requireAuth>
                <TradeRouteGuard />
                <Trade />
              </AuthGuard>
            } />

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
                  <Route path="deposits" element={<AdminDepositsPage />} />
                  <Route path="plans" element={<AdminPlans />} />
                  <Route path="plans-subscription" element={<PlansSubscriptionPage />} />
                  <Route path="affiliates" element={<AffiliatesPage />} />
                  <Route path="notices" element={<AdminNotices />} />
                  <Route path="support" element={<SupportManagePage />} />
                  <Route path="promotions" element={<PromotionsPage />} />
                  <Route path="pairs" element={<AdminPairs />} />
                </Routes>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Providers>
    </HelmetProvider>
  );
};

export default App;
