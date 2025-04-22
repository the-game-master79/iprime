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
    try {
      // Check both adminAuth and adminSession
      const adminAuth = localStorage.getItem('adminAuth');
      const adminSession = localStorage.getItem('adminSession');
      
      if (adminAuth && adminSession) {
        const session = JSON.parse(adminSession);
        // Check if session is still valid (24 hours)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          setIsAdminAuthenticated(true);
          return;
        }
      }
      // Clear invalid session
      localStorage.removeItem('adminAuth');
      localStorage.removeItem('adminSession');
      setIsAdminAuthenticated(false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdminAuthenticated(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    // Hardcoded admin credentials - DO NOT USE IN PRODUCTION
    if (email === 'a1@ok.com' && password === '678123') {
      setIsAdminAuthenticated(true);
      
      // Create admin session with 24 hour expiry
      const session = {
        email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminSession', JSON.stringify(session));
      return true;
    }
    throw new Error('Invalid admin credentials');
  };

  const logoutAdmin = async () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminSession');
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

  useEffect(() => {
    // Check admin session on mount
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      try {
        const session = JSON.parse(adminSession);
        if (new Date(session.expiresAt) <= new Date()) {
          localStorage.removeItem('adminAuth');
          localStorage.removeItem('adminSession');
        }
      } catch (error) {
        console.error('Error checking admin session:', error);
      }
    }
  }, []);

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
