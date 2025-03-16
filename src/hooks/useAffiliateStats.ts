import { useState, useEffect } from 'react';

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  totalCommissions: number;
}

export const useAffiliateStats = () => {
  const [stats, setStats] = useState<AffiliateStats>({
    totalAffiliates: 0,
    activeAffiliates: 0,
    totalReferrals: 0,
    totalCommissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/affiliate/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
};
