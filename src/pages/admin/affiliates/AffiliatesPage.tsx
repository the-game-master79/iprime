import { useState, useEffect } from "react";
import { Users, ChartLine, ChartBarHorizontal, Copy, MagnifyingGlass, ArrowsDownUp, DownloadSimple } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/pages/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatCard} from "@/components/ui-components";
import {  Select,  SelectContent,  SelectItem,  SelectTrigger,  SelectValue,} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ITEMS_PER_PAGE = 10;

interface Affiliate {
  id: string;
  name: string;
  referrals: {
    unique: number;
    total: number;
  };
  directCount: number;
  commissions: number;
  rank_bonus: number;
  joinDate: string;
  email: string;
  referral_code: string;
  lastReferralDate?: string;
  isRecentlyActive?: boolean;
}

interface DownlineUser {
  id: string;
  email: string;
  referral_code: string;
  level: number;
  created_at: string;
}

const SORT_OPTIONS = [
  { value: "commissions", label: "Commissions" },
  { value: "directCount", label: "Direct Referrals" },
  { value: "referrals", label: "Total Referrals" },
  { value: "joinDate", label: "Join Date" }
] as const;

const formatDate = (date: Date) => {
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',  
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const AffiliatesPage = () => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("joinDate"); // Change default value
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDownlines, setShowDownlines] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [downlines, setDownlines] = useState<DownlineUser[]>([]);
  const { toast } = useToast();
  const [directEligibleCount, setDirectEligibleCount] = useState(0);
  const [singleDirectCount, setSingleDirectCount] = useState(0);
  const [zeroDirectCount, setZeroDirectCount] = useState(0);
  

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
          full_name,
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
        .in('type', ['commission', 'rank_bonus']);

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

        // Get all relationships for this referrer
        const allReferrals = relationships?.filter(rel => 
          rel.referrer_id === profile.id
        ) || [];

        // Calculate unique referrals by counting unique referred_ids
        const uniqueReferralsCount = new Set(
          allReferrals.map(rel => rel.referred_id)
        ).size;

        // Total referrals including repeated appearances
        const totalReferralsCount = allReferrals.length;

        // Calculate total earnings separated by type
        const userTransactions = transactions?.filter(tx => tx.user_id === profile.id) || [];
        const commissionEarnings = userTransactions
          .filter(tx => tx.type === 'commission')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);
        const rankBonusEarnings = userTransactions
          .filter(tx => tx.type === 'rank_bonus')
          .reduce((sum, tx) => sum + Number(tx.amount), 0);

        const lastReferral = directReferrals[0];
        const lastReferralDate = lastReferral ? new Date(lastReferral.created_at) : null;
        const isRecentlyActive = lastReferralDate ? lastReferralDate > fortyEightHoursAgo : false;

        return {
          id: profile.id,
          name: profile.full_name || "",
          email: profile.email || '',
          referral_code: profile.referral_code || '',
          referrals: {
            unique: uniqueReferralsCount,
            total: totalReferralsCount
          },
          directCount: directReferrals.length,
          commissions: commissionEarnings,
          rank_bonus: rankBonusEarnings,
          status: profile.status || 'Active',
          joinDate: formatDate(new Date(profile.created_at)),
          lastReferralDate: lastReferralDate ? formatDate(lastReferralDate) : undefined,
          isRecentlyActive
        };
      }) || [];

      setAffiliates(processedAffiliates);

      // Calculate affiliates by direct count categories
      const eligibleAffiliates = processedAffiliates.filter(a => a.directCount >= 2);
      const singleDirectAffiliates = processedAffiliates.filter(a => a.directCount === 1);
      const zeroDirectAffiliates = processedAffiliates.filter(a => a.directCount === 0);
      
      setDirectEligibleCount(eligibleAffiliates.length);
      setSingleDirectCount(singleDirectAffiliates.length);
      setZeroDirectCount(zeroDirectAffiliates.length);

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
      affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) // Remove name search
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
  const totalReferrals = affiliates.reduce((sum, a) => sum + a.referrals.total, 0);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // After sorting logic, add pagination
  const totalPages = Math.ceil(sortedAffiliates.length / ITEMS_PER_PAGE);
  const paginatedAffiliates = sortedAffiliates.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewDownlines = async (affiliate: Affiliate) => {
    try {
      const { data, error } = await supabase
        .from('referral_relationships')
        .select(`
          referred:referred_id(
            id,
            email,
            referral_code
          ),
          level,
          created_at
        `)
        .eq('referrer_id', affiliate.id)
        .order('level', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Downlines",
          description: "This affiliate has no downline members yet.",
          variant: "destructive"
        });
        return;
      }

      const formattedDownlines = data.map(item => ({
        id: item.referred.id,
        email: item.referred.email,
        referral_code: item.referred.referral_code,
        level: item.level,
        created_at: formatDate(new Date(item.created_at))
      }));

      setDownlines(formattedDownlines);
      setSelectedAffiliate(affiliate);
      setShowDownlines(true);
    } catch (error) {
      console.error('Error fetching downlines:', error);
    }
  };

  // Add this helper function to group downlines by level
  const groupDownlinesByLevel = (downlines: DownlineUser[]) => {
    const levels = [...new Set(downlines.map(d => d.level))].sort((a, b) => a - b);
    return levels.map(level => ({
      level,
      members: downlines.filter(d => d.level === level)
    }));
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Affiliate Management" 
        description="Monitor and manage affiliate partners and their commissions"
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard
          title="Network Overview"
          value={totalAffiliates.toString()}
          description={`Total Downlines: ${totalReferrals.toString()}`}
        />
        <StatCard
          title="Direct Eligibility"
          value={directEligibleCount.toString()}
          description={
            <div className="space-y-1">
              <div className="text-xs space-y-0.5">
                <p className="text-yellow-600">{singleDirectCount} with 1 direct</p>
                <p className="text-red-600">{zeroDirectCount} with 0 directs</p>
              </div>
            </div>
          }
        />
        <StatCard
          title="Network Earnings"
          value={`$${totalCommissions.toLocaleString()}`}
          description={`Rank Bonus: $${affiliates.reduce((sum, a) => sum + a.rank_bonus, 0).toLocaleString()}`}
        />
      </div>

      <div className="bg-background border rounded-lg shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b">
          <div className="relative w-full sm:w-auto">
            <MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" weight="bold" />
            <Input
              placeholder="Search affiliates..."
              className="pl-8 w-full sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort By <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                setSortField("joinDate");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Join Date {sortField === "joinDate" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField("directCount");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Direct Count {sortField === "directCount" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField("commissions");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Commissions {sortField === "commissions" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setSortField("rank_bonus");
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
              }}>
                Rank Bonus {sortField === "rank_bonus" && (sortDirection === "asc" ? "↑" : "↓")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total Downlines</TableHead>
                <TableHead>Commissions</TableHead>
                <TableHead>Rank Bonus</TableHead>
                <TableHead>Join Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Loading affiliates...</TableCell>
                </TableRow>
              ) : paginatedAffiliates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No affiliates found</TableCell>
                </TableRow>
              ) : (
                paginatedAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{affiliate.id}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(affiliate.id)}
                        >
                          <Copy className="h-3 w-3" weight="bold" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span>{affiliate.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {affiliate.referral_code}
                        </Badge>
                        <span className={`text-xs ${
                          affiliate.directCount === 0 
                            ? 'text-red-500' 
                            : affiliate.directCount === 1 
                            ? 'text-yellow-500' 
                            : 'text-green-500'
                        }`}>
                          {affiliate.directCount}/2
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div 
                        className="cursor-pointer hover:text-primary transition-colors"
                        onClick={() => handleViewDownlines(affiliate)}
                      >
                        {affiliate.referrals.unique}
                        {affiliate.referrals.total > affiliate.referrals.unique && 
                          ` (${affiliate.referrals.total - affiliate.referrals.unique} Repeated)`
                        }
                      </div>
                    </TableCell>
                    <TableCell>${affiliate.commissions}</TableCell>
                    <TableCell>${affiliate.rank_bonus}</TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap">{affiliate.joinDate}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {!isLoading && sortedAffiliates.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  {currentPage > 1 && (
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                    />
                  )}
                </PaginationItem>
                <PaginationItem>
                  {currentPage !== totalPages && (
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                    />
                  )}
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <Dialog open={showDownlines} onOpenChange={setShowDownlines}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="py-3">
            <DialogTitle className="text-base">
              Network - {selectedAffiliate?.email}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <Accordion type="single" collapsible className="w-full">
              {groupDownlinesByLevel(downlines).map(({ level, members }) => (
                <AccordionItem value={`level-${level}`} key={level} className="border-b last:border-b-0">
                  <AccordionTrigger className="py-3 px-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Level {level}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="py-2 px-3">
                    <div className="space-y-1.5">
                      {members.map((member) => (
                        <div 
                          key={member.id} 
                          className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{member.email}</span>
                            <Badge variant="outline" className="text-[10px] h-5">
                              {member.referral_code}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {member.created_at}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AffiliatesPage;
