import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, UserProfile, persistedState } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AuthContextProps {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number, method: string, address: string) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;

      if (data.user) {
        // Fetch user profile with full details
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) throw profileError;

        setUser(data.user);
        setProfile(profileData);
        setIsAdmin(profileData?.role === 'admin' || false);
        
        navigate('/dashboard');
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      // Clear state on error
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    try {
      setLoading(true);

      // First check if username is available
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken');
      }

      // Generate referral code
      const referralCode = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create auth user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Wait for auth to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));

        const profileData = {
          user_id: data.user.id,
          username,
          full_name: fullName,
          email: email,
          role: 'user' as const, // Explicitly type the role
          investment_total: 0,
          withdrawal_total: 0,
          referral_code: referralCode,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Create user profile
        const { data: newProfileData, error: profileError } = await supabase
          .from('profiles')
          .insert([profileData])
          .select()
          .single();
          
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Clean up the auth user if profile creation fails
          await supabase.auth.admin.deleteUser(data.user.id);
          throw new Error('Failed to create user profile: ' + profileError.message);
        }

        setProfile(newProfileData);
        setUser(data.user);
        
        toast({
          title: "Account created successfully",
          description: "Welcome! Your account has been set up.",
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      // Clear all state and storage
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      persistedState.clearState('user');
      persistedState.clearState('profile');
      localStorage.clear();
      sessionStorage.clear();
      
      navigate('/auth', { replace: true });
    } catch (error: any) {
      console.error('Signout error:', error);
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (amount: number) => {
    try {
      if (!user) throw new Error("You must be logged in");
      
      // Add transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount,
            type: 'deposit',
            status: 'completed',
          },
        ]);
        
      if (transactionError) throw transactionError;
      
      // Update user profile
      const newInvestmentTotal = (profile?.investment_total || 0) + amount;
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ investment_total: newInvestmentTotal })
        .eq('user_id', user.id);
        
      if (profileError) throw profileError;
      
      // Update local profile state
      setProfile(prev => prev ? {
        ...prev,
        investment_total: newInvestmentTotal
      } : null);
      
      toast({
        title: "Deposit successful",
        description: `You've deposited $${amount.toFixed(2)}.`,
      });
    } catch (error: any) {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const withdraw = async (amount: number, method: string, address: string) => {
    try {
      if (!user) throw new Error("You must be logged in");
      if (!profile) throw new Error("Profile not loaded");
      
      if (amount > profile.investment_total) {
        throw new Error("Insufficient funds");
      }

      // First create the withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert([{
          user_id: user.id,
          amount: amount,
          address: address,
          network_type: method.split('_')[1].toUpperCase(),
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (withdrawalError) throw withdrawalError;

      // Create account history entry with correct column name 'id' instead of 'withdrawal_id'
      const { error: historyError } = await supabase
        .from('account_history')
        .insert([{
          user_id: user.id,
          withdrawal_id: withdrawal.id,  // Add this line
          amount: amount,
          type: 'withdraw',
          status: 'pending',
          description: `Withdrawal request via ${method.split('_')[0].toUpperCase()} ${method.split('_')[1].toUpperCase()}`,
          created_at: withdrawal.created_at
        }]);

      if (historyError) throw historyError;
      
      toast({
        title: "Withdrawal request submitted",
        description: "Your withdrawal request is pending approval.",
      });

    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        deposit,
        withdraw,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

async function generateUniqueReferralCode(): Promise<string> {
  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  let isUnique = false;
  let referralCode = '';

  while (!isUnique) {
    referralCode = generateCode();
    const { data: existingCode } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', referralCode)
      .single();

    if (!existingCode) {
      isUnique = true;
    }
  }

  return referralCode;
}

