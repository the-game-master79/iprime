export interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
}

export interface BusinessRankState {
  currentRank: string | null;
  nextRank: string | null;
  progress: number;
  totalBusiness: number;
}

export interface UserProfile {
  id: string;
  full_name?: string;
  referral_code?: string;
  withdrawal_wallet?: number;
  multiplier_bonus?: number;
  direct_count?: number;
  [key: string]: any;
}

export interface WithdrawalData {
  id: string;
  user_id: string;
  amount: number;
  wallet_address: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_hash?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'commission' | 'investment' | 'investment_return' | 'rank_bonus' | string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | string;
  description?: string;
  created_at: string;
  updated_at?: string;
  withdrawal_data?: WithdrawalData;
  [key: string]: any;
}
