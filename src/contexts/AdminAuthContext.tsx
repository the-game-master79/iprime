import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  isLoading: boolean;
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'admin') {
          setIsAdminAuthenticated(true);
          localStorage.setItem('adminAuth', 'true');
        } else {
          setIsAdminAuthenticated(false);
          localStorage.removeItem('adminAuth');
        }
      } else {
        setIsAdminAuthenticated(false);
        localStorage.removeItem('adminAuth');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdminAuthenticated(false);
      localStorage.removeItem('adminAuth');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'admin') {
          setIsAdminAuthenticated(true);
          localStorage.setItem('adminAuth', 'true');
          return true;
        }
      }
      throw new Error('Not authorized as admin');
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  };

  const logoutAdmin = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdminAuthenticated(false);
      localStorage.removeItem('adminAuth');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ 
      isAdminAuthenticated, 
      loginAdmin, 
      logoutAdmin,
      isLoading 
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const RequireAdminAuth = ({ children }: { children: ReactNode }) => {
  const { isAdminAuthenticated } = useAdminAuth();
  const location = useLocation();

  useEffect(() => {
    // Periodically check admin status
    const interval = setInterval(() => {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsAdminAuthenticated(false);
        }
      };
      checkAuth();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
