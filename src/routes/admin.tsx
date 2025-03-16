import { lazy } from "react";
import AdminLayout from "@/pages/admin/AdminLayout";
// ...existing imports...
import Plans from "@/pages/admin/plans/Plans";

export const adminRoutes = [
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      // ...existing routes...
      {
        path: "plans",
        element: <Plans />
      }
    ]
  }
];
