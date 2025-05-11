import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session without clearing
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (mounted) {        if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.clear();
          sessionStorage.clear();
          // Only navigate if we're not already on the login page
          if (!location.pathname.includes('/auth/')) {
            navigate('/auth/login', { replace: true });
          }
        } else if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          // Only navigate to platform if we're on an auth page
          if (location.pathname.includes('/auth/')) {
            navigate('/platform', { replace: true });
          }
        } else if (event === 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
        }
        setLoading(false);
          }
        });

        // Set initial session state
        if (mounted) {
          setUser(initialSession?.user ?? null);
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
  }, [navigate, location.pathname]); // Add location.pathname to dependencies

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
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
