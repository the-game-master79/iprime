import { lazy, Suspense } from "react";
import {
  HashRouter,
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Lazy Providers
const AuthProvider = lazy(() => import("@/contexts/AuthContext").then(mod => ({ default: mod.AuthProvider })));
const AdminAuthProvider = lazy(() => import("@/contexts/AdminAuthContext").then(mod => ({ default: mod.AdminAuthProvider })));
const UserProfileProvider = lazy(() => import("@/contexts/UserProfileContext").then(mod => ({ default: mod.UserProfileProvider })));

// Lazy Pages
const Index = lazy(() => import("@/pages/Index"));
const InvestingPage = lazy(() => import("@/pages/investing/InvestingPage"));
const PartnersPage = lazy(() => import("@/pages/partners/PartnersPage"));
const CompanyPage = lazy(() => import("@/pages/company/CompanyPage"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Platform = lazy(() => import("@/pages/dashboard/Platform"));
const Plans = lazy(() => import("@/pages/plans/Plans"));
const Affiliate = lazy(() => import("@/pages/affiliate/Affiliate"));
const Profile = lazy(() => import("@/pages/profile/Profile"));
const DepositPage = lazy(() => import("@/pages/deposit/DepositPage"));
const Promotions = lazy(() => import("@/pages/promotions/Promotions"));
const AdminLogin = lazy(() => import("@/pages/admin/Login"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const UsersPage = lazy(() => import("@/pages/admin/users/UsersPage"));
const PaymentsPage = lazy(() => import("@/pages/admin/payments/PaymentsPage"));
const AdminWithdrawalsPage = lazy(() => import("@/pages/admin/withdrawals/AdminWithdrawalsPage"));
const AdminDepositsPage = lazy(() => import("@/pages/admin/deposits/AdminDepositsPage"));
const AdminPlans = lazy(() => import("@/pages/admin/plans/Plans"));
const PlansSubscriptionPage = lazy(() => import("@/pages/admin/plans-subscription/PlansSubscriptionPage"));
const AffiliatesPage = lazy(() => import("@/pages/admin/affiliates/AffiliatesPage"));
const AdminNoticesPage = lazy(() => import("@/pages/admin/notices/NoticesPage"));
const SupportManagePage = lazy(() => import("@/pages/admin/support/SupportManagePage"));
const AdminPromotionsPage = lazy(() => import("@/pages/admin/promotions/PromotionsPage"));
const PromocodesPage = lazy(() => import("@/pages/admin/promotions/PromocodesPage"));
const AdminPairs = lazy(() => import("@/pages/admin/pairs/Pairs"));
const TradesPage = lazy(() => import("@/pages/admin/trades/TradesPage"));
const LiveRatesPage = lazy(() => import("@/pages/admin/live-rates/LiveRates"));
const PrivacyPolicy = lazy(() => import("@/pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/legal/TermsOfService"));
const ThemePalettePage = lazy(() => import("@/pages/ThemePalettePage"));
const TradingStation = lazy(() => import("@/pages/tradingstation/TradingStation"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AuthGuard = lazy(() => import("@/components/AuthGuard").then(mod => ({ default: mod.AuthGuard })));

// New AlphaQuant Page
const AlphaQuantPage = lazy(() => import("@/pages/alphaquant/AlphaQuantPage"));

// Optional: hook if you need it
// import { useCacheFlush } from '@/hooks/use-cache-flush';

// Choose router based on environment
const isDev = import.meta.env.DEV;
const Router = isDev ? HashRouter : BrowserRouter;

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    }
  }
});

const Spinner = () => (
  <LoadingSpinner />
);

// Route splitter based on pathname
const RouteGroup = () => {
  const location = useLocation();
  const path = location.pathname;

  if (path.startsWith("/admin")) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/payments" element={<PaymentsPage />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="/admin/deposits" element={<AdminDepositsPage />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/plans-subscription" element={<PlansSubscriptionPage />} />
        <Route path="/admin/affiliates" element={<AffiliatesPage />} />
        <Route path="/admin/notices" element={<AdminNoticesPage />} />
        <Route path="/admin/support" element={<SupportManagePage />} />
        <Route path="/admin/promotions" element={<AdminPromotionsPage />} />
        <Route path="/admin/promocodes" element={<PromocodesPage />} />
        <Route path="/admin/pairs" element={<AdminPairs />} />
        <Route path="/admin/trades" element={<TradesPage />} />
        <Route path="/admin/live-rates" element={<LiveRatesPage />} />
      </Routes>
    );
  }

  if (
    path.startsWith("/platform") ||
    path.startsWith("/cashier") ||
    path.startsWith("/affiliate") ||
    path.startsWith("/profile") ||
    path.startsWith("/plans")
  ) {
    return (
      <Routes>
        <Route path="/platform" element={<AuthGuard requireAuth><Platform /></AuthGuard>} />
        <Route path="/plans" element={<AuthGuard requireAuth><Plans /></AuthGuard>} />
        <Route path="/affiliate" element={<AuthGuard requireAuth><Affiliate /></AuthGuard>} />
        <Route path="/cashier" element={<AuthGuard requireAuth><DepositPage /></AuthGuard>} />
        <Route path="/promotions" element={<AuthGuard requireAuth><Promotions /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard requireAuth><Profile /></AuthGuard>} />
        <Route path="/cashier" element={<AuthGuard requireAuth><DepositPage /></AuthGuard>} />
        <Route path="/plans" element={<AuthGuard requireAuth><Plans /></AuthGuard>} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/home" element={<Index />} />
      <Route path="/investing" element={<InvestingPage />} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route path="/company" element={<CompanyPage />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/terms" element={<TermsOfService />} />
      <Route path="/tradingstation" element={<TradingStation />} />
      <Route path="/theme-palette" element={<ThemePalettePage />} />
      <Route path="/alphaquant" element={<AlphaQuantPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  // useCacheFlush(); // optional if you need it

  return (
    <Suspense fallback={<Spinner />}>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <Router>
            <Suspense fallback={<Spinner />}>
              <AuthProvider>
                <AdminAuthProvider>
                  <TooltipProvider>
                    <UserProfileProvider>
                      <RouteGroup />
                      <Toaster />
                    </UserProfileProvider>
                  </TooltipProvider>
                </AdminAuthProvider>
              </AuthProvider>
            </Suspense>
          </Router>
        </QueryClientProvider>
      </HelmetProvider>
    </Suspense>
  );
};

export default App;
