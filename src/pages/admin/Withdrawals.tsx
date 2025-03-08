import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav';
import { initializeDatabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AdminWithdrawals = () => {
  const { user, loading } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      if (user) {
        setIsInitializing(true);
        try {
          await initializeDatabase();
          await fetchPendingWithdrawals();
        } catch (error) {
          console.error('Database initialization error:', error);
          toast({
            title: "Database error",
            description: "There was an error connecting to the database.",
            variant: "destructive"
          });
        } finally {
          setIsInitializing(false);
        }
      }
    };
    
    init();
  }, [user, toast]);

  const fetchPendingWithdrawals = async () => {
    const { data, error } = await supabase
      .from('withdrawals')
      .select(`
        id,
        amount,
        address,
        network_type,
        status,
        created_at,
        updated_at,
        user_id,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false }); // Remove .eq('status', 'pending') to show all

    if (error) {
      toast({
        title: "Error fetching withdrawals",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setPendingWithdrawals(data || []);
  };

  const handleApproval = async (withdrawal: any, approved: boolean) => {
    try {
      setProcessingId(withdrawal.id);

      const newStatus = approved ? 'completed' : 'failed';

      // Start a transaction to update both withdrawal and profile
      const { error: updateError } = await supabase
        .from('withdrawals')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.id)
        .eq('status', 'pending'); // Additional safety check

      if (updateError) throw updateError;

      // If approved, update user's investment total
      if (approved) {
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('investment_total, withdrawal_total')
          .eq('user_id', withdrawal.user_id)
          .single();

        if (profileFetchError) throw profileFetchError;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            investment_total: (profile.investment_total || 0) - withdrawal.amount,
            withdrawal_total: (profile.withdrawal_total || 0) + withdrawal.amount
          })
          .eq('user_id', withdrawal.user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: `Withdrawal ${approved ? 'approved' : 'rejected'}`,
        description: `Transaction has been ${approved ? 'approved' : 'rejected'} successfully.`
      });

      await fetchPendingWithdrawals();

    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        title: "Error processing withdrawal",
        description: error.message || 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!user && !loading) {
    return <Navigate to="/admin" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
      <AdminSidebarNav 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminNavbar />
        
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Approve Withdrawals</h1>
              <p className="text-slate-400">
                Review and approve user withdrawal requests
              </p>
            </div>
            
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-semibold mb-4">Pending Withdrawals</h2>
              
              {isInitializing ? (
                <div className="flex items-center space-x-4 text-slate-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                  <p>Connecting to database...</p>
                </div>
              ) : (
                pendingWithdrawals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>User</TableHead>  {/* New column */}
                        <TableHead>Amount</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWithdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell>{new Date(withdrawal.created_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{withdrawal.profiles?.full_name}</span>
                              <span className="text-xs text-muted-foreground">{withdrawal.profiles?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                          <TableCell>{withdrawal.network_type}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{withdrawal.address}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" 
                              className={withdrawal.status === 'completed' 
                                ? 'bg-green-500/10 text-green-500'
                                : withdrawal.status === 'failed'
                                ? 'bg-red-500/10 text-red-500'  
                                : 'bg-yellow-500/10 text-yellow-500'
                              }
                            >{withdrawal.status}</Badge>
                          </TableCell>
                          <TableCell className="space-x-2">
                            {withdrawal.status === 'pending' && (<>
                              <Button 
                                variant="default"
                                size="sm"
                                onClick={() => handleApproval(withdrawal, true)}
                                disabled={processingId === withdrawal.id}
                              >{processingId === withdrawal.id ? 'Processing...' : 'Approve'}</Button>
                              <Button 
                                variant="destructive"
                                size="sm"
                                onClick={() => handleApproval(withdrawal, false)}
                                disabled={processingId === withdrawal.id}
                              >{processingId === withdrawal.id ? 'Processing...' : 'Reject'}</Button>
                            </>)}
                          </TableCell>
                        </TableRow>))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-400">No pending withdrawals to approve</p>
                )
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminWithdrawals;
