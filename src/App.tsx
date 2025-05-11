import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
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

// Lazy load routes
const Platform = lazy(() => import("./pages/dashboard/Platform"));
const Plans = lazy(() => import("./pages/plans/Plans")); 
const Affiliate = lazy(() => import("./pages/affiliate/Affiliate"));
const Payments = lazy(() => import("./pages/payments/Payments"));
const Withdrawals = lazy(() => import("./pages/withdrawals/Withdrawals"));
const Profile = lazy(() => import("./pages/profile/Profile"));
const Trade = lazy(() => import("./pages/trade/Trade"));

// Add new lazy imports
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
const PromocodesPage = lazy(() => import("@/pages/admin/promotions/PromocodesPage"));
const Promotions = lazy(() => import("@/pages/promotions/Promotions")); // Add this line
const LiveRatesPage = lazy(() => import("@/pages/admin/live-rates/LiveRates"));
const TradesPage = lazy(() => import("@/pages/admin/trades/TradesPage")); // Add this line
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
import AdminPairs from "@/pages/admin/pairs/Pairs";

// Add Account import with other lazy imports
const Account = lazy(() => import("@/pages/account/Account")); 
const Performance = lazy(() => import("@/pages/performance/Performance"));
const DesignSystem = lazy(() => import("@/pages/design-system/DesignSystem")); // Add DesignSystem import

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
            <Route path="/investing" element={<InvestingPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth/login" element={<Login />} />

            {/* Protected Routes */}
            <Route path="/platform" element={<AuthGuard requireAuth><Platform /></AuthGuard>} />
            <Route path="/account" element={<AuthGuard requireAuth><Account /></AuthGuard>} />
            <Route path="/plans" element={<AuthGuard requireAuth><Plans /></AuthGuard>} />
            <Route path="/affiliate" element={<AuthGuard requireAuth><Affiliate /></AuthGuard>} />
            <Route path="/payments" element={<AuthGuard requireAuth><Payments /></AuthGuard>} />
            <Route path="/withdrawals" element={<AuthGuard requireAuth><Withdrawals /></AuthGuard>} />
            <Route path="/deposit" element={<AuthGuard requireAuth><DepositPage /></AuthGuard>} />
            <Route path="/promotions" element={<AuthGuard requireAuth><Promotions /></AuthGuard>} />

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
                  <Route path="promocodes" element={<PromocodesPage />} />
                  <Route path="pairs" element={<AdminPairs />} />
                  <Route path="trades" element={<TradesPage />} /> {/* Add this line */}
                  <Route path="live-rates" element={<LiveRatesPage />} /> {/* Add this line */}
                  <Route path="/performance" element={<Performance />} />
                </Routes>
              }
            />

            {/* Change Performance route from PrivateRoute to AuthGuard */}
            <Route path="/performance" element={
                <Performance />
            } />
            <Route path="/design" element={<DesignSystem />} /> {/* Add route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Providers>
    </HelmetProvider>
  );
};

export default App;
