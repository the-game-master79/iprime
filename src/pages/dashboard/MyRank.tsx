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

  // Utility functions
  const calculateRankProgress = (business: number, currentRank: Rank, nextRank: Rank | null): number => {
    if (!nextRank) return 100;
    if (currentRank === nextRank) {
      return (business / nextRank.business_amount) * 100;
    }
    const remainingBusiness = nextRank.business_amount - currentRank.business_amount;
    const achievedBusiness = business - currentRank.business_amount;
    return Math.max(0, Math.min(100, (achievedBusiness / remainingBusiness) * 100));
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
      const [profileResponse, transactionsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('business_rank, business_volume')
          .eq('id', userId)
          .single(),
        supabase
          .from('transactions')
          .select('amount, description')
          .eq('user_id', userId)
          .eq('type', 'rank_bonus')
      ]);

      if (profileResponse.error) throw profileResponse.error;
      if (transactionsResponse.error) throw transactionsResponse.error;

      // Update profile data
      const { business_rank, business_volume } = profileResponse.data;
      setUserRank(business_rank);
      setTotalBusiness(business_volume || 0);

      // Update bonus data
      const transactions = transactionsResponse.data;
      const totalBonus = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      setTotalBonusEarned(totalBonus);

      // Update claimed ranks
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

      if (error) throw error;

      toast({
        title: "Success", 
        description: `Bonus claimed successfully for ${rank.title} rank!`,
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

  // Setup effects
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
    const initializeData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetchUserData(user.id);

      // Setup real-time subscriptions
      const channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          async () => await fetchUserData(user.id)
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${user.id} AND type=eq.rank_bonus`,
          },
          (payload) => {
            toast({
              title: "Rank Bonus Credited!",
              description: payload.new.description,
              variant: "success",
            });
            fetchUserData(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initializeData();
  }, [ranks]);

  return (
    <ShellLayout>
      <div>
        <PageHeader
          title="My Rank"
          description="Your position and achievements in the platform"
        />

        <div className="grid gap-4 md:grid-cols-2 md:gap-8 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Current Rank
              </CardTitle>
              <CardDescription>Your current position among all investors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {loading 
                    ? "Loading..." 
                    : userRank || 'New Member'}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-8 p-4 rounded-lg bg-muted">
                  <div>
                    <div className="text-muted-foreground text-sm">Total Bonus Earned</div>
                    <div className="font-semibold">
                      ${totalBonusEarned.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">Total Business Volume</div>
                    <div className="font-semibold">${totalBusiness.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                Next Rank
              </CardTitle>
              <CardDescription>Progress towards your next rank</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-8 p-4 rounded-lg bg-muted">
                <div>
                  <div className="text-muted-foreground text-sm">Next Rank</div>
                  <div className="font-semibold text-xl">
                    {currentRankData.nextRank?.title || 'Maximum Rank Achieved'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-sm">Next Bonus</div>
                  <div className="font-semibold text-xl">
                    ${currentRankData.nextRank?.bonus.toLocaleString() || currentRankData.rank?.bonus.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(currentRankData.progress)}% (${totalBusiness.toLocaleString()})</span>
                </div>
                <Progress value={currentRankData.progress} className="w-full" />
                <div className="text-sm text-muted-foreground">
                  Target: ${currentRankData.nextRank?.business_amount.toLocaleString() || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>All Ranks</CardTitle>
            <CardDescription>Overview of all available ranks and their requirements</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank Name</TableHead>
                  <TableHead>Team Business</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Additional Bonus</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading ranks...</TableCell>
                  </TableRow>
                ) : ranks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No ranks found</TableCell>
                  </TableRow>
                ) : (
                  ranks.map((rank) => (
                    <TableRow key={rank.id}>
                      <TableCell className="font-medium">{rank.title}</TableCell>
                      <TableCell>${rank.business_amount.toLocaleString()}</TableCell>
                      <TableCell>${rank.bonus.toLocaleString()}</TableCell>
                      <TableCell>{rank.bonus_description}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
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
                              ? 'Next Rank'
                              : totalBusiness >= rank.business_amount
                              ? 'Achieved'
                              : 'Locked'}
                          </span>
                          {totalBusiness >= rank.business_amount && ranks.indexOf(rank) !== 0 && (
                            claimedRanks.includes(rank.title) ? (
                              <span className="text-sm text-muted-foreground">
                                Claimed
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClaimBonus(rank)}
                                disabled={claimingRank === rank.title}
                              >
                                {claimingRank === rank.title ? 'Claiming...' : 'Claim'}
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ShellLayout>
  );
};

export default MyRank;
