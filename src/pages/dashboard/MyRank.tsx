import { PageHeader } from "@/components/ui-components";
import ShellLayout from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
}

const MyRank = () => {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBusiness, setTotalBusiness] = useState(0);
  const [currentRankData, setCurrentRankData] = useState<{
    rank: Rank | null;
    nextRank: Rank | null;
    progress: number;
  }>({ rank: null, nextRank: null, progress: 0 });

  const calculateRank = (business: number, ranks: Rank[]) => {
    const sortedRanks = [...ranks].sort((a, b) => a.business_amount - b.business_amount);
    
    let currentRank: Rank | null = null;
    let nextRank: Rank | null = null;
    
    for (let i = 0; i < sortedRanks.length; i++) {
      if (business >= sortedRanks[i].business_amount) {
        currentRank = sortedRanks[i];
        nextRank = sortedRanks[i + 1] || null;
      } else {
        if (!currentRank) {
          currentRank = sortedRanks[0];
          nextRank = sortedRanks[0];
        }
        break;
      }
    }

    // New progress calculation
    let progress = 0;
    if (nextRank) {
      // If total business is less than first rank requirement
      if (!currentRank || currentRank === nextRank) {
        progress = (business / nextRank.business_amount) * 100;
      } else {
        // Calculate progress between current rank and next rank
        const remainingBusiness = nextRank.business_amount - currentRank.business_amount;
        const achievedBusiness = business - currentRank.business_amount;
        progress = (achievedBusiness / remainingBusiness) * 100;
      }
    } else if (currentRank) {
      // If reached highest rank
      progress = 100;
    }

    // Ensure progress stays between 0 and 100
    progress = Math.max(0, Math.min(100, progress));

    return { currentRank, nextRank, progress };
  };

  useEffect(() => {
    if (ranks.length > 0) {
      const rankData = calculateRank(totalBusiness, ranks);
      setCurrentRankData(rankData);
    }
  }, [totalBusiness, ranks]);

  useEffect(() => {
    const fetchTotalBusiness = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: relationships, error } = await supabase
          .from('referral_relationships')
          .select(`
            referred:profiles!referral_relationships_referred_id_fkey (
              total_invested
            )
          `)
          .eq('referrer_id', user.id);

        if (error) throw error;

        const referralBusiness = relationships?.reduce((sum, rel) => {
          return sum + (rel.referred?.total_invested || 0);
        }, 0) || 0;

        const { data: profile } = await supabase
          .from('profiles')
          .select('total_invested')
          .eq('id', user.id)
          .single();

        const totalVolume = referralBusiness + (profile?.total_invested || 0);
        setTotalBusiness(totalVolume);
      } catch (error) {
        console.error('Error fetching total business:', error);
      }
    };

    fetchTotalBusiness();
  }, []);

  useEffect(() => {
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

    fetchRanks();
  }, []);

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
                  {currentRankData.rank?.title || 'New Member'}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-8 p-4 rounded-lg bg-muted">
                  <div>
                    <div className="text-muted-foreground text-sm">Current Bonus</div>
                    <div className="font-semibold">
                      ${currentRankData.rank?.bonus.toLocaleString() || '0'}
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Loading ranks...</TableCell>
                  </TableRow>
                ) : ranks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">No ranks found</TableCell>
                  </TableRow>
                ) : (
                  ranks.map((rank) => (
                    <TableRow key={rank.id}>
                      <TableCell className="font-medium">{rank.title}</TableCell>
                      <TableCell>${rank.business_amount.toLocaleString()}</TableCell>
                      <TableCell>${rank.bonus.toLocaleString()}</TableCell>
                      <TableCell>
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
                            ? 'Current Rank'
                            : 'Locked'}
                        </span>
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
