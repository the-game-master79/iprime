import React, { useState, useEffect } from "react";
import { ArrowDownUp, Download, Search, Users, LineChart, BarChart, MinusSquare, PlusSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  PageHeader,
  StatCard
} from "@/components/ui-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tree, TreeNode as OrgTreeNode } from 'react-organizational-chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Affiliate {
  id: string;
  name: string;
  referrals: number;
  commissions: number;
  status: string;
  joinDate: string;
  email: string;
  lastReferralDate?: string;
  isRecentlyActive?: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  level: number;
  joinDate: string;
  status: string;
  totalInvested: number;
  referralCode: string;
  children: TeamMember[];
}

const AffiliatesPage = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [topPerformerSort, setTopPerformerSort] = useState<"commissions" | "referrals">("commissions");
  const [showTreeDialog, setShowTreeDialog] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TeamMember[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    try {
      setIsLoading(true);

      // Get all users with their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          status,
          created_at,
          referral_code
        `);

      if (profilesError) throw profilesError;

      // Get referral relationships with timestamps
      const { data: relationships, error: relationshipsError } = await supabase
        .from('referral_relationships')
        .select('*')
        .order('created_at', { ascending: false });

      if (relationshipsError) throw relationshipsError;

      // Get ALL commission-related transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .in('type', ['commission', 'rank_bonus', 'investment_return'])
        .eq('status', 'Completed');

      if (transactionsError) throw transactionsError;

      // Calculate the timestamp for 48 hours ago
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

      // Process data
      const processedAffiliates = profiles?.map(profile => {
        const userReferrals = relationships?.filter(rel => rel.referrer_id === profile.id) || [];
        
        // Calculate total earnings from all transaction types
        const totalEarnings = (transactions || [])
          .filter(tx => tx.user_id === profile.id)
          .reduce((sum, tx) => {
            if (!tx.amount) return sum;
            
            switch (tx.type) {
              case 'commission':
                return sum + tx.amount; // Direct commission amount
              case 'rank_bonus':
                return sum + tx.amount; // Rank achievement bonus
              case 'investment_return':
                return sum + tx.amount; // Investment returns
              default:
                return sum;
            }
          }, 0);

        // Get the most recent referral date
        const lastReferral = userReferrals[0];
        const lastReferralDate = lastReferral ? new Date(lastReferral.created_at) : null;
        const isRecentlyActive = lastReferralDate ? lastReferralDate > fortyEightHoursAgo : false;

        return {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email || '',
          referrals: userReferrals.length,
          commissions: totalEarnings, // Total earnings from all commission types
          status: profile.status || 'Active',
          joinDate: new Date(profile.created_at).toLocaleDateString(),
          lastReferralDate: lastReferralDate?.toLocaleString(),
          isRecentlyActive
        };
      }) || [];

      setAffiliates(processedAffiliates);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAffiliateTree = async (affiliateId: string) => {
    try {
      const { data: networkData, error } = await supabase
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
            total_invested,
            referral_code
          )
        `)
        .eq('referrer_id', affiliateId);

      if (error) throw error;

      const processedData = networkData
        ?.filter(rel => rel.referred)
        .map(rel => ({
          id: rel.referred.id,
          name: `${rel.referred.first_name} ${rel.referred.last_name}`,
          level: rel.level,
          joinDate: new Date(rel.referred.created_at).toLocaleDateString(),
          status: rel.referred.status || 'Active',
          totalInvested: rel.referred.total_invested || 0,
          referralCode: rel.referred.referral_code,
          children: []
        }));

      // Build tree structure
      const buildTree = (members: TeamMember[], level: number = 1): TeamMember[] => {
        const levelMembers = members.filter(m => m.level === level);
        return levelMembers.map(member => ({
          ...member,
          children: buildTree(members, level + 1)
        }));
      };

      setTreeData(buildTree(processedData || []));
    } catch (error) {
      console.error('Error fetching affiliate tree:', error);
    }
  };

  const toggleNodeCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const OrganizationalNode = ({ node }: { node: TeamMember }) => (
    <div className="relative group">
      <div className="relative p-4 min-w-[240px] rounded-lg border border-border/50 bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200">
        <Button
          variant="ghost"
          size="icon"
          className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeCollapse(node.id);
          }}
        >
          {collapsedNodes.includes(node.id) ? (
            <PlusSquare className="h-4 w-4" />
          ) : (
            <MinusSquare className="h-4 w-4" />
          )}
        </Button>
        
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="font-medium text-base">{node.name}</div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm text-muted-foreground bg-accent/50 px-2 py-0.5 rounded">Level {node.level}</span>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {node.referralCode}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1 text-sm w-full">
            <div className="text-center p-1.5 rounded bg-muted/50">
              <div className="text-xs text-muted-foreground">Investment</div>
              <div className="font-medium">${node.totalInvested.toLocaleString()}</div>
            </div>
            <div className="text-center p-1.5 rounded bg-muted/50">
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="font-medium">{node.joinDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTree = (node: TeamMember) => {
    if (collapsedNodes.includes(node.id)) {
      return <OrgTreeNode label={<OrganizationalNode node={node} />} />;
    }
    return (
      <OrgTreeNode label={<OrganizationalNode node={node} />}>
        {node.children.map((child) => renderTree(child))}
      </OrgTreeNode>
    );
  };

  // Filter and sort affiliates
  const filteredAffiliates = affiliates.filter(
    (affiliate) =>
      affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      affiliate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedAffiliates = [...filteredAffiliates].sort((a, b) => {
    if (!sortField) return 0;
    
    const fieldA = a[sortField as keyof typeof a];
    const fieldB = b[sortField as keyof typeof b];
    
    if (fieldA < fieldB) return sortDirection === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getTopPerformers = () => {
    return [...affiliates]
      .sort((a, b) => {
        if (topPerformerSort === "commissions") {
          return b.commissions - a.commissions;
        }
        return b.referrals - a.referrals;
      })
      .slice(0, 5);
  };

  // Calculate statistics
  const totalAffiliates = affiliates.length;
  const activeAffiliates = affiliates.filter(a => a.isRecentlyActive).length;
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.referrals, 0);
  const totalCommissions = affiliates.reduce((sum, a) => sum + a.commissions, 0);

  return (
    <AdminLayout>
      <PageHeader 
        title="Affiliate Management" 
        description="Monitor and manage affiliate partners and their commissions"
        action={
          <Button variant="outline" className="gap-1">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <StatCard
          title="Total Affiliates"
          value={totalAffiliates.toString()}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Active Affiliates (48h)"
          value={activeAffiliates.toString()}
          icon={<Users className="h-4 w-4" />}
          description="Referenced in last 48 hours"
        />
        <StatCard
          title="Total Referrals"
          value={totalReferrals.toString()}
          icon={<LineChart className="h-4 w-4" />}
        />
        <StatCard
          title="Total Commissions"
          value={`$${totalCommissions.toLocaleString()}`}
          icon={<BarChart className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle>Top Performing Affiliates</CardTitle>
                <CardDescription>
                  Affiliates with the highest {topPerformerSort === "commissions" ? "earnings" : "referrals"}
                </CardDescription>
              </div>
              <Select
                value={topPerformerSort}
                onValueChange={(value) => setTopPerformerSort(value as "commissions" | "referrals")}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="commissions">Top Earners</SelectItem>
                  <SelectItem value="referrals">Top Referrers</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getTopPerformers().map((affiliate, index) => (
                  <div key={affiliate.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{affiliate.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {affiliate.referrals} referrals · {affiliate.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {topPerformerSort === "commissions" 
                          ? `$${affiliate.commissions.toLocaleString()}`
                          : `${affiliate.referrals} referrals`
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {topPerformerSort === "commissions" ? "earnings" : "total referrals"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search affiliates..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    Name
                    {sortField === "name" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("referrals")}
                  >
                    Referrals
                    {sortField === "referrals" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("commissions")}
                  >
                    Commissions
                    {sortField === "commissions" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    {sortField === "status" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>
                  <button 
                    className="flex items-center gap-1 hover:text-foreground"
                    onClick={() => handleSort("joinDate")}
                  >
                    Join Date
                    {sortField === "joinDate" && (
                      <ArrowDownUp className="h-3 w-3" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell className="font-medium">{affiliate.id}</TableCell>
                  <TableCell>{affiliate.name}</TableCell>
                  <TableCell>{affiliate.referrals}</TableCell>
                  <TableCell>${affiliate.commissions}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                      ${affiliate.status === 'Active' ? 'bg-green-100 text-green-800' : 
                        affiliate.status === 'Inactive' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {affiliate.status}
                    </span>
                  </TableCell>
                  <TableCell>{affiliate.joinDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedAffiliate(affiliate.id);
                          fetchAffiliateTree(affiliate.id);
                          setShowTreeDialog(true);
                        }}
                      >
                        View
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500">Deactivate</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showTreeDialog} onOpenChange={setShowTreeDialog}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Affiliate Network Structure</DialogTitle>
          </DialogHeader>
          <div className="mt-4 overflow-auto">
            <div className="min-w-[800px] p-4">
              <Tree
                lineWidth="1.5px"
                lineColor="hsl(var(--border))"
                lineBorderRadius="8px"
                label={<div className="h-4" />}
              >
                {treeData.map(node => renderTree(node))}
              </Tree>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AffiliatesPage;
