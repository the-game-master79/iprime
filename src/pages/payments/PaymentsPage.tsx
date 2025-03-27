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

interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
  bonus_description: string;
}

const MyRank = () => {
  const { toast } = useToast();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBusiness, setTotalBusiness] = useState(0);
  const [totalBonusEarned, setTotalBonusEarned] = useState(0);
  const [userRank, setUserRank] = useState<string>(''); // Add this state
  const [currentRankData, setCurrentRankData] = useState<{
    rank: Rank | null;
    nextRank: Rank | null;
    progress: number;
  }>({ rank: null, nextRank: null, progress: 0 });

  const calculateRank = (business: number, ranks: Rank[]) => {
    const sortedRanks = [...ranks].sort((a, b) => a.business_amount - b.business_amount);
    
    let currentRank: Rank | null = sortedRanks[0]; // Set default to lowest rank
    let nextRank: Rank | null = sortedRanks[0];
    
    for (let i = 0; i < sortedRanks.length; i++) {
      if (business >= sortedRanks[i].business_amount) {
        currentRank = sortedRanks[i];
        nextRank = sortedRanks[i + 1] || null;
      } else {
        break;
      }
    }

    // Rest of progress calculation remains the same
    let progress = 0;
    if (nextRank) {
      if (currentRank === nextRank) {
        progress = (business / nextRank.business_amount) * 100;
      } else {
        const remainingBusiness = nextRank.business_amount - currentRank.business_amount;
        const achievedBusiness = business - currentRank.business_amount;
        progress = (achievedBusiness / remainingBusiness) * 100;
      }
    } else if (currentRank) {
      progress = 100;
    }

    progress = Math.max(0, Math.min(100, progress));
    return { currentRank, nextRank, progress };
  };

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

  const fetchTotalBusiness = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_volume')
        .eq('id', user.id)
        .single();

      setTotalBusiness(profile?.business_volume || 0);
    } catch (error) {
      console.error('Error fetching total business:', error);
    }
  };

  const fetchTotalBonus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'rank_bonus');

      if (error) throw error;

      const totalBonus = data?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0;
      setTotalBonusEarned(totalBonus);
    } catch (error) {
      console.error('Error fetching total bonus:', error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('business_rank, business_volume')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Set the user's current rank from profile
      setUserRank(profile.business_rank);
      setTotalBusiness(profile.business_volume || 0);

      // Find the current rank object from ranks array
      const currentRank = ranks.find(r => r.title === profile.business_rank);
      if (currentRank) {
        const rankData = calculateRank(profile.business_volume || 0, ranks);
        setCurrentRankData(rankData);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleClaimBonus = async (rank: Rank) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .rpc('claim_rank_bonus', {
          rank_title: rank.title
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Bonus claimed successfully for ${rank.title} rank!`,
        variant: "success",
      });

      // Refresh data
      await Promise.all([
        fetchTotalBusiness(),
        fetchUserProfile(user.id),
        fetchTotalBonus()
      ]);

    } catch (error: any) {
      console.error('Error claiming bonus:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to claim bonus",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Move fetchRanks to its own useEffect
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

      await Promise.all([
        fetchTotalBusiness(),
        fetchUserProfile(user.id),
        fetchTotalBonus()
      ]);

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
          async (payload) => {
            // Refresh user profile when rank changes
            await fetchUserProfile(user.id);
          }
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
            // Refresh total business after bonus credit
            fetchTotalBusiness();
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
                  <TableHead>Bonus Description</TableHead>
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
                          {totalBusiness >= rank.business_amount && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleClaimBonus(rank)}
                            >
                              Claim
                            </Button>
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