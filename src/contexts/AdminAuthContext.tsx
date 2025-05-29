import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

interface AdminAuthContextType {
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  checkAdminStatus: () => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Always check admin status on mount and on user change
  useEffect(() => {
    const fetchUserAndCheck = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (user) {
        // Check if user has admin role
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && profile?.role === 'admin') {
          setIsAdminAuthenticated(true);
        } else {
          setIsAdminAuthenticated(false);
        }
      } else {
        setIsAdminAuthenticated(false);
      }
      setIsLoading(false);
    };

    fetchUserAndCheck();
  }, []);

  const checkAdminStatus = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!user) {
        setIsAdminAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Check if user has admin role
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setIsAdminAuthenticated(profile?.role === 'admin');
    } catch (error) {
      setIsAdminAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // First sign in the user
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;
      if (!authData.user) throw new Error('No user returned from login');

      setCurrentUser(authData.user);

      // Check if user has admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;
      
      if (profile?.role !== 'admin') {
        // Sign out if not admin
        await supabase.auth.signOut();
        setIsAdminAuthenticated(false);
        setIsLoading(false);
        throw new Error('Not authorized to access admin panel');
      }

      setIsAdminAuthenticated(true);
    } catch (error) {
      setIsAdminAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutAdmin = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdminAuthenticated(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Listen for auth state changes and check admin status
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        checkAdminStatus();
      } else {
        setCurrentUser(null);
        setIsAdminAuthenticated(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AdminAuthContext.Provider value={{ 
      isAdminAuthenticated, 
      isLoading,
      checkAdminStatus,
      loginAdmin,
      logoutAdmin
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === null) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const RequireAdminAuth = ({ children }: { children: ReactNode }) => {
  const { isAdminAuthenticated, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if on a protected /admin route (not /admin/login)
    if (
      !isLoading &&
      !isAdminAuthenticated &&
      window.location.pathname.startsWith('/admin') &&
      window.location.pathname !== '/admin/login'
    ) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAdminAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAdminAuthenticated ? <>{children}</> : null;
};
