import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SidebarNav from '@/components/SidebarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const dummyReferrals = [
  { id: '1', username: 'johndoe', joinDate: '2023-09-15', status: 'active', earnings: 250 },
  { id: '2', username: 'janedoe', joinDate: '2023-09-20', status: 'active', earnings: 175 },
  { id: '3', username: 'alexsmith', joinDate: '2023-09-25', status: 'inactive', earnings: 100 },
  { id: '4', username: 'sarahconnor', joinDate: '2023-10-05', status: 'active', earnings: 325 },
];

const Affiliates = () => {
  const { user, profile, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReferrals = async () => {
      if (user && profile?.referral_code) {
        // Using the optimized query that works with our new view
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            user_id,
            username,
            created_at,
            investment_total,
            withdrawal_total,
            referral_code
          `)
          .eq('referred_by', profile.referral_code);

        if (error) {
          toast({
            title: "Error fetching referrals",
            description: error.message,
            variant: "destructive"
          });
          return;
        }

        if (data) {
          setReferrals(data.map(referral => ({
            id: referral.user_id,
            username: referral.username,
            joinDate: referral.created_at,
            status: referral.investment_total > 0 ? 'active' : 'inactive',
            earnings: (referral.investment_total + referral.withdrawal_total) * 0.1
          })));
        }
      }
    };

    fetchReferrals();
  }, [user, profile]);
  
  // If user is not logged in and not loading, redirect to auth page
  if (!user && !loading) {
    return <Navigate to="/" />;
  }
  
  const getReferralLink = () => {
    return `${window.location.origin}/?ref=${profile?.referral_code || ''}`;
  };
  
  const copyReferralLink = () => {
    navigator.clipboard.writeText(getReferralLink());
    toast({
      title: "Copied to clipboard",
      description: "Referral link has been copied to clipboard.",
    });
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarNav 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Affiliates</h1>
              <p className="text-muted-foreground">
                Manage your affiliate program and view your referrals.
              </p>
            </div>
            
            <Card className="glass card-hover">
              <CardHeader>
                <CardTitle>Your Referral Link</CardTitle>
                <CardDescription>
                  Share this link to earn commissions from your referrals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input value={getReferralLink()} readOnly />
                  <Button variant="outline" size="icon" onClick={copyReferralLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    You earn 10% commission on all deposits made by your referrals.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass">
              <CardHeader>
                <CardTitle>Your Referrals</CardTitle>
                <CardDescription>
                  People who signed up using your referral link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dummyReferrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">{referral.username}</TableCell>
                        <TableCell>
                          {new Date(referral.joinDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            referral.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {referral.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-green-500">
                          ${referral.earnings.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Affiliates;
