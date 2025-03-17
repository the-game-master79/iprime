import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { Copy, Users, ChevronDown, ChevronUp, Share2, Download, LineChart, BarChart, GitBranchPlus, ChevronRight } from "lucide-react";
import ShellLayout from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, StatCard, EmptyState } from "@/components/ui-components";
import { Label } from "@/components/ui/label";

// Marketing materials
const marketingMaterials = [
  { id: 1, title: "Investment Brochure", type: "PDF", size: "2.4 MB", thumbnail: "📄" },
  { id: 2, title: "Social Media Banner", type: "PNG", size: "850 KB", thumbnail: "🖼️" },
  { id: 3, title: "Email Template", type: "HTML", size: "12 KB", thumbnail: "📧" },
  { id: 4, title: "Presentation Slides", type: "PPTX", size: "5.6 MB", thumbnail: "📊" },
];

// Update the team data type
interface TeamMember {
  id: string;
  name: string;
  level: number;
  joinDate: string;
  status: string;
  commissions: number;
  referrerName: string;
  totalInvested: number; // Add this line
}

interface TeamTreeNode extends TeamMember {
  children: TeamTreeNode[];
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
  const [expandedLevel, setExpandedLevel] = useState<number | null>(1);
  const [teamData, setTeamData] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedLevels, setExpandedLevels] = useState<number[]>([1]);
  const [treeData, setTreeData] = useState<TeamTreeNode[]>([]);
  const [commissionStructure, setCommissionStructure] = useState<CommissionStructure[]>([]);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [activeMembers, setActiveMembers] = useState(0); // renamed from activeReferrers
  const [currentMonthCommissions, setCurrentMonthCommissions] = useState(0);
  const [totalBusiness, setTotalBusiness] = useState(0);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', user.id)
            .single();
            
          if (profile?.referral_code) {
            setReferralCode(profile.referral_code); // Add this line
            setReferralLink(`${window.location.origin}/auth/register?ref=${profile.referral_code}`);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const organizeDataIntoTree = (data: TeamMember[]) => {
    const level1Members = data.filter(m => m.level === 1);
    
    const buildTree = (member: TeamMember): TeamTreeNode => {
      const children = data.filter(m => m.referrerName === member.name);
      return {
        ...member,
        children: children.map(child => buildTree(child))
      };
    };

    return level1Members.map(member => buildTree(member));
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setTeamData([]);
          return;
        }

        // Get complete referral network data
        const { data: relationships, error } = await supabase
          .from('referral_relationships')
          .select(`
            id,
            level,
            referred:profiles!referral_relationships_referred_id_fkey (
              id,
              first_name,
              last_name,
              created_at,
              status,
              referred_by,
              total_invested
            ),
            referrer:profiles!referral_relationships_referrer_id_fkey (
              first_name,
              last_name,
              referral_code
            )
          `)
          .eq('referrer_id', session.user.id)
          .order('level', { ascending: true });

        if (error) {
          console.error('Error fetching team data:', error);
          setTeamData([]);
          return;
        }

        // Get all referral codes for mapping
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('referral_code, first_name, last_name');

        // Create a map of referral codes to names
        const referralCodeToName = (allProfiles || []).reduce((acc: { [key: string]: string }, profile) => {
          if (profile.referral_code) {
            acc[profile.referral_code] = `${profile.first_name} ${profile.last_name}`;
          }
          return acc;
        }, {});

        // Process and format the team data
        const processedData = relationships
          ?.filter(rel => rel.referred)
          .map(rel => ({
            id: rel.referred.id,
            name: `${rel.referred.first_name} ${rel.referred.last_name}`,
            level: rel.level,
            joinDate: new Date(rel.referred.created_at).toLocaleDateString(),
            status: rel.referred.status || 'Active',
            commissions: 0,
            totalInvested: rel.referred.total_invested || 0,
            referrerName: rel.referred.referred_by 
              ? referralCodeToName[rel.referred.referred_by] || 'Unknown'
              : 'Direct'
          }));

        setTeamData(processedData || []);
        setTreeData(organizeDataIntoTree(processedData || []));
      } catch (error) {
        console.error('Error:', error);
        setTeamData([]);
      } finally {
        setIsLoading(false);
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
          .eq('type', 'commission')
          .eq('status', 'Completed');

        if (error) throw error;

        const total = (data || []).reduce((sum, tx) => sum + tx.amount, 0);
        setTotalCommissions(total);
      } catch (error) {
        console.error('Error fetching commissions:', error);
      }
    };

    fetchCommissions();
  }, []);

  useEffect(() => {
    const fetchActiveMembers = async () => { // renamed from fetchActiveReferrers
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Get all team members with their investment amounts
        const { data, error } = await supabase
          .from('referral_relationships')
          .select(`
            referred:profiles!referral_relationships_referred_id_fkey (
              id,
              total_invested
            )
          `)
          .neq('referred_id', session.user.id);

        if (error) throw error;

        // Count members with active investments (total_invested > 0)
        const activeCount = data.filter(rel => rel.referred?.total_invested > 0).length;
        setActiveMembers(activeCount);
      } catch (error) {
        console.error('Error fetching active members:', error);
        setActiveMembers(0);
      }
    };

    fetchActiveMembers();
  }, []);

  useEffect(() => {
    const fetchCurrentMonthCommissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Get the start and end of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        const { data, error } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', session.user.id)
          .eq('type', 'commission')
          .eq('status', 'Completed')
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        if (error) throw error;

        const total = (data || []).reduce((sum, tx) => sum + tx.amount, 0);
        setCurrentMonthCommissions(total);
      } catch (error) {
        console.error('Error fetching current month commissions:', error);
      }
    };

    fetchCurrentMonthCommissions();
  }, []);

  useEffect(() => {
    const calculateTotalBusiness = () => {
      const total = teamData.reduce((sum, member) => sum + (member.totalInvested || 0), 0);
      setTotalBusiness(total);
    };

    calculateTotalBusiness();
  }, [teamData]);

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Link copied",
      description: "Referral link copied to clipboard",
    });
  };

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const getTeamByLevel = (level: number) => {
    return teamData.filter(member => member.level === level)
      .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
  };

  const getCommissionForMember = (member: TeamMember) => {
    const levelStructure = commissionStructure.find(cs => cs.level === member.level);
    if (!levelStructure) return 0;
    return (member.totalInvested * levelStructure.percentage) / 100;
  };

  const TreeNode = ({ node, level = 0 }: { node: TeamTreeNode; level?: number }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children.length > 0;
  
    return (
      <div className="relative">
        <div className={`flex items-center ${level > 0 ? 'ml-8 mt-2' : 'mt-0'}`}>
          {level > 0 && (
            <div className="absolute left-0 top-0 h-full w-8">
              <div className="absolute left-0 top-0 border-l-2 border-muted-foreground/20 h-1/2 w-full" />
              <div className="absolute left-0 top-1/2 border-b-2 border-muted-foreground/20 w-full" />
            </div>
          )}
          <div 
            className="flex-1 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                />
              )}
              <div>
                <div className="font-medium">{node.name}</div>
                <div className="text-sm text-muted-foreground">Level {node.level}</div>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-8">
            {node.children.map((child, index) => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ShellLayout>
      <PageHeader 
        title="Affiliate Program" 
        description="Earn commissions by referring new investors to GrowthVest"
      />

      <div className="bg-muted p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-3">How to Earn</h2>
        <ul className="space-y-2 text-muted-foreground list-disc pl-5">
          <li>Users can earn across 10 levels</li>
          <li>Receive Volume Bonus upon Rank completion</li>
          <li>Get 1% Team Rewards on Sapphire Rank Achievement</li>
        </ul>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Referrals"
          value={teamData.length.toString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Commission Earned"
          value={`$${totalCommissions.toLocaleString()}`}
          icon={<LineChart className="h-4 w-4" />}
        />
        <StatCard
          title="Business Volume"
          value={`$${totalBusiness.toLocaleString()}`}
          icon={<BarChart className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="referral" className="space-y-6">
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[280px,1fr]">
          {/* Vertical Tab List */}
          <div className="space-y-1">
            <TabsList className="flex flex-col h-auto w-full bg-muted p-1 gap-1">
              <TabsTrigger 
                value="referral" 
                className="w-full justify-start gap-2 px-3"
              >
                <Copy className="h-4 w-4" />
                My Referral Link
              </TabsTrigger>
              <TabsTrigger 
                value="team" 
                className="w-full justify-start gap-2 px-3"
              >
                <Users className="h-4 w-4" />
                My Team
              </TabsTrigger>
              <TabsTrigger 
                value="tree" 
                className="w-full justify-start gap-2 px-3"
              >
                <GitBranchPlus className="h-4 w-4" />
                Tree View
              </TabsTrigger>
              <TabsTrigger 
                value="commissions" 
                className="w-full justify-start gap-2 px-3"
              >
                <LineChart className="h-4 w-4" />
                Commissions
              </TabsTrigger>
              <TabsTrigger 
                value="materials" 
                className="w-full justify-start gap-2 px-3"
              >
                <Download className="h-4 w-4" />
                Marketing
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            <TabsContent value="referral">
              <Card>
                <CardHeader>
                  <CardTitle>Your Referral Information</CardTitle>
                  <CardDescription>Share these details to earn commissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Your Referral Code</Label>
                    <div className="flex space-x-2">
                      <Input value={referralCode} readOnly className="flex-1" />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          toast({
                            title: "Copied!",
                            description: "Referral code copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Your Referral Link</Label>
                    <div className="flex space-x-2">
                      <Input value={referralLink} readOnly className="flex-1" />
                      <Button variant="outline" size="icon" onClick={copyReferralLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Team Structure</CardTitle>
                  <CardDescription>
                    View your complete referral network hierarchy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                      <div key={level} className="border rounded-lg overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 bg-muted cursor-pointer"
                          onClick={() => toggleLevel(level)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              {level}
                            </div>
                            <div>
                              <h3 className="font-medium">Level {level} Members</h3>
                              <p className="text-sm text-muted-foreground">
                                {getTeamByLevel(level).length} members
                              </p>
                            </div>
                          </div>
                          {expandedLevels.includes(level) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>

                        {expandedLevels.includes(level) && (
                          <div className="overflow-x-auto -mx-4 sm:mx-0">
                            <div className="inline-block min-w-full align-middle">
                              <table className="w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Referred By</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Package</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Join Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Commissions</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-background divide-y divide-border">
                                  {getTeamByLevel(level).map((member) => (
                                    <tr key={member.id} className="hover:bg-muted/50">
                                      <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">{member.name}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">{member.referrerName}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">${member.totalInvested.toLocaleString()}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">{member.joinDate}</td>
                                      <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">
                                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                                          ${member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                          {member.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm">${getCommissionForMember(member).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tree" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GitBranchPlus className="h-5 w-5" />
                    Organizational Structure
                  </CardTitle>
                  <CardDescription>
                    View your team's hierarchical structure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {treeData.length > 0 ? (
                      treeData.map((node) => (
                        <TreeNode key={node.id} node={node} />
                      ))
                    ) : (
                      <EmptyState
                        icon={<Users />}
                        title="No team members yet"
                        description="Start sharing your referral link to build your team"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Commission Structure</CardTitle>
                  <CardDescription>
                    Learn how you earn from your referral network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {commissionStructure.map((level) => (
                      <div key={level.level} className="flex justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">Level {level.level}</div>
                          <div className="text-sm text-muted-foreground">{level.description}</div>
                        </div>
                        <div className="text-xl font-bold">{level.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="materials" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Marketing Materials</CardTitle>
                  <CardDescription>
                    Download resources to help you promote GrowthVest
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {marketingMaterials.map((material) => (
                      <div key={material.id} className="flex items-center p-3 sm:p-4 border rounded-lg">
                        <div className="text-2xl sm:text-3xl mr-3 sm:mr-4">{material.thumbnail}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{material.title}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">{material.type} · {material.size}</div>
                        </div>
                        <Button variant="ghost" size="icon" className="ml-2">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </ShellLayout>
  );
};

export default Affiliate;
