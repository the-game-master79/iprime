import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  logout: async () => {} 
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Clear any stale session data first
        const existingSession = await supabase.auth.getSession();
        if (!existingSession.data.session) {
          localStorage.clear();
          sessionStorage.clear();
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (mounted) {
            if (event === 'SIGNED_OUT') {
              setUser(null);
              localStorage.clear();
              sessionStorage.clear();
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              setUser(session?.user ?? null);
            }
            setLoading(false);
          }
        });

        // Initial session check
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error checking auth session:', error);
        if (mounted) {
          setLoading(false);
          setUser(null);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const logout = async () => {
    try {
      // Clear any stored session data first
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear local state
      setUser(null);
      
      // Redirect to login with replace to prevent back navigation
      navigate('/auth/login', { replace: true });
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
