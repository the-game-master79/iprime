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
  first_name?: string;
  last_name?: string;
  referral_code?: string;
  withdrawal_wallet?: number;
  multiplier_bonus?: number;
  direct_count?: number;
  [key: string]: any;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  created_at: string;
  [key: string]: any;
}
