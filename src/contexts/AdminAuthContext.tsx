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
    // Check if admin is logged in from localStorage
    const adminAuth = localStorage.getItem('adminAuth');
    setIsAdminAuthenticated(!!adminAuth);
  };

  const loginAdmin = async (email: string, password: string) => {
    // Hardcoded admin credentials - DO NOT USE IN PRODUCTION
    if (email === 'a1@ok.com' && password === '678123') {
      setIsAdminAuthenticated(true);
      localStorage.setItem('adminAuth', 'true');
      return true;
    }
    throw new Error('Invalid admin credentials');
  };

  const logoutAdmin = async () => {
    localStorage.removeItem('adminAuth');
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
