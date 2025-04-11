import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, Users, ChevronRight, LineChart, BarChart, Users2 } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui-components";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const Affiliate = () => {
  const { toast } = useToast();
  const [referralLink, setReferralLink] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [currentReferrer, setCurrentReferrer] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [commissionStructure, setCommissionStructure] = useState<CommissionStructure[]>([]);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalBusiness, setTotalBusiness] = useState(0);
  const [eligibility, setEligibility] = useState({
    hasDirectReferrals: false,
  });
  const [legendType, setLegendType] = useState<"investments" | "directCount">("investments");

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('referral_code, referred_by')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
          }

          if (profile?.referral_code) {
            setReferralCode(profile.referral_code);
            setReferralLink(`${window.location.origin}/auth/register?ref=${profile.referral_code}`);
          }

          if (profile?.referred_by) {
            const { data: referrer, error: referrerError } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('referral_code', profile.referred_by)
              .single();

            if (referrerError) {
              console.error('Error fetching referrer:', referrerError);
              return;
            }

            if (referrer) {
              setCurrentReferrer(referrer.full_name);
            }
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

    fetchUserProfile();
  }, []);

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
            referred_id,
            referred:profiles!referral_relationships_referred_id_fkey (
              id,
              first_name,
              last_name,
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
            name: `${rel.referred.first_name} ${rel.referred.last_name}`,
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

        const { data, error } = await supabase
          .from('total_business_volumes')
          .select('total_amount')
          .eq('user_id', session.user.id)
          .single();

        if (error) throw error;

        setTotalBusiness(data?.total_amount || 0);
      } catch (error) {
        console.error('Error fetching total business:', error);
      }
    };

    fetchTotalBusiness();
  }, []);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copied",
      description: "Referral link copied to clipboard",
    });
  };

  return (
    <ShellLayout>
        <PageHeader 
          title="Affiliate Program"
          description="Join our affiliate program and earn commissions by referring new members" 
        />

        {/* Stats Overview */}
        <div className="px-4 md:px-8 lg:container mb-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
            <Card className="bg-primary/5">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total Referrals</div>
                    <div className="text-xl sm:text-2xl font-bold">{teamData.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <LineChart className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Commission Earned</div>
                    <div className="text-xl sm:text-2xl font-bold">${totalCommissions.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${
                    totalBusiness > 0 
                      ? 'bg-blue-600' 
                      : 'bg-blue-100'
                    } flex items-center justify-center`}>
                    <BarChart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Business Volume</div>
                    <div className="text-xl sm:text-2xl font-bold">
                      ${totalBusiness.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${
              teamData.filter(m => m.level === 1).length === 0 
                ? 'from-orange-50 to-orange-100/50' 
                : 'from-green-50 to-green-100/50'
            }`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${
                    teamData.filter(m => m.level === 1).length === 0 
                      ? 'bg-orange-600' 
                      : 'bg-green-600'
                    } flex items-center justify-center`}>
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Direct Referrals</div>
                    <div className="text-xl sm:text-2xl font-bold">
                      {teamData.filter(m => m.level === 1).length}/2
                    </div>
                  </div>
                </div>
                {!eligibility.hasDirectReferrals && (
                  <p className={`text-xs mt-3 rounded-full px-3 py-1 ${
                    teamData.filter(m => m.level === 1).length === 0
                      ? 'text-orange-800 bg-orange-100'
                      : 'text-green-800 bg-green-100'
                  }`}>
                    {2 - teamData.filter(m => m.level === 1).length} more to activate commissions
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-2 md:px-8 lg:container">
          <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
            {/* Left Sidebar - Only visible on desktop */}
            <div className="hidden lg:block space-y-4 sm:space-y-6">
              {/* Share Section */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg">Share & Earn</CardTitle>
                  <CardDescription>Use these to invite new members</CardDescription>
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
                      teamData.filter(m => m.level === 1).length >= 2 
                        ? 'text-green-600' 
                        : 'text-amber-600'
                    }`}>
                      Direct Referrals: {teamData.filter(m => m.level === 1).length}/2
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Referral Link</Label>
                    <div className="flex gap-2">
                      <Input value={referralLink} readOnly className="font-mono text-sm text-xs bg-muted" />
                      <Button variant="outline" size="icon" onClick={copyReferralLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {currentReferrer && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                      <div className="flex items-center gap-2 text-green-800">
                        <Users className="h-4 w-4" />
                        <span>Referred by <span className="font-medium">{currentReferrer}</span></span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Mobile Share Section - Only visible on mobile */}
            <div className="lg:hidden space-y-4">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-lg">Share & Earn</CardTitle>
                  <CardDescription>Use these to invite new members</CardDescription>
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
                      teamData.filter(m => m.level === 1).length >= 2 
                        ? 'text-green-600' 
                        : 'text-amber-600'
                    }`}>
                      Direct Referrals: {teamData.filter(m => m.level === 1).length}/2
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Referral Link</Label>
                    <div className="flex gap-2">
                      <Input value={referralLink} readOnly className="font-mono text-sm text-xs bg-muted" />
                      <Button variant="outline" size="icon" onClick={copyReferralLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {currentReferrer && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm">
                      <div className="flex items-center gap-2 text-green-800">
                        <Users className="h-4 w-4" />
                        <span>Referred by <span className="font-medium">{currentReferrer}</span></span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="space-y-4 sm:space-y-6 w-full">
              {/* Replaced Tabs with direct content */}
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Team Overview</CardTitle>
                      <CardDescription>View and manage your referral network</CardDescription>
                    </div>
                    
                    {/* Team Status Legends */}
                    {teamData.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
                        <Select
                          value={legendType}
                          onValueChange={(value) => setLegendType(value as "investments" | "directCount")}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select legend type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="investments">Investment Status</SelectItem>
                            <SelectItem value="directCount">Direct Referrals</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {legendType === "investments" ? (
                          <div className="flex flex-wrap gap-3">
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
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span className="text-sm text-muted-foreground">2+ Direct Referrals</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-amber-500" />
                              <span className="text-sm text-muted-foreground"> 2 Direct Referrals</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:px-6">
                  {teamData.length === 0 ? (
                    <div className="text-center p-6 border-2 border-dashed rounded-lg mx-4 sm:mx-6 mb-4">
                      <Users2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="font-medium text-muted-foreground">No Team Members Yet</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-3">
                        Start building your network by sharing your referral code
                      </p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full divide-y">
                      {Array.from(new Set(teamData.map(m => m.level))).sort((a, b) => a - b).map(level => (
                        <AccordionItem value={`level-${level}`} key={level} className="border-none">
                          <AccordionTrigger className="px-4 sm:px-6 py-3 hover:no-underline">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-7 w-7 items-center justify-center rounded 
                                ${level === 1 ? 'bg-primary/20' : 
                                  level === 2 ? 'bg-blue-100' : 
                                  level === 3 ? 'bg-purple-100' : 
                                  'bg-gray-100'}`}>
                                <Users className={`h-4 w-4 
                                  ${level === 1 ? 'text-primary' : 
                                    level === 2 ? 'text-blue-600' : 
                                    level === 3 ? 'text-purple-600' : 
                                    'text-gray-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-sm text-left">Level {level}</p>
                                <p className="text-xs text-muted-foreground">
                                  {teamData.filter(m => m.level === level).length} members
                                </p>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 sm:px-6 pb-4">
                            <div className="space-y-3">
                              {teamData
                                .filter(member => member.level === level)
                                .map(member => (
                                  <div
                                    key={member.id}
                                    className={`rounded-lg border p-4 transition-colors ${
                                      legendType === "investments" ? (
                                        member.totalSubscriptions > 0
                                          ? 'bg-green-50/50 border-green-100'  
                                          : member.status === 'Active'
                                          ? 'bg-amber-50/50 border-amber-100'
                                          : 'bg-red-50/50 border-red-100'
                                      ) : (
                                        member.directCount >= 2
                                          ? 'bg-green-50/50 border-green-100'
                                          : 'bg-amber-50/50 border-amber-100'
                                      )
                                    }`}
                                  >
                                    <div className="flex justify-between items-start gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium">{member.name}</p>
                                          <div className={`w-2 h-2 rounded-full ${
                                            legendType === "investments" ? (
                                              member.totalSubscriptions > 0
                                                ? 'bg-green-500'
                                                : member.status === 'Active'
                                                ? 'bg-amber-500'
                                                : 'bg-red-500'
                                            ) : (
                                              member.directCount >= 2
                                                ? 'bg-green-500'
                                                : 'bg-amber-500'
                                            )
                                          }`} />
                                        </div>
                                        <Badge 
                                          variant="outline" 
                                          className="w-fit text-[10px] h-5 text-muted-foreground"
                                        >
                                          {member.referralCode}
                                        </Badge>
                                        <p className={`text-xs ${
                                          member.directCount >= 2 
                                            ? 'text-green-600' 
                                            : 'text-amber-600'
                                        }`}>
                                          Direct Referrals: {member.directCount}/2
                                        </p>
                                      </div>
                                      <div className="text-right space-y-1">
                                        <div className="text-sm font-medium">
                                          Business Volume: ${member.totalInvested.toLocaleString()}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          Plans: {member.totalSubscriptions}
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
                  )}
                </CardContent>
              </Card>

              {/* Commission Rates - Mobile & Desktop */}
              <Card>
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
                            className="flex justify-between items-center p-2 rounded-md hover:bg-muted"
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
          </div>
        </div>
    </ShellLayout>
  );
};

export default Affiliate;
