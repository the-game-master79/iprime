import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/shared/Topbar";
import { BalanceCard } from "@/components/shared/BalanceCards";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

interface TeamMember {
  id: string;
  name: string;
  level: number;
  joinDate: string;
  status: string;
  commissions: number;
  referrerName: string;
  totalInvested: number;
  referralCode: string;
  referredBy: string;
  directCount: number;
  totalSubscriptions: number;
}

interface CommissionStructure {
  level: number;
  percentage: number;
  description: string;
}

interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
  created_at: string;
  updated_at: string;
  bonus_description: string;
}

ChartJS.register(ArcElement, Tooltip, Legend);

const Affiliate = () => {
  const { profile, loading } = useUserProfile();
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [currentReferrer, setCurrentReferrer] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [commissionStructure, setCommissionStructure] = useState<CommissionStructure[]>([]);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalBusiness, setTotalBusiness] = useState(0);
  const [userBusiness, setUserBusiness] = useState(0);
  const [eligibility, setEligibility] = useState({
    hasDirectReferrals: false,
  });
  const [legendType, setLegendType] = useState<"investments" | "directCount">("investments");
  const [userDirectCount, setUserDirectCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [rankPage, setRankPage] = useState(1);
  const [ranksPerPage, setRanksPerPage] = useState(3); // Default to 3 for mobile

  useEffect(() => {
    if (currentUser) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [currentUser]);

  // Add enhanced meta data for better SEO when accessed via any CloudForex domain
  useEffect(() => {
    // Check if we're on any CloudForex domain
    const isCloudForexDomain = window.location.hostname.includes('cloudforex');
    
    if (isCloudForexDomain) {
      // Create meta description
      const metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      metaDesc.content = 'Join CloudForex Affiliate Program - Earn commissions, build your network, and unlock exclusive rewards as you refer new members to our platform.';
      document.head.appendChild(metaDesc);
      
      // Create meta keywords
      const metaKeywords = document.createElement('meta');
      metaKeywords.name = 'keywords';
      metaKeywords.content = 'cloudforex affiliate, trading affiliate program, passive income, referral program, commission structure';
      document.head.appendChild(metaKeywords);
      
      // Update title
      document.title = 'CloudForex Affiliate Program | Start Earning Today';
    }
    
    return () => {
      // Clean up if component unmounts
      if (isCloudForexDomain) {
        const metaDesc = document.querySelector('meta[name="description"]');
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaDesc) metaDesc.remove();
        if (metaKeywords) metaKeywords.remove();
      }
    };
  }, []);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, referred_by, direct_count, full_name')
        .eq('id', currentUser.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!currentUser) return;
        if (profileLoading) return; // Wait for profile data to load

        if (profileData?.referral_code) {
          setReferralCode(profileData.referral_code);
          setReferralLink(`${window.location.origin}/auth/register?ref=${profileData.referral_code}`);
        }
        
        setUserDirectCount(profileData?.direct_count || 0);

        if (profileData?.referred_by) {
          const { data: referrer, error: referrerError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('referral_code', profileData.referred_by)
            .single();

          if (referrerError) {
            console.error('Error fetching referrer:', referrerError);
            return;
          }

          if (referrer) {
            setCurrentReferrer(referrer.full_name);
          }
        }
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive"
        });
      }
    };

    if (currentUser) fetchUserProfile();
  }, [currentUser, profileData, profileLoading]);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          setTeamData([]);
          return;
        }

        const { data: networkData, error: networkError } = await supabase
          .from('referral_relationships')
          .select(`
            id,
            level,
            referred:profiles!referral_relationships_referred_id_fkey (
              id,
              full_name,
              email,
              created_at,
              status,
              referred_by,
              referral_code,
              direct_count
            )
          `)
          .eq('referrer_id', session.user.id);

        if ((!networkData || networkData.length === 0) && !networkError) {
          setTeamData([]);
          return;
        }

        if (networkError) throw networkError;

        const referredIds = networkData?.filter(rel => rel.referred).map(rel => rel.referred.id) || [];
        
        const { data: subscriptionsData, error: subsError } = await supabase
          .from('plans_subscriptions')
          .select('user_id, amount, status')
          .in('user_id', referredIds)
          .eq('status', 'approved');

        if (subsError) throw subsError;

        const userStats = subscriptionsData.reduce((acc, sub) => {
          if (!acc[sub.user_id]) {
            acc[sub.user_id] = { totalBusiness: 0, planCount: 0 };
          }
          acc[sub.user_id].totalBusiness += sub.amount;
          acc[sub.user_id].planCount += 1;
          return acc;
        }, {} as Record<string, { totalBusiness: number, planCount: number }>);

        const directReferrals = networkData?.filter(rel => rel.level === 1) || [];
        const hasDirectReferrals = directReferrals.length >= 2;

        setEligibility({
          hasDirectReferrals,
        });

        const processedData = networkData
          ?.filter(rel => rel.referred)
          .map(rel => ({
            id: rel.referred.id,
            name: rel.referred.email || "",
            level: rel.level,
            joinDate: new Date(rel.referred.created_at).toLocaleDateString(),
            status: rel.referred.status || 'Active',
            commissions: 0,
            totalInvested: userStats[rel.referred.id]?.totalBusiness || 0,
            referrerName: 'Direct Sponsor',
            referralCode: rel.referred.referral_code,
            directCount: rel.referred.direct_count || 0,
            referredBy: rel.referred.referred_by || '',
            totalSubscriptions: userStats[rel.referred.id]?.planCount || 0
          }));

        setTeamData(processedData || []);
      } catch (error) {
        console.error('Error:', error);
        setTeamData([]);
        toast({
          title: "Error",
          description: "Failed to load team data. Please try again later.",
          variant: "destructive"
        });
      }
    };

    fetchTeamData();
  }, []);

  useEffect(() => {
    const fetchCommissionStructure = async () => {
      try {
        const { data, error } = await supabase
          .from('commission_structures')
          .select('*')
          .order('level', { ascending: true });

        if (error) {
          console.error('Error fetching commission structure:', error);
          return;
        }

        setCommissionStructure(data || []);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchCommissionStructure();
  }, []);

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', session.user.id)
          .eq('status', 'Completed')
          .eq('type', 'commission');

        if (error) throw error;

        const total = (data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
        setTotalCommissions(total);
      } catch (error) {
        console.error('Error fetching commissions:', error);
      }
    };

    fetchCommissions();
  }, []);

  useEffect(() => {
    const fetchTotalBusiness = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Get total network volume from referred users' subscriptions
        const { data: networkData, error: networkError } = await supabase
          .from('referral_relationships')
          .select('referred_id')
          .eq('referrer_id', session.user.id);

        if (networkError) throw networkError;

        const referredIds = networkData?.map(rel => rel.referred_id) || [];

        // Get all approved subscriptions from network
        const { data: networkSubs, error: subsError } = await supabase
          .from('plans_subscriptions')
          .select('amount')
          .in('user_id', referredIds)
          .eq('status', 'approved');

        if (subsError) throw subsError;

        // Get user's personal subscriptions
        const { data: userSubs, error: userSubsError } = await supabase
          .from('plans_subscriptions')
          .select('amount')
          .eq('user_id', session.user.id)
          .eq('status', 'approved');

        if (userSubsError) throw userSubsError;

        // Calculate total network volume
        const networkVolume = (networkSubs || []).reduce((sum, sub) => sum + (sub.amount || 0), 0);
        
        // Calculate personal volume
        const personalVolume = (userSubs || []).reduce((sum, sub) => sum + (sub.amount || 0), 0);

        // Set both volumes
        setUserBusiness(personalVolume);
        setTotalBusiness(networkVolume + personalVolume);

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
      }
    };
    fetchRanks();
  }, []);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copied",
      description: "Referral link copied to clipboard",
    });
  };

  // Helper to count direct referrals (level 1)
  const directReferralsCount = teamData.filter(m => m.level === 1).length;

  return (
    <div className="min-h-[100dvh] bg-background">
      <Topbar title="Affiliate Dashboard" subtitle="Build your network and earn passive income" />

      {/* Stats Overview */}
      <div className="container max-w-[1000px] mx-auto px-4 mb-6 mt-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <BalanceCard 
            label="Network Size"
            amount={teamData.length}
            variant="referrals"
            valueClassName="font-mono"
            subtitle={`${teamData.filter(m => m.level === 1).length} direct affiliates`}
          />

          <BalanceCard 
            label="Total Earnings"
            amount={totalCommissions}
            variant="commission"
            subtitle="Lifetime commissions"
          />

          <BalanceCard 
            label="Network Volume"
            amount={totalBusiness}
            variant="business"
            subtitle={`${userBusiness} personal volume`}
          />

          <BalanceCard 
            label="Direct Referrals"
            amount={directReferralsCount}
            variant="direct"
            subtitle={directReferralsCount >= 2 ? "Eligible for all tiers" : "Need 2+ for full benefits"}
          />
        </div>
      </div>

      {/* Affiliate Performance Summary - Now visible on all domains */}
      <div className="container max-w-[1000px] mx-auto px-4 mb-8">
        <Card className="bg-secondary border border-green-600/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Your Affiliate Performance</h3>
                <p className="text-sm text-muted-foreground">
                  {directReferralsCount >= 2 
                    ? "You're eligible for all commission tiers! Keep growing your network for more rewards." 
                    : `Invite ${2 - directReferralsCount} more direct referrals to unlock all commission tiers.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant={directReferralsCount >= 2 ? "success" : "outline"} className="px-3 py-1">
                  {directReferralsCount >= 2 ? "Fully Qualified" : "Qualification In Progress"}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  Level {teamData.length > 0 ? Math.max(...teamData.map(m => m.level)) : 0} Deep
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Dialog Buttons Section --- */}
      <div className="container max-w-[1000px] mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          {/* Marketing Resources Button (direct download) */}
          <Button
            variant="outline"
            asChild
          >
            <a
              href="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf_final.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Marketing Resources
            </a>
          </Button>

          {/* Commission Rates Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" id="commission-structure">Commission Structure</Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#3b82f6" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-blue-700">Multi-Level Commission Structure</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-2 py-2">
                {commissionStructure.length === 0 ? (
                  <div className="text-secondary-foreground text-sm">No commission structure available.</div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Our industry-leading multi-level commission structure allows you to earn from your direct referrals and their network, creating true passive income potential.
                    </p>
                    {commissionStructure.map((level) => {
                      // Count users in this level
                      const count = teamData.filter(m => m.level === level.level).length;
                      return (
                        <div key={level.level} className="flex justify-between items-center p-3 rounded-md hover:bg-secondary-foreground transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">Level {level.level}</span>
                            <span className="text-xs text-muted-foreground">{level.description}</span>
                            <Badge className="ml-2" variant="secondary">
                              {count} user{count !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-medium text-green-600">{level.percentage}%</span>
                            {level.level === 1 && (
                              <span className="text-xs text-green-700">Direct Referrals</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-1">Example Earning Potential</h4>
                      <p className="text-xs text-muted-foreground">
                        If your direct referral subscribes to a $1,000 plan, you earn ${(1000 * (commissionStructure[0]?.percentage || 0) / 100).toFixed(2)} instantly.
                        If they refer others, you continue earning from those subscriptions as well!
                      </p>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Rank Benefits Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Rank Benefits</Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#22c55e" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-green-700">Rank & Achievement Benefits</DialogTitle>
                </div>
              </DialogHeader>
              <div className="py-2">
                {ranks.length === 0 ? (
                  <div className="text-secondary-foreground text-sm">No rank benefits available at the moment.</div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      As your network grows and generates more business volume, you'll unlock higher ranks with exclusive one-time bonuses and ongoing benefits.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {ranks
                        .slice((rankPage - 1) * ranksPerPage, rankPage * ranksPerPage)
                        .map(rank => (
                          <div
                            key={rank.id}
                            className="rounded-xl bg-secondary-foreground hover:bg-secondary-foreground/60 p-4 flex flex-col gap-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                                {rank.title}
                              </Badge>
                              <span className="ml-auto text-xs text-foreground">
                                {rank.business_amount?.toLocaleString?.() ?? rank.business_amount} USD
                              </span>
                            </div>
                            <div className="text-lg font-bold text-foreground">
                              {rank.bonus?.toLocaleString?.() ?? rank.bonus} USD Bonus
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {rank.bonus_description}
                            </div>
                            <div className="mt-2 pt-2 border-t border-foreground/10">
                              <span className="text-xs font-medium text-green-600">
                                {totalBusiness >= rank.business_amount 
                                  ? "✓ You've achieved this rank!" 
                                  : `${((totalBusiness / rank.business_amount) * 100).toFixed(1)}% progress`}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {/* Progress Timeline */}
                    <div className="mt-6 relative">
                      <div className="h-2 bg-secondary-foreground rounded-full overflow-hidden">
                        {ranks.length > 0 && (
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500" 
                            style={{ 
                              width: `${Math.min(100, (totalBusiness / ranks[ranks.length - 1].business_amount) * 100)}%` 
                            }}
                          />
                        )}
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-xs text-muted-foreground">0 USD</span>
                        <span className="text-xs text-muted-foreground">
                          {ranks.length > 0 && ranks[ranks.length - 1].business_amount.toLocaleString()} USD
                        </span>
                      </div>
                      <div className="text-center mt-1">
                        <span className="text-xs font-medium text-green-600">
                          Your current volume: {totalBusiness.toLocaleString()} USD
                        </span>
                      </div>
                    </div>
                  </>
                )}
                {/* Pagination Controls */}
                {ranks.length > ranksPerPage && (
                  <div className="flex justify-between items-center mt-5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-foreground border-foreground"
                      disabled={rankPage === 1}
                      onClick={() => setRankPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-foreground">
                      Page {rankPage} of {Math.ceil(ranks.length / ranksPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-foreground border-foreground"
                      disabled={rankPage === Math.ceil(ranks.length / ranksPerPage) || ranks.length === 0}
                      onClick={() => setRankPage(p => Math.min(Math.ceil(ranks.length / ranksPerPage), p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Referral Benefits Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Referral Incentives</Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0"
              closeIconClassName="text-foreground"
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#3b82f6" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-blue-700">Special Referral Incentives</DialogTitle>
                </div>
              </DialogHeader>
              <div className="py-2">
                <p className="text-sm text-muted-foreground mb-3">
                  In addition to our regular commission structure, we offer special incentives for achieving specific referral milestones.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Card for each referral incentive with enhanced design */}
                  <div className="rounded-xl bg-gradient-to-br from-secondary-foreground to-secondary-foreground/80 text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        5 Referrals
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Valid until 30 June 2025
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      $30 Amazon Gift Card
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Successfully refer 5 new members who subscribe to any plan
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="h-1.5 w-full bg-background/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${Math.min(100, (directReferralsCount / 5) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Progress: {directReferralsCount}/5</span>
                        <span className="text-xs font-medium text-blue-400">
                          {directReferralsCount >= 5 ? 'Completed!' : `${Math.min(100, (directReferralsCount / 5) * 100).toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-gradient-to-br from-secondary-foreground to-secondary-foreground/80 text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        20 Referrals
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Valid until 30 June 2025
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      $200 Amazon Gift Card
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Successfully refer 20 new members who subscribe to any plan
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="h-1.5 w-full bg-background/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${Math.min(100, (directReferralsCount / 20) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Progress: {directReferralsCount}/20</span>
                        <span className="text-xs font-medium text-blue-400">
                          {directReferralsCount >= 20 ? 'Completed!' : `${Math.min(100, (directReferralsCount / 20) * 100).toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-gradient-to-br from-secondary-foreground to-secondary-foreground/80 text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        50 Referrals
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Valid until 30 June 2025
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      $500 Amazon Gift Card
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Successfully refer 50 new members who subscribe to any plan
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="h-1.5 w-full bg-background/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${Math.min(100, (directReferralsCount / 50) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Progress: {directReferralsCount}/50</span>
                        <span className="text-xs font-medium text-blue-400">
                          {directReferralsCount >= 50 ? 'Completed!' : `${Math.min(100, (directReferralsCount / 50) * 100).toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-gradient-to-br from-secondary-foreground to-secondary-foreground/80 text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        100+ Referrals
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Valid until 30 June 2025
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      $1,000 Amazon Gift Card
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Successfully refer 100+ new members who subscribe to any plan
                    </div>
                    <div className="mt-auto pt-2">
                      <div className="h-1.5 w-full bg-background/30 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500" 
                          style={{ width: `${Math.min(100, (directReferralsCount / 100) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Progress: {directReferralsCount}/100</span>
                        <span className="text-xs font-medium text-blue-400">
                          {directReferralsCount >= 100 ? 'Completed!' : `${Math.min(100, (directReferralsCount / 100) * 100).toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-1">How to Qualify</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li>Each direct referral must subscribe to at least one active plan</li>
                    <li>Referrals are counted based on unique users, not number of plans</li>
                    <li>Contact support to claim your reward once you reach a milestone</li>
                    <li>Additional volume-based rewards may be available - see Rank Benefits</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Rounder Bonus Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Rounder Bonus</Button>
            </DialogTrigger>
            <DialogContent
              className="bg-secondary text-foreground max-w-md w-full shadow-2xl rounded-xl border-0 dark:bg-[#18181b] dark:text-foreground px-2 py-3 sm:px-4 sm:py-6"
              closeIconClassName="text-foreground"
            >
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 p-1.5">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                      <path fill="#22c55e" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </span>
                  <DialogTitle className="text-lg font-bold text-green-700 dark:text-green-400">Elite Rounder Bonus Program</DialogTitle>
                </div>
              </DialogHeader>
              <div className="text-sm py-1 text-muted-foreground mb-1">
                <span className="font-semibold text-green-700 dark:text-green-400">Qualify for our exclusive Rounder Bonus Program</span> by building a substantial network and maintaining consistent business volume.<br />
                <span className="text-muted-foreground">Receive monthly salary-like payments based on your network performance.</span>
              </div>
              
              {/* Enhanced explanation of how Rounder Bonus works */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3 text-sm">
                <h4 className="font-medium text-green-700 dark:text-green-400 mb-1">How It Works</h4>
                <p className="text-muted-foreground text-xs mb-2">
                  The Rounder Bonus is an elite incentive program that rewards top-performing affiliates with consistent monthly income similar to a salary, based on maintaining specific network metrics:
                </p>
                <ul className="list-disc pl-4 text-xs space-y-1 text-muted-foreground">
                  <li>Build and maintain a qualified team of specified size</li>
                  <li>Generate and maintain minimum network business volume</li>
                  <li>Payments are made monthly as long as requirements are maintained</li>
                  <li>Advance through tiers to increase your monthly bonus payment</li>
                </ul>
              </div>
              
              {/* Charts always side by side */}
              <div className="flex flex-row gap-4 items-center justify-center mt-3">
                {/* Team Members Pie */}
                <div className="flex flex-col items-center bg-secondary-foreground/80 dark:bg-zinc-800 rounded-lg shadow p-2 min-w-[120px] max-w-[140px]">
                  <Pie
                    data={{
                      labels: ["Your Team", "Remaining"],
                      datasets: [
                        {
                          data: [teamData.length, Math.max(400 - teamData.length, 0)],
                          backgroundColor: [
                            "rgba(34,197,94,0.85)",
                            "rgba(55,65,81,0.7)",
                          ],
                          borderColor: [
                            "#22c55e",
                            "#e5e7eb"
                          ],
                          borderWidth: 1.5,
                          hoverOffset: 6,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          enabled: true,
                          callbacks: {
                            label: (ctx) =>
                              ctx.label === "Your Team"
                                ? `Your Team: ${teamData.length}`
                                : `Remaining: ${Math.max(400 - teamData.length, 0)}`,
                          },
                        },
                      },
                      cutout: "70%",
                      animation: false,
                    }}
                    width={90}
                    height={90}
                    redraw
                  />
                  <div className="mt-1 text-xs text-foreground text-center">
                    <span className="font-semibold text-green-700 dark:text-green-400">{teamData.length}</span>
                    <span className="text-xs text-muted-foreground"> / 400</span>
                    <div className="text-xs text-muted-foreground">Team Size</div>
                  </div>
                </div>
                {/* Business Volume Pie */}
                <div className="flex flex-col items-center bg-secondary-foreground/80 dark:bg-zinc-800 rounded-lg shadow p-2 min-w-[120px] max-w-[140px]">
                  <Pie
                    data={{
                      labels: ["Your Volume", "Remaining"],
                      datasets: [
                        {
                          data: [totalBusiness, Math.max(1_000_000 - totalBusiness, 0)],
                          backgroundColor: [
                            "rgba(59,130,246,0.85)",
                            "rgba(55,65,81,0.7)",
                          ],
                          borderColor: [
                            "#3b82f6",
                            "#e5e7eb"
                          ],
                          borderWidth: 1.5,
                          hoverOffset: 6,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          enabled: true,
                          callbacks: {
                            label: (ctx) =>
                              ctx.label === "Your Volume"
                                ? `Your Volume: $${totalBusiness.toLocaleString()}`
                                : `Remaining: $${Math.max(1_000_000 - totalBusiness, 0).toLocaleString()}`,
                          },
                        },
                      },
                      cutout: "70%",
                      animation: false,
                    }}
                    width={90}
                    height={90}
                    redraw
                  />
                  <div className="mt-1 text-xs text-foreground text-center">
                    <span className="font-semibold text-blue-700 dark:text-blue-400">${totalBusiness.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground"> / $1M</span>
                    <div className="text-xs text-muted-foreground">Volume</div>
                  </div>
                </div>
              </div>
              {/* Compact Salary Credit Table */}
              <div className="mt-5">
                <div className="mb-2 text-base font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="#22c55e" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  Monthly Salary Credit Tiers
                </div>
                <table className="min-w-full text-xs border border-green-200 rounded overflow-hidden shadow">
                  <thead>
                    <tr className="bg-green-50 dark:bg-green-900/30">
                      <th className="px-2 py-2 text-left font-semibold text-green-700 dark:text-green-400 border-b">Team Size</th>
                      <th className="px-2 py-2 text-left font-semibold text-green-700 dark:text-green-400 border-b">Network Volume</th>
                      <th className="px-2 py-2 text-left font-semibold text-green-700 dark:text-green-400 border-b">Monthly Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={`bg-green-100/60 dark:bg-green-900/10 font-semibold ${teamData.length >= 400 && totalBusiness >= 1_000_000 ? 'border-l-4 border-l-green-500' : ''}`}>
                      <td className="px-2 py-2 text-green-800 dark:text-green-400">400+</td>
                      <td className="px-2 py-2 text-green-800 dark:text-green-400">$1M+</td>
                      <td className="px-2 py-2 text-green-700 dark:text-green-400 font-bold">$5,000/mo</td>
                    </tr>
                    <tr className={`${teamData.length >= 800 && totalBusiness >= 10_000_000 ? 'border-l-4 border-l-green-500' : ''}`}>
                      <td className="px-2 py-2 text-green-800 dark:text-green-400">800+</td>
                      <td className="px-2 py-2 text-green-800 dark:text-green-400">$10M+</td>
                      <td className="px-2 py-2 text-green-700 dark:text-green-400 font-semibold">$7,500/mo</td>
                    </tr>
                    <tr className={`${teamData.length >= 2000 && totalBusiness >= 50_000_000 ? 'border-l-4 border-l-green-500' : ''}`}>
                      <td className="px-2 py-2 text-green-800 dark:text-green-400">2,000+</td>
                      <td className="px-2 py-2 text-green-800 dark:text-green-400">$50M+</td>
                      <td className="px-2 py-2 text-green-700 dark:text-green-400 font-semibold">$25,000/mo</td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-xs text-muted-foreground mt-2 italic">
                  Note: Both team size and volume requirements must be met to qualify for each tier.
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <span className="inline-block bg-gradient-to-r from-green-400 to-blue-400 text-white px-3 py-1.5 rounded-full shadow font-semibold text-xs">
                  Grow your team & volume to unlock these exclusive rewards!
                </span>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {/* --- End Dialog Buttons Section --- */}

      {/* Main Content */}
      <div className="container max-w-[1000px] mx-auto px-4">
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          {/* Left Sidebar - Only visible on desktop */}
          <div className="hidden lg:block space-y-4 sm:space-y-6">
            <Card className="bg-secondary">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Share with your Network</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Referral Code</Label>
                  <div className="flex gap-2">
                    <Input value={referralCode} readOnly className="font-mono text-foreground text-sm bg-secondary-foreground" />
                    <Button className="border border-border" variant="outline" size="icon" onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      toast({ title: "Copied!", description: "Referral code copied" });
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className={`text-xs ${
                    directReferralsCount >= 2 
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    Direct Referrals: {directReferralsCount}/2
                  </p>
                </div>                  <div className="space-y-2">
                    <Label>Referral Link</Label>
                    <div className="flex gap-2">
                      <Input value={referralLink} readOnly className="font-mono text-foreground text-sm bg-secondary-foreground" />
                      <Button className="border border-border"  variant="outline" size="icon" onClick={copyReferralLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Enhanced sharing options */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <Label className="mb-2 block">Share via:</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-[#25D366] text-white hover:bg-[#25D366]/90 border-none"
                        onClick={() => window.open(`https://wa.me/?text=Join me on CloudForex and start earning! Use my referral code: ${referralCode} or click ${encodeURIComponent(referralLink)}`, '_blank')}
                      >
                        WhatsApp
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-[#1DA1F2] text-white hover:bg-[#1DA1F2]/90 border-none"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join me on CloudForex and start earning! Use my referral code: ${referralCode}&url=${encodeURIComponent(referralLink)}`, '_blank')}
                      >
                        Twitter
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-[#0077B5] text-white hover:bg-[#0077B5]/90 border-none"
                        onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank')}
                      >
                        LinkedIn
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-[#4267B2] text-white hover:bg-[#4267B2]/90 border-none"
                        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank')}
                      >
                        Facebook
                      </Button>
                    </div>
                  </div>

                  {currentReferrer && (
                    <div className="p-3 rounded-lg bg-green-600/20 border border-green-800 text-sm">
                      <span>Referred by:</span>
                       <div><span className="font-bold text-lg">{currentReferrer}</span></div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Move Commission Rates below share card in desktop */}
            <Card className="bg-secondary">
              <Accordion type="single" collapsible>
                <AccordionItem value="commission-rates">
                  <AccordionTrigger className="px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base sm:text-lg">Commission Rates</CardTitle>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-4 sm:px-6 pb-4 space-y-2">
                      {commissionStructure.map((level) => (
                        <div 
                          key={level.level} 
                          className="flex justify-between items-center p-2 rounded-md hover:bg-secondary-foreground transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Level {level.level}</span>
                            <span className="text-xs text-muted-foreground">{level.description}</span>
                          </div>
                          <span className="font-medium text-green-600">{level.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          </div>

          {/* Mobile Share Section */}
          <div className="lg:hidden space-y-4">
            <Card className="bg-secondary">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Share</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Referral Code</Label>
                  <div className="flex gap-2">
                    <Input value={referralCode} readOnly className="font-mono text-foreground text-sm bg-secondary-foreground" />
                    <Button
                      variant="outline"
                      size="icon"
                      className="min-h-[44px] min-w-[44px] border border-border"
                      onClick={() => {
                        navigator.clipboard.writeText(referralCode);
                        toast({ title: "Copied!", description: "Referral code copied" });
                      }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className={`text-xs ${
                    directReferralsCount >= 2 
                      ? 'text-green-600' 
                      : 'text-amber-600'
                  }`}>
                    Direct Referrals: {directReferralsCount}/2
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Referral Link</Label>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="font-mono text-foreground text-sm bg-secondary-foreground" />
                    <Button
                      variant="outline"
                      size="icon"
                      className="min-h-[44px] min-w-[44px] border border-border"
                      onClick={copyReferralLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Enhanced sharing options for mobile */}
                <div className="mt-4 pt-4 border-t border-border">
                  <Label className="mb-2 block">Share via:</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-[#25D366] text-white hover:bg-[#25D366]/90 border-none"
                      onClick={() => window.open(`https://wa.me/?text=Join me on CloudForex and start earning! Use my referral code: ${referralCode} or click ${encodeURIComponent(referralLink)}`, '_blank')}
                    >
                      WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-[#1DA1F2] text-white hover:bg-[#1DA1F2]/90 border-none"
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=Join me on CloudForex and start earning! Use my referral code: ${referralCode}&url=${encodeURIComponent(referralLink)}`, '_blank')}
                    >
                      Twitter
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-[#0077B5] text-white hover:bg-[#0077B5]/90 border-none"
                      onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank')}
                    >
                      LinkedIn
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-[#4267B2] text-white hover:bg-[#4267B2]/90 border-none"
                      onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank')}
                    >
                      Facebook
                    </Button>
                  </div>
                </div>

                {currentReferrer && (
                  <div className="p-3 rounded-lg bg-green-600/20 border border-green-800 text-sm">
                    <span>Referred by:</span>
                    <div><span className="font-bold text-lg">{currentReferrer}</span></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="space-y-4 sm:space-y-6 w-full pb-10">
            {/* Network Structure */}
            <Card className="bg-secondary">
              <CardHeader className="p-4 sm:p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Network Structure</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Your complete affiliate team overview</p>
                    </div>
                    {teamData.length > 0 && (
                      <Select
                        value={legendType}
                        onValueChange={(value) => setLegendType(value as "investments" | "directCount")}
                      >
                        <SelectTrigger className="w-[180px] bg-secondary-foreground">
                          <SelectValue placeholder="Select filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investments">Investment Status</SelectItem>
                          <SelectItem value="directCount">Direct Referrals</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Team Status Legends below title */}
                  {teamData.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {legendType === "investments" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-muted-foreground">Active Plans</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-sm text-muted-foreground">No Plans</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm text-muted-foreground">Inactive</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm text-muted-foreground">2+ Direct Referrals</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-sm text-muted-foreground">≤2 Direct Referrals</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:px-6">
                {teamData.length === 0 ? (
                  <div className="text-center p-8 border-2 border-dashed rounded-lg mx-4 sm:mx-6 mb-4">
                    <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-secondary-foreground/10">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 16C13.6569 16 15 14.6569 15 13C15 11.3431 13.6569 10 12 10C10.3431 10 9 11.3431 9 13C9 14.6569 10.3431 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 13C19 17.4183 15.4183 21 11 21C6.58172 21 3 17.4183 3 13C3 8.58172 6.58172 5 11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 5C15 6.65685 16.3431 8 18 8C19.6569 8 21 6.65685 21 5C21 3.34315 19.6569 2 18 2C16.3431 2 15 3.34315 15 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 className="font-medium text-foreground mb-2">Start Building Your Network</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                      You haven't referred anyone yet. Share your referral code with potential members to start earning commissions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={copyReferralLink}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Referral Link
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/?text=Join me on CloudForex and start earning! Use my referral code: ${referralCode} or click ${encodeURIComponent(referralLink)}`, '_blank')}
                      >
                        Share on WhatsApp
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Network Analytics - New Section */}
                    <div className="grid gap-4 md:grid-cols-2 mb-6">
                      <Card className="bg-secondary-foreground/10 border-0">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <h3 className="font-medium text-foreground">Network Metrics</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-secondary-foreground/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">Total Depth</div>
                                <div className="text-xl font-medium">
                                  {teamData.length > 0 ? Math.max(...teamData.map(m => m.level)) : 0} Levels
                                </div>
                              </div>
                              <div className="p-3 bg-secondary-foreground/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">
                                  {legendType === "investments" ? "Active Members" : "Qualified Members"}
                                </div>
                                <div className="text-xl font-medium">
                                  {legendType === "investments" 
                                    ? `${teamData.filter(m => m.totalSubscriptions > 0).length} / ${teamData.length}`
                                    : `${teamData.filter(m => m.directCount >= 2).length} / ${teamData.length}`}
                                </div>
                              </div>
                              <div className="p-3 bg-secondary-foreground/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">With Active Plans</div>
                                <div className="text-xl font-medium">
                                  {teamData.filter(m => m.totalSubscriptions > 0).length}
                                </div>
                              </div>
                              <div className="p-3 bg-secondary-foreground/20 rounded-lg">
                                <div className="text-xs text-muted-foreground">Average Plan Value</div>
                                <div className="text-xl font-medium">
                                  ${Math.round(teamData.reduce((sum, m) => sum + m.totalInvested, 0) / Math.max(1, teamData.filter(m => m.totalInvested > 0).length)).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-secondary-foreground/10 border-0">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <h3 className="font-medium text-foreground">Distribution by Level</h3>
                            {Array.from(new Set(teamData.map(m => m.level))).sort((a, b) => a - b).map(level => {
                              const count = teamData.filter(m => m.level === level).length;
                              const percentage = Math.round((count / teamData.length) * 100);
                              return (
                                <div key={level} className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <span>Level {level}</span>
                                    <span>{count} ({percentage}%)</span>
                                  </div>
                                  <div className="h-2 bg-secondary-foreground/20 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${level === 1 ? 'bg-green-500' : level === 2 ? 'bg-blue-500' : level === 3 ? 'bg-purple-500' : 'bg-amber-500'}`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Accordion List of Team Members */}
                    <div className="flex flex-col gap-4">
                      <Accordion type="single" collapsible className="w-full">
                      {Array.from(new Set(teamData.map(m => m.level))).sort((a, b) => a - b).map(level => (
                        <AccordionItem 
                          value={`level-${level}`} 
                          key={level} 
                          className="border-none bg-background dark:bg-secondary/10 rounded-xl mb-2"
                        >
                          <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline rounded-t-xl">
                            <div>
                              <p className="font-medium text-sm text-left">Level {level}</p>
                              <p className="text-xs text-muted-foreground">
                                {teamData.filter(m => m.level === level).length} members
                              </p>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 sm:px-6 pb-4 rounded-b-xl">
                            <div className="space-y-3">
                              {teamData
                                .filter(member => member.level === level)
                                .map(member => (
                                  <div
                                    key={member.id}
                                    className={`rounded-lg p-4 transition-colors ${
                                      legendType === "investments" ? (
                                        member.totalSubscriptions > 0
                                          ? 'bg-green-600/10'  
                                          : member.status === 'Active'
                                          ? 'bg-amber-600/10'
                                          : 'bg-red-600/10'
                                      ) : (
                                        member.directCount >= 2
                                          ? 'bg-green-600/10'
                                          : 'bg-amber-600/10'
                                      )
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium">{member.name}</p>
                                          <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            legendType === "investments" 
                                              ? member.totalSubscriptions > 0
                                                ? "bg-green-500"
                                                : member.status === 'Active'
                                                  ? "bg-amber-500"
                                                  : "bg-red-500"
                                              : member.directCount >= 2
                                                ? "bg-green-500" 
                                                : "bg-amber-500"
                                          )} />
                                        </div>
                                        <Badge 
                                          variant="outline" 
                                          className="w-fit text-[10px] h-5 text-muted-foreground"
                                        >
                                          {member.referralCode}
                                        </Badge>
                                        <p className={cn(
                                          "text-xs",
                                          member.directCount === 0 ? "text-red-600" :
                                          member.directCount === 1 ? "text-amber-600" :
                                          "text-green-600"
                                        )}>
                                          Direct Referrals: {member.directCount}/2
                                        </p>
                                      </div>
                                      <div className="text-right space-y-1">
                                        <div className="text-sm font-medium">
                                          Business Volume: ${(member.totalInvested || 0).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Plans: {member.totalSubscriptions || 0}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container max-w-[1000px] mx-auto px-4 mb-12 mt-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-2xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Find answers to common questions about our affiliate program.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Affiliate Program Basics */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M216,48H40A16,16,0,0,0,24,64V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V64A16,16,0,0,0,216,48Zm0,16V88H40V64Zm0,128H40V104H216v88Zm-16-24a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,168Zm0-32a8,8,0,0,1-8,8H152a8,8,0,0,1,0-16h40A8,8,0,0,1,200,136ZM72,160a24,24,0,1,1,24,24A24,24,0,0,1,72,160Z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Affiliate Program Basics</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem 
                value="how-it-works"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">How does the affiliate program work?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    Our affiliate program allows you to earn commissions from your referrals and their networks. When someone you refer subscribes to a plan, you earn a commission based on the plan amount. Additionally, you'll earn commissions from subscriptions made by people in your downline. Please note that this is not to be misused for fraudulent activities such as buying subscriptions yourself or having others make purchases without your knowledge. Upto 30% of the commissions are only distributed.
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem 
                value="qualification"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">How do I qualify for all commission tiers?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    To qualify for all levels of the commission structure, you need at least 2 direct referrals who have active subscriptions. Without this qualification, you may only earn from your Level 1 referrals. This requirement ensures that affiliates are actively building their networks and creates a sustainable growth model for everyone involved.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Commissions & Payments */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm44-68a28,28,0,0,1-28,28H100a8,8,0,0,1-8-8V116a8,8,0,0,1,8-8h44a28,28,0,0,1,28,28,28,28,0,0,1-13.31,23.79A27.93,27.93,0,0,1,172,148Zm-28-12a12,12,0,1,0,0-24H108v24Zm0,16H108v24h36a12,12,0,0,0,0-24Z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Commissions & Payments</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem 
                value="commission-payment"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">When and how are commissions paid?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    Commissions are calculated in real-time and credited to your account balance. You can withdraw your commissions according to our standard withdrawal schedule and methods. There's no minimum threshold for commissions - you'll receive every dollar you earn. Commissions are typically processed within 24-48 hours of the qualifying transaction.
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem 
                value="maximizing-earnings"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">How can I maximize my affiliate earnings?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    To maximize your earnings: 1) Focus on quality referrals who are likely to subscribe to plans, 2) Educate your referrals about the benefits of our platform, 3) Aim to qualify for all commission tiers by getting at least 2 direct referrals, 4) Build depth in your network by encouraging your referrals to become affiliates themselves, 5) Leverage the marketing materials we provide, 6) Regularly engage with your network to maintain activity, and 7) Set goals to reach higher ranks and unlock bonuses.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Rewards & Bonuses */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M232,96a16,16,0,0,0-16-16H211.4l-11.27-45.11A16,16,0,0,0,184.77,24H71.23A16,16,0,0,0,55.87,34.89L44.6,80H40A16,16,0,0,0,24,96v16a40,40,0,0,0,40,40h1.38a88,88,0,0,0,125.24,0H192a40,40,0,0,0,40-40ZM71.23,40h113.54l11.27,45.11,0,.18c0,.23,0,.47,0,.71v26a72.08,72.08,0,0,1-72,72h-32a72.08,72.08,0,0,1-72-72V86c0-.24,0-.48,0-.71s0-.12,0-.18ZM216,112a24,24,0,0,1-24,24h-1.59a87.89,87.89,0,0,0,1.59-16V96h24ZM40,136a24,24,0,0,1-24-24V96H64v24a87.89,87.89,0,0,0,1.59,16H64A24,24,0,0,1,40,136ZM128,152a12,12,0,1,1,12-12A12,12,0,0,1,128,152Z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Rewards & Bonuses</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem 
                value="rounder-bonus"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">What is the Rounder Bonus Program?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    The Rounder Bonus Program is our exclusive reward system for top-performing affiliates. By building a substantial network (400+ members) and generating significant business volume ($1M+), you can qualify for monthly salary-like bonuses starting at $5,000/month. Higher tiers with larger networks and volumes can earn up to $25,000/month. These bonuses are paid in addition to your regular commissions, creating a powerful passive income stream.
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem 
                value="rank-achievements"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">How do rank achievements work?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    As your network grows and generates more business volume, you'll unlock higher ranks with exclusive one-time bonuses and ongoing benefits. Each rank has specific business volume requirements. Once you reach the required volume, you'll receive the corresponding one-time bonus. These bonuses are designed to reward your dedication and success in building a thriving network.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          
          {/* Resources & Support */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M213.66,202.34a8,8,0,0,1-11.32,11.32L156,167.31V216a8,8,0,0,1-16,0V167.31l-46.34,46.35a8,8,0,0,1-11.32-11.32L128.69,156H80a8,8,0,0,1,0-16h48.69L82.34,93.66a8,8,0,0,1,11.32-11.32L140,128.69V80a8,8,0,0,1,16,0v48.69l46.34-46.35a8,8,0,0,1,11.32,11.32L167.31,140H216a8,8,0,0,1,0,16H167.31Z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-semibold">Resources & Support</h2>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem 
                value="marketing-materials"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">What marketing materials are available?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    We provide a variety of marketing materials including brochures, banners, email templates, and social media content that you can use to promote our platform. These resources are designed to help you effectively communicate our value proposition to potential members. Access these materials from the Marketing Resources button in your affiliate dashboard. We regularly update these materials to ensure you have the most effective tools at your disposal.
                  </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem 
                value="marketing-tips"
                className="border border-border/50 rounded-lg bg-card px-4"
              >
                <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <div className="font-medium">How do I effectively promote my affiliate link?</div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-1">
                  <div className="text-muted-foreground text-sm">
                    The most effective ways to promote your affiliate link include creating content that demonstrates the platform's value, sharing testimonials and success stories, leveraging social media and email marketing, participating in relevant communities, creating tutorial videos, and using the marketing materials we provide. Focus on the benefits rather than just the commissions to attract quality referrals who are likely to subscribe.
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;
