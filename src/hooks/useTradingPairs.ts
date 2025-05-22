import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useTradingPairs = () => {
  return useQuery({
    queryKey: ['trading_pairs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000,
  });
};
