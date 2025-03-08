import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, User, initializeDatabase, isUserAdmin } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AdminAuthContextProps {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextProps | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the auth state
    const initAuth = async () => {
      setLoading(true);
      try {
        // Get the initial session
        const { data, error } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          // Check if the user is an admin
          const isAdmin = await isUserAdmin(data.session.user.id);
          
          if (isAdmin) {
            const userWithRole: User = {
              ...data.session.user,
              id: data.session.user.id,
              role: 'admin'
            };
            setUser(userWithRole);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Admin auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
    
    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            // Check if the user is an admin
            const isAdmin = await isUserAdmin(session.user.id);
            
            if (isAdmin) {
              const userWithRole: User = {
                ...session.user,
                id: session.user.id,
                role: 'admin'
              };
              setUser(userWithRole);
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error('Auth state change error:', err);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // First try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        // Check if the user is an admin
        const isAdmin = await isUserAdmin(data.user.id);
        
        if (!isAdmin) {
          await supabase.auth.signOut(); // Sign out if not admin
          throw new Error("Only Admins Allowed");
        }
        
        const userWithRole: User = {
          ...data.user,
          id: data.user.id,
          role: 'admin'
        };
        
        setUser(userWithRole);
        navigate('/admin/dashboard');
        toast({
          title: "Admin access granted",
          description: "Welcome to the admin panel.",
        });
      }
    } catch (error: any) {
      await supabase.auth.signOut(); // Ensure clean state
      toast({
        title: "Admin sign in failed",
        description: error.message,
        variant: "destructive",
      });
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      navigate('/admin');
      toast({
        title: "Signed out",
        description: "You've been signed out from the admin panel.",
      });
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
