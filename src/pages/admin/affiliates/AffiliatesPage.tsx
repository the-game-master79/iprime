import React, { useState, useEffect } from "react";
import { ArrowDownUp, Download, Search, Users, LineChart, BarChart } from "lucide-react";
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

const AffiliatesPage = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [topPerformerSort, setTopPerformerSort] = useState<"commissions" | "referrals">("commissions");
  const [showTreeDialog, setShowTreeDialog] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);

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
        .select('amount, type, user_id, status')
        .eq('status', 'Completed')
        .or('type.eq.commission,type.eq.rank_bonus'); // Include both types

      if (transactionsError) throw transactionsError;

      // Calculate the timestamp for 48 hours ago
      const fortyEightHoursAgo = new Date();
      fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

      // Process data
      const processedAffiliates = profiles?.map(profile => {
        // Only count direct referrals (level 1)
        const userReferrals = relationships?.filter(rel => 
          rel.referrer_id === profile.id && 
          rel.level === 1
        ) || [];
        
        // Calculate total earnings from both commission and rank bonus transactions
        const totalEarnings = (transactions || [])
          .filter(tx => tx.user_id === profile.id)
          .filter(tx => tx.type === 'commission' || tx.type === 'rank_bonus') // Explicitly check both types
          .reduce((sum, tx) => sum + Number(tx.amount), 0); // Use Number() to ensure proper addition

        const lastReferral = userReferrals[0];
        const lastReferralDate = lastReferral ? new Date(lastReferral.created_at) : null;
        const isRecentlyActive = lastReferralDate ? lastReferralDate > fortyEightHoursAgo : false;

        return {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email || '',
          referrals: userReferrals.length, // This now only counts direct referrals
          commissions: totalEarnings,
          status: profile.status || 'Active',
          joinDate: new Date(profile.created_at).toLocaleDateString(),
          lastReferralDate: lastReferralDate?.toLocaleString(),
          isRecentlyActive
        };
      }) || [];

      setAffiliates(processedAffiliates);

      // Calculate overall total commissions - include both commission types
      const overallCommissions = (transactions || [])
        .filter(tx => tx.type === 'commission' || tx.type === 'rank_bonus') // Explicitly check both types
        .reduce((sum, tx) => sum + Number(tx.amount), 0); // Use Number() to ensure proper addition

      setTotalCommissions(overallCommissions);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
    } finally {
      setIsLoading(false);
    }
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
                          setShowTreeDialog(true);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showTreeDialog} onOpenChange={setShowTreeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Affiliate Details</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="text-center text-muted-foreground">
              Network visualization has been temporarily disabled.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AffiliatesPage;
