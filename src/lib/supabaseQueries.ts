import { supabase } from './supabase';

export interface MarqueeUser {
  id: string;
  name: string;
  country: string;
  plan: string; // Add plan to interface
  joined_time: string;
}

export const fetchMarqueeUsers = async () => {
  const { data, error } = await supabase
    .from('new_users_marquee')
    .select('*')
    .order('joined_time', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching marquee users:', error);
    return [];
  }

  return data as MarqueeUser[];
};
