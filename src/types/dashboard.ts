export interface MarqueeUser {
  id: string;
  name: string;
  country: string;
  joined_time: string;
  plans: string;
}

export interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
}

export interface LeaderboardEntry {
  id: string;
  serial_number: number;
  name: string;
  volume?: number;
  referrals?: number;
  income: number;
  rank: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  investment: number;
  returns_percentage: number;
  duration_days: number;
  status: 'active';
}

export interface BusinessRankState {
  currentRank: { 
    title: string; 
    bonus: number; 
    business_amount: number 
  } | null;
  nextRank: { 
    title: string; 
    bonus: number; 
    business_amount: number 
  } | null;
  progress: number;
  totalBusiness: number;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  referral_code?: string;
  kyc_status?: 'completed' | 'pending' | null;
  created_at: string;
  [key: string]: any; // For additional fields
}
