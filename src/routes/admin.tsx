import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import AdminLogin from "@/pages/admin/Login";
import { RequireAdminAuth } from "@/contexts/AdminAuthContext";
import LoadingSpinner from "@/components/ui/loading-spinner";

// Lazy load admin components
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

export const adminRoutes = [
  {
    path: "/admin/login",
    element: <AdminLogin />
  },
  {
    path: "/admin/*",
    element: (
      <RequireAdminAuth>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
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
          </Routes>
        </Suspense>
      </RequireAdminAuth>
    )
  }
];
