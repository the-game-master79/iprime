import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bvswqdjrjlmewqxlcokd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2c3dxZGpyamxtZXdxeGxjb2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4Mjk5ODQsImV4cCI6MjA1NjQwNTk4NH0.FTKVgwWXgSSimw7IerKtxpvGgAz8vNa_qZzzSNL-yKs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'sb:token',
    storage: window.localStorage
  }
});

export const persistedState = {
  getState: (key: string) => {
    try {
      const serializedState = localStorage.getItem(`app:${key}`);
      if (!serializedState) return null;
      return JSON.parse(serializedState);
    } catch (err) {
      console.error('Error loading state:', err);
      return null;
    }
  },
  setState: (key: string, value: any) => {
    try {
      localStorage.setItem(`app:${key}`, JSON.stringify(value));
    } catch (err) {
      console.error('Error saving state:', err);
    }
  },
  clearState: (key: string) => {
    localStorage.removeItem(`app:${key}`);
  }
};

// Initialize database (simplified)
export const initializeDatabase = async () => {
  // No need to create admin user anymore, just initialize any required database settings
  try {
    // Add any other database initialization if needed
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};

const generateUniqueReferralCode = async (): Promise<string> => {
  const maxAttempts = 5;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Check if code exists
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('referral_code', code)
      .single();

    if (!data && !error) {
      return code;
    }
    attempts++;
  }
  
  // Fallback with timestamp if all attempts fail
  return `REF${Date.now().toString(36).toUpperCase()}`;
};

// Enhanced createUserProfile function with optional role and referral code
export const createUserProfile = async (
  user: { id: string; email: string },
  fullName: string,
  username: string,
  role: UserRole = 'user',
  referralCode?: string
) => {
  const timestamp = new Date().toISOString();
  
  try {
    // Wait for auth to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    const profileData = {
      user_id: user.id,
      full_name: fullName,
      username: username,
      email: user.email,
      role: role,
      investment_total: 0,
      withdrawal_total: 0,
      referral_code: referralCode || `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: timestamp,
      updated_at: timestamp
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
};

export type User = {
  id: string;
  email?: string;
  avatar_url?: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'admin';
};

export type UserRole = 'user' | 'admin';

export type UserProfile = {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  role: UserRole;
  investment_total: number;
  withdrawal_total: number;
  referral_code: string;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
};

export type TransactionType = 'deposit' | 'withdrawal' | 'affiliate';

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  status: string;
  created_at: string;
};

export type DepositMethod = {
  id: string;
  name: string;
  type: 'crypto' | 'fiat';
  details: any;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

// Update isUserAdmin function to be more explicit
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    // Use direct query without any joins to prevent recursion
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
};

// Add new function to fetch user profile
export const fetchUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Add this function to fetch deposit methods
export const fetchDepositMethods = async () => {
  try {
    const { data, error } = await supabase
      .from('deposit_methods')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching deposit methods:', error);
    throw error;
  }
};

export const monitorQueryPerformance = async (queryName: string, queryFn: () => Promise<any>) => {
  const startTime = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    console.debug(`Query ${queryName} took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    console.error(`Query ${queryName} failed after ${(performance.now() - startTime).toFixed(2)}ms:`, error);
    throw error;
  }
};
