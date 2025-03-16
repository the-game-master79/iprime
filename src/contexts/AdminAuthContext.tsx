import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // For testing: consider any authenticated user as admin
    setIsAdminAuthenticated(!!session);
  };

  const loginAdmin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return false;
    // For testing: allow any successful login
    setIsAdminAuthenticated(true);
    return true;
  };

  const logoutAdmin = async () => {
    await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdminAuthenticated, loginAdmin, logoutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const RequireAdminAuth = ({ children }: { children: ReactNode }) => {
  const { isAdminAuthenticated } = useAdminAuth();
  const location = useLocation();

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
