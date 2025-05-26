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
  const ranksPerPage = 6; // Show 6 items per page

  useEffect(() => {
    if (currentUser) return;
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, [currentUser]);

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
      <Topbar title="Affiliate Dashboard" />

      {/* Stats Overview */}
      <div className="container max-w-[1000px] mx-auto px-4 mb-6 mt-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <BalanceCard 
            label="All affiliates"
            amount={teamData.length}
            variant="referrals"
            valueClassName="font-mono"
          />

          <BalanceCard 
            label="Income"
            amount={totalCommissions}
            variant="commission"
          />

          <BalanceCard 
            label="Biz Volume"
            amount={totalBusiness}
            variant="business"
          />

          <BalanceCard 
            label="Directs"
            amount={directReferralsCount}
            variant="direct"
          />
        </div>
      </div>

      {/* --- Dialog Buttons Section --- */}
      <div className="container max-w-[1000px] mx-auto px-4 mb-8">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          {/* Download Brochure Button (direct download, no dialog) */}
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
              Download Brochure
            </a>
          </Button>

          {/* Commission Rates Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Commission Rates</Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#3b82f6" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-blue-700">Commission Rates</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-2 py-2">
                {commissionStructure.length === 0 ? (
                  <div className="text-secondary-foreground text-sm">No commission structure available.</div>
                ) : (
                  commissionStructure.map((level) => {
                    // Count users in this level
                    const count = teamData.filter(m => m.level === level.level).length;
                    return (
                      <div key={level.level} className="flex justify-between items-center p-2 rounded-md hover:bg-secondary-foreground transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">Level {level.level}</span>
                          <span className="text-xs text-muted-foreground">{level.description}</span>
                          <Badge className="ml-2" variant="secondary">
                            {count} user{count !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <span className="font-medium text-green-600">{level.percentage}%</span>
                      </div>
                    );
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Rank Benefits Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Rank Benefits</Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0"
              closeIconClassName="text-foreground"
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#22c55e" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-green-700">Rank Benefits</DialogTitle>
                </div>
              </DialogHeader>
              <div className="py-2">
                {ranks.length === 0 ? (
                  <div className="text-secondary-foreground text-sm">No referral benefits available.</div>
                ) : (
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
                        </div>
                      ))}
                  </div>
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

          {/* Volume Benefits Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Referral Benefits</Button>
            </DialogTrigger>
            <DialogContent className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0"
              closeIconClassName="text-foreground"
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="#3b82f6" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-blue-700">Referral Benefits</DialogTitle>
                </div>
              </DialogHeader>
              <div className="py-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Card for each volume benefit */}
                  <div className="rounded-xl bg-secondary-foreground text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
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
                  </div>
                  <div className="rounded-xl bg-secondary-foreground text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
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
                  </div>
                  <div className="rounded-xl bg-secondary-foreground text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
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
                  </div>
                  <div className="rounded-xl bg-secondary-foreground text-foreground border border-secondary-foreground/10 p-4 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        100+ Referrals
                      </Badge>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Valid until 30 June 2025
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      $1000 Amazon Gift Card
                    </div>
                  </div>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm py-2 text-muted-foreground mt-4">
                  <li>Earn extra rewards for reaching business volume milestones.</li>
                  <li>Unlock new tiers and incentives as your network grows.</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>

          {/* Rounder Bonus Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Rounder Bonus</Button>
            </DialogTrigger>
            <DialogContent
              className="bg-secondary text-foreground max-w-2xl shadow-2xl rounded-2xl border-0 dark:bg-[#18181b] dark:text-foreground"
              closeIconClassName="text-foreground"
            >
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 p-2">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path fill="#22c55e" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                  </span>
                  <DialogTitle className="text-2xl font-bold text-green-700 dark:text-green-400">Rounder Bonus</DialogTitle>
                </div>
              </DialogHeader>
              <div className="text-base py-2 text-muted-foreground mb-2">
                <span className="font-semibold text-green-700 dark:text-green-400">Qualify for the Rounder Bonus</span> by maintaining active plans and achieving a minimum number of direct referrals.<br />
                <span className="text-muted-foreground">Bonus is paid monthly to eligible affiliates.</span>
              </div>
              {/* Enhanced Pie Chart Section */}
              <div className="flex flex-col sm:flex-row gap-8 items-center justify-center mt-6">
                {/* Team Members Pie */}
                <div className="flex flex-col items-center bg-secondary-foreground/80 dark:bg-zinc-800 rounded-xl shadow-md p-4 min-w-[180px]">
                  <Pie
                    data={{
                      labels: ["Your Team", "Remaining"],
                      datasets: [
                        {
                          data: [teamData.length, Math.max(400 - teamData.length, 0)],
                          backgroundColor: [
                            "rgba(34,197,94,0.85)", // green
                            "rgba(55,65,81,0.7)", // gray-700 for dark, will be overridden below
                          ],
                          borderColor: [
                            "#22c55e",
                            "#e5e7eb"
                          ],
                          borderWidth: 2,
                          hoverOffset: 8,
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
                      // Dynamically set background color for dark/light mode
                      animation: false,
                    }}
                    width={140}
                    height={140}
                    redraw
                  />
                  <div className="mt-2 text-xs text-foreground text-center">
                    <span className="font-semibold text-green-700 dark:text-green-400 text-lg">{teamData.length}</span>
                    <span className="text-xs text-muted-foreground"> / 400</span>
                    <div className="text-xs text-muted-foreground">Team Members</div>
                  </div>
                </div>
                {/* Business Volume Pie */}
                <div className="flex flex-col items-center bg-secondary-foreground/80 dark:bg-zinc-800 rounded-xl shadow-md p-4 min-w-[180px]">
                  <Pie
                    data={{
                      labels: ["Your Volume", "Remaining"],
                      datasets: [
                        {
                          data: [totalBusiness, Math.max(1_000_000 - totalBusiness, 0)],
                          backgroundColor: [
                            "rgba(59,130,246,0.85)", // blue
                            "rgba(55,65,81,0.7)", // gray-700 for dark, will be overridden below
                          ],
                          borderColor: [
                            "#3b82f6",
                            "#e5e7eb"
                          ],
                          borderWidth: 2,
                          hoverOffset: 8,
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
                    width={140}
                    height={140}
                    redraw
                  />
                  <div className="mt-2 text-xs text-foreground text-center">
                    <span className="font-semibold text-blue-700 dark:text-blue-400 text-lg">${totalBusiness.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground"> / $1,000,000</span>
                    <div className="text-xs text-muted-foreground">Team Volume</div>
                  </div>
                </div>
              </div>
              {/* Salary Credit Table */}
              <div className="mt-10">
                <div className="mb-3 text-lg font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="#22c55e" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  Salary Credit Tiers
                </div>
                <table className="min-w-full text-sm border border-green-200 rounded-lg overflow-hidden shadow">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="px-3 py-2 text-left font-semibold text-green-700 border-b">Team Members</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-700 border-b">Team Volume</th>
                      <th className="px-3 py-2 text-left font-semibold text-green-700 border-b">Salary Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-green-100/60 font-semibold">
                      <td className="px-3 py-2 text-green-800">400</td>
                      <td className="px-3 py-2 text-green-800">1 Million</td>
                      <td className="px-3 py-2 text-green-700 font-bold">$5,000 monthly</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-green-800">800</td>
                      <td className="px-3 py-2 text-green-800">10 Million</td>
                      <td className="px-3 py-2 text-green-700 font-semibold">$7,500 monthly</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-green-800">2000</td>
                      <td className="px-3 py-2 text-green-800">50 Million</td>
                      <td className="px-3 py-2 text-green-700 font-semibold">$25,000 monthly</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-8 flex items-center justify-center">
                <span className="inline-block bg-gradient-to-r from-green-400 to-blue-400 text-white px-4 py-2 rounded-full shadow font-semibold text-sm">
                  Keep growing your team and volume to unlock higher rewards!
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
                </div>

                <div className="space-y-2">
                  <Label>Referral Link</Label>
                  <div className="flex gap-2">
                    <Input value={referralLink} readOnly className="font-mono text-foreground text-sm bg-secondary-foreground" />
                    <Button className="border border-border"  variant="outline" size="icon" onClick={copyReferralLink}>
                      <Copy className="h-4 w-4" />
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
            <Card className="bg-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle>Share</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Referral Code</Label>
                  <div className="flex gap-2">
                    <Input value={referralCode} readOnly className="font-mono text-sm bg-muted" />
                    <Button variant="outline" size="icon" onClick={() => {
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
                    <Input value={referralLink} readOnly className="font-mono text-sm bg-muted" />
                    <Button variant="outline" size="icon" onClick={copyReferralLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {currentReferrer && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                    <span>Referred by <span className="font-medium">{currentReferrer}</span></span>
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
                    <CardTitle>Network Structure</CardTitle>
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
                  <div className="text-center p-6 border-2 border-dashed rounded-lg mx-4 sm:mx-6 mb-4">
                    <h3 className="font-medium text-muted-foreground">No Team Members Yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Start building your network by sharing your referral code
                    </p>
                  </div>
                ) : (
                  // Add gap between accordions
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Affiliate;
