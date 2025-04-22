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

interface Affiliate {
  id: string;
  name: string;
  referrals: number;
  directCount: number;
  commissions: number;
  joinDate: string;
  email: string;
  lastReferralDate?: string;
  isRecentlyActive?: boolean;
}

// Add these objects outside component for reusability
const SORT_OPTIONS = [
  { value: "commissions", label: "Commissions" },
  { value: "directCount", label: "Direct Referrals" },
  { value: "referrals", label: "Total Referrals" },
  { value: "joinDate", label: "Join Date" }
] as const;

// Add this helper function before the component
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).toUpperCase();
};

const AffiliatesPage = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("joinDate"); // Change default value
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [totalCommissions, setTotalCommissions] = useState(0);

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

      // Get ALL referral relationships for network size calculation
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
        // Calculate direct referrals (level 1 only)
        const directReferrals = relationships?.filter(rel => 
          rel.referrer_id === profile.id && 
          rel.level === 1
        ) || [];
        
        // Calculate total referrals (all levels)
        const totalReferrals = relationships?.filter(rel => 
          rel.referrer_id === profile.id
        ).length || 0;

        // Calculate total earnings from both commission and rank bonus transactions
        const totalEarnings = (transactions || [])
          .filter(tx => tx.user_id === profile.id)
          .filter(tx => tx.type === 'commission' || tx.type === 'rank_bonus') // Explicitly check both types
          .reduce((sum, tx) => sum + Number(tx.amount), 0); // Use Number() to ensure proper addition

        const lastReferral = directReferrals[0];
        const lastReferralDate = lastReferral ? new Date(lastReferral.created_at) : null;
        const isRecentlyActive = lastReferralDate ? lastReferralDate > fortyEightHoursAgo : false;

        return {
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email || '',
          referrals: totalReferrals, // All downline members
          directCount: directReferrals.length, // Only direct referrals
          commissions: totalEarnings,
          status: profile.status || 'Active',
          joinDate: formatDate(new Date(profile.created_at)),
          lastReferralDate: lastReferralDate ? formatDate(lastReferralDate) : undefined,
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
          
          {/* Add sorting controls */}
          <div className="flex items-center gap-2">
            <Select
              value={sortField}
              onValueChange={(value) => setSortField(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              className="w-9 h-9"
            >
              <ArrowDownUp className={`h-4 w-4 transition-transform ${
                sortDirection === "desc" ? "rotate-180" : ""
              }`} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Total Referrals</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Join Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell className="font-medium">{affiliate.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{affiliate.name}</span>
                      <span className={`text-xs ${
                        affiliate.directCount === 0 
                          ? 'text-red-500' 
                          : affiliate.directCount === 1 
                          ? 'text-yellow-500' 
                          : 'text-green-500'
                      }`}>
                        Direct Referrals: {affiliate.directCount}/2
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{affiliate.referrals}</TableCell>
                  <TableCell>${affiliate.commissions}</TableCell>
                  <TableCell>{affiliate.joinDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AffiliatesPage;
