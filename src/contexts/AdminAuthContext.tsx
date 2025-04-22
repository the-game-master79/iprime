import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
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
      // Call the admin validation RPC
      const { data, error } = await supabase
        .rpc('validate_admin', {
          admin_email: email,
          admin_password: password
        });

      if (error) throw error;

      if (data.success) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('adminAuth', 'true');
        return true;
      }

      throw new Error('Invalid admin credentials');
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
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  // Add check for loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Prevent infinite redirects by checking location
  if (!isAdminAuthenticated && location.pathname !== '/admin/login') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Add error boundaries
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode, fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
