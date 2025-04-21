import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { AuthProvider } from '@/contexts/AuthContext';
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import { AuthGuard } from '@/components/AuthGuard';
import PromotionsPage from "./pages/admin/promotions/PromotionsPage";
import { lazy, Suspense } from "react";
import LoadingSpinner from "@/components/ui/loading-spinner";
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
import { adminRoutes } from "@/routes/admin";

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

// Create a stable QueryClient instance outside component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/home" element={<Index />} />
            
            {/* Add new public routes */}
            <Route path="/trading" element={<TradingPage />} />
            <Route path="/investing" element={<InvestingPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/margin-calculator" element={<MarginCalculator />} />

            {/* Auth Routes */}
            <Route path="/auth/login" element={<Login />} />

            {/* Routes that can be loaded before auth check */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/affiliate" element={<Affiliate />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="/rank" element={<MyRank />} />
            <Route path="/deposit" element={<DepositPage />} />
            
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
            {adminRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster />
      </Providers>
    </HelmetProvider>
  );
};

export default App;
