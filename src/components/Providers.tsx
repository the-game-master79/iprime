 import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";

// Import the queryClient instance from App.tsx or create it here
const queryClient = new QueryClientProvider();

export function Providers({ children }: { children: React.ReactNode }) {
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
}
