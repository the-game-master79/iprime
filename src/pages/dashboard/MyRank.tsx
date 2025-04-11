import { PageHeader } from "@/components/ui-components";
import ShellLayout from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// Types and interfaces
interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
  bonus_description: string;
}

interface CurrentRankData {
  rank: Rank | null;
  nextRank: Rank | null;
  progress: number;
}

const MyRank = () => {
  // State management
  const { toast } = useToast();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingRank, setClaimingRank] = useState<string | null>(null);
  const [claimedRanks, setClaimedRanks] = useState<string[]>([]);
  const [totalBusiness, setTotalBusiness] = useState(0);
  const [totalBonusEarned, setTotalBonusEarned] = useState(0);
  const [userRank, setUserRank] = useState<string>('');
  const [currentRankData, setCurrentRankData] = useState<CurrentRankData>({
    rank: null,
    nextRank: null,
    progress: 0
  });
  const [userId, setUserId] = useState<string | null>(null);

  // Utility functions
  const calculateRankProgress = (business: number, currentRank: Rank, nextRank: Rank | null): number => {
    if (!nextRank) return 100;
    // Calculate progress as percentage of total business towards next rank requirement
    return Math.min(100, Math.max(0, (business / nextRank.business_amount) * 100));
  };

  const calculateRank = (business: number, ranks: Rank[]): CurrentRankData => {
    const sortedRanks = [...ranks].sort((a, b) => a.business_amount - b.business_amount);
    let currentRank = sortedRanks[0];
    let nextRank = sortedRanks[0];
    
    for (let i = 0; i < sortedRanks.length; i++) {
      if (business >= sortedRanks[i].business_amount) {
        currentRank = sortedRanks[i];
        nextRank = sortedRanks[i + 1] || null;
      } else break;
    }

    const progress = calculateRankProgress(business, currentRank, nextRank);
    return { rank: currentRank, nextRank, progress };
  };

  // Data fetching functions
  const fetchRanks = async () => {
    try {
      const { data, error } = await supabase
        .from('ranks')
        .select('*')
        .order('business_amount', { ascending: true });
      
      if (error) throw error;
      setRanks(data || []);
    } catch (error) {
      console.error('Error fetching ranks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const [businessDataResponse, transactionsResponse] = await Promise.all([
        supabase
          .from('total_business_volumes')
          .select(`
            total_amount,
            business_rank,
            profiles!inner(direct_count)
          `)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('transactions')
          .select('amount, description')
          .eq('user_id', userId)
          .eq('type', 'rank_bonus')
      ]);

      if (businessDataResponse.error) throw businessDataResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;

      const hasMinimumReferrals = businessDataResponse.data.profiles.direct_count >= 2;
      const businessVolume = hasMinimumReferrals 
        ? businessDataResponse.data.total_amount
        : 0;
      
      setTotalBusiness(businessVolume);
      setUserRank(businessDataResponse.data.business_rank || 'New Member');

      // Set rank based on business volume if ranks are available
      if (ranks.length > 0 && hasMinimumReferrals) {
        const rankData = calculateRank(businessVolume, ranks);
        setCurrentRankData(rankData);
      }

      // Update bonus data
      const transactions = transactionsResponse.data;
      const totalBonus = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      setTotalBonusEarned(totalBonus);

      const claimed = transactions
        .map(tx => {
          const match = tx.description.match(/bonus for (.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[];
      setClaimedRanks(claimed);

    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive"
      });
    }
  };

  // Action handlers
  const handleClaimBonus = async (rank: Rank) => {
    setClaimingRank(rank.title);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('claim_rank_bonus', {
        rank_title: rank.title
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success", 
        description: `${rank.title} rank bonus of $${rank.bonus.toLocaleString()} has been added to your withdrawal wallet!`,
        variant: "success",
      });

      setClaimedRanks(prev => [...prev, rank.title]);
      await fetchUserData(user.id);

    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim bonus",
        variant: "destructive"
      });
    } finally {
      setClaimingRank(null);
    }
  };

  // Consolidated effects
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    initUser();
  }, []);

  useEffect(() => {
    fetchRanks();
  }, []);

  useEffect(() => {
    if (ranks.length > 0) {
      const rankData = calculateRank(totalBusiness, ranks);
      setCurrentRankData(rankData);
    }
  }, [totalBusiness, ranks]);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      await fetchUserData(userId);
    };

    fetchData();

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        async () => await fetchUserData(userId)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId} AND type=eq.rank_bonus`,
        },
        (payload) => {
          toast({
            title: "Rank Bonus Credited!",
            description: payload.new.description,
            variant: "success",
          });
          fetchUserData(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  return (
    <ShellLayout>
      <div className="space-y-6">
        <PageHeader
          title="Ranks"
        />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Rank Card */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <Trophy className="h-5 w-5 text-primary" />
                Current Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-primary">
                    {loading ? "Loading..." : userRank || 'New Member'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Your current network rank</p>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-muted-foreground">Total Business Volume</div>
                  <div className="text-3xl font-bold mt-1">
                    ${totalBusiness.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Card */}
          <Card className="relative overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-medium">
                <ArrowRight className="h-5 w-5 text-primary" />
                Rank Bonuses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-4xl font-bold text-green-600">
                    ${totalBonusEarned.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Total bonuses earned</p>
                </div>
                {currentRankData.nextRank && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground">Next Rank Bonus</div>
                    <div className="text-3xl font-bold mt-1 text-primary">
                      ${currentRankData.nextRank.bonus.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Progress to Next Rank</CardTitle>
            <CardDescription>
              {currentRankData.nextRank 
                ? `${Math.round(currentRankData.progress)}% towards ${currentRankData.nextRank.title}`
                : 'Maximum rank achieved'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={currentRankData.progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>${totalBusiness.toLocaleString()}</span>
                <span>${currentRankData.nextRank?.business_amount.toLocaleString() || 'MAX'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ranks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Available Ranks</CardTitle>
            <CardDescription>Your rank journey and achievements</CardDescription>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead className="hidden sm:table-cell">Target Volume</TableHead>
                    <TableHead className="text-right sm:text-left">Bonus</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">Loading ranks...</TableCell>
                    </TableRow>
                  ) : ranks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">No ranks available</TableCell>
                    </TableRow>
                  ) : (
                    ranks.map((rank) => (
                      <TableRow key={rank.id}>
                        <TableCell className="font-medium min-w-[120px]">
                          <div className="space-y-1">
                            <div>{rank.title}</div>
                            <div className="sm:hidden text-xs text-muted-foreground">
                              ${rank.business_amount.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{rank.bonus_description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          ${rank.business_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right sm:text-left">
                          <div className="space-y-2">
                            <span className="font-semibold text-primary">${rank.bonus.toLocaleString()}</span>
                            <div className="sm:hidden">
                              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                                ${currentRankData.rank?.id === rank.id 
                                  ? 'bg-primary/20 text-primary' 
                                  : currentRankData.nextRank?.id === rank.id
                                  ? 'bg-blue-100 text-blue-800'
                                  : totalBusiness >= rank.business_amount
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-muted text-muted-foreground'}`}>
                                {currentRankData.rank?.id === rank.id 
                                  ? 'Current' 
                                  : currentRankData.nextRank?.id === rank.id
                                  ? 'Next'
                                  : totalBusiness >= rank.business_amount
                                  ? 'Achieved'
                                  : 'Locked'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                            ${currentRankData.rank?.id === rank.id 
                              ? 'bg-primary/20 text-primary' 
                              : currentRankData.nextRank?.id === rank.id
                              ? 'bg-blue-100 text-blue-800'
                              : totalBusiness >= rank.business_amount
                              ? 'bg-green-100 text-green-800'
                              : 'bg-muted text-muted-foreground'}`}>
                            {currentRankData.rank?.id === rank.id 
                              ? 'Current' 
                              : currentRankData.nextRank?.id === rank.id
                              ? 'Next'
                              : totalBusiness >= rank.business_amount
                              ? 'Achieved'
                              : 'Locked'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {totalBusiness >= rank.business_amount && ranks.indexOf(rank) !== 0 && (
                            claimedRanks.includes(rank.title) ? (
                              <span className="text-sm text-muted-foreground">Claimed</span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClaimBonus(rank)}
                                disabled={claimingRank === rank.title}
                                className="whitespace-nowrap"
                              >
                                {claimingRank === rank.title ? 'Claiming...' : 'Claim Bonus'}
                              </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </ShellLayout>
  );
};

export default MyRank;
