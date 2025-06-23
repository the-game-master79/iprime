import React, { useState, useEffect } from "react";
import { DashboardTabs } from "../../components/dashboard/DashboardTabs";
import { Topbar } from "../../components/shared/Topbar";
import { PlatformSidebar } from "../../components/shared/PlatformSidebar";
import { Helmet } from "react-helmet-async";
import { supabase } from "../../lib/supabase";
import { useUserProfile } from "../../contexts/UserProfileContext";

const ITEMS_PER_PAGE = 10;

const HistoryPage: React.FC = () => {
  const { profile } = useUserProfile();
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [ranks, setRanks] = useState([]);
  const [ranksLoading, setRanksLoading] = useState(true);
  const [businessStats, setBusinessStats] = useState({
    currentRank: "",
    totalVolume: 0,
    rankBonus: 0,
    nextRank: null,
    progress: 0,
    targetVolume: 0,
  });
  const [claimedRanks, setClaimedRanks] = useState<string[]>([]);
  const [claimingRank, setClaimingRank] = useState<string | null>(null);
  const [closedTrades, setClosedTrades] = useState([]);
  const [closedTradesLoading, setClosedTradesLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!profile) return;
    fetchTransactions(1);
    fetchRanks();
    fetchBusinessStats();
    fetchClaimedRanks();
    fetchClosedTrades();
    // eslint-disable-next-line
  }, [profile]);

  const fetchTransactions = async (pageNumber = 1) => {
    setTransactionsLoading(true);
    setIsLoadingMore(true);
    if (!profile) return;
    const from = (pageNumber - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    // Fetch from both transactions and withdrawals tables
    const [transactionsRes, withdrawalsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', profile.id)
        .in('type', ['deposit', 'withdrawal', 'commission', 'investment', 'investment_return', 'rank_bonus'])
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
    ]);
    const transactionsData = transactionsRes.data || [];
    const withdrawalsData = withdrawalsRes.data || [];
    // Mark withdrawals with a type if needed
    const withdrawalsWithType = withdrawalsData.map(w => ({ ...w, type: 'withdrawal' }));
    // Merge and sort by created_at
    const all = [...transactionsData, ...withdrawalsWithType].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTransactions(pageNumber === 1 ? all : prev => [...prev, ...all]);
    setHasMore((transactionsRes.count || 0) > to + 1);
    setTransactionsLoading(false);
    setIsLoadingMore(false);
  };

  const fetchRanks = async () => {
    setRanksLoading(true);
    const { data, error } = await supabase
      .from('ranks')
      .select('*')
      .order('business_amount', { ascending: true });
    if (!error) setRanks(data || []);
    setRanksLoading(false);
  };

  const fetchBusinessStats = async () => {
    if (!profile) return;
    const { data: volumeData } = await supabase
      .from('total_business_volumes')
      .select('total_amount, business_rank')
      .eq('user_id', profile.id)
      .single();
    const businessVolume = volumeData?.total_amount || 0;
    const businessRank = volumeData?.business_rank || 'New Member';
    const { data: ranks } = await supabase
      .from('ranks')
      .select('*')
      .order('business_amount', { ascending: true });
    const currentRankObj = ranks?.find(r => r.title === businessRank) || { title: 'New Member', business_amount: 0, bonus: 0 };
    const nextRank = ranks?.find(r => r.business_amount > businessVolume) || null;
    let progress = 0;
    if (nextRank && currentRankObj) {
      const progressCalc = ((businessVolume - currentRankObj.business_amount) /
        (nextRank.business_amount - currentRankObj.business_amount)) * 100;
      progress = Math.min(100, Math.max(0, progressCalc));
    }
    setBusinessStats({
      currentRank: businessRank,
      totalVolume: businessVolume,
      rankBonus: currentRankObj?.bonus || 0,
      nextRank: nextRank ? {
        title: nextRank.title,
        bonus: nextRank.bonus,
        business_amount: nextRank.business_amount
      } : null,
      progress,
      targetVolume: nextRank ? nextRank.business_amount : currentRankObj?.business_amount || 0
    });
  };

  const fetchClaimedRanks = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('description')
      .eq('user_id', profile.id)
      .eq('type', 'rank_bonus')
      .eq('status', 'Completed');
    if (!error) {
      const claimed = (data || [])
        .map(tx => {
          const match = tx.description.match(/bonus for (.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];
      setClaimedRanks(claimed);
    }
  };

  const fetchClosedTrades = async () => {
    setClosedTradesLoading(true);
    if (!profile) return;
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false });
    if (!error) setClosedTrades(data || []);
    setClosedTradesLoading(false);
  };

  const handleLoadMore = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.preventDefault();
    if (isLoadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTransactions(nextPage);
  };

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {}
  };

  const onClaimRankBonus = async (rank: any) => {
    setClaimingRank(rank.title);
    // Implement claim logic or call backend as needed
    setTimeout(() => setClaimingRank(null), 1000);
  };

  function groupTradesByDate(trades: any[]) {
    const groups: Record<string, any[]> = {};
    trades.forEach(trade => {
      const closedAt = trade.closed_at || trade.updated_at || trade.created_at;
      if (!closedAt) return;
      const dateObj = new Date(closedAt);
      const dateKey = dateObj.toISOString().slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(trade);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map(dateKey => ({ dateKey, trades: groups[dateKey] }));
  }

  function formatDateLabel(dateKey: string) {
    const now = new Date();
    const date = new Date(dateKey + "T00:00:00");
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Helmet>
        <title>History | iPrime</title>
      </Helmet>
      <PlatformSidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="History" />
        <main className="flex-1 p-4">
          <div className="mx-auto w-full max-w-[1200px]">
            <DashboardTabs
              transactions={transactions}
              transactionsLoading={transactionsLoading}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              handleLoadMore={handleLoadMore}
              handleCopyId={handleCopyId}
              ranks={ranks}
              ranksLoading={ranksLoading}
              businessStats={businessStats}
              claimedRanks={claimedRanks}
              claimingRank={claimingRank}
              onClaimRankBonus={onClaimRankBonus}
              closedTrades={closedTrades}
              closedTradesLoading={closedTradesLoading}
              groupTradesByDate={groupTradesByDate}
              formatDateLabel={formatDateLabel}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default HistoryPage;
