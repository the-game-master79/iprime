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

const AdminDeposits = () => {
  const { user, loading } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Initialize database if needed
  useEffect(() => {
    const init = async () => {
      if (user) {
        setIsInitializing(true);
        try {
          await initializeDatabase();
          // Only fetch deposits after database is initialized and user is logged in
          await fetchPendingDeposits();
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

  const fetchPendingDeposits = async () => {
    const { data, error } = await supabase
      .from('deposits')
      .select(`
        *,
        account_history (
          id,
          status,
          type,
          amount,
          description,
          created_at
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching deposits",
        description: error.message,
        variant: "destructive"
      });
      return;
    }

    setPendingDeposits(data || []);
  };

  const verifyStatusUpdate = async (depositId: string, expectedStatus: string) => {
    const { data, error } = await supabase
      .from('deposits')
      .select('status')
      .eq('id', depositId)
      .single();

    if (error) {
      console.error('Verification error:', error);
      return false;
    }

    return data?.status === expectedStatus;
  };

  const handleApproval = async (deposit: any, approved: boolean) => {
    try {
      setProcessingId(deposit.id);

      // First update the deposit status
      const newStatus = approved ? 'completed' : 'failed';
      const { error: depositError } = await supabase
        .from('deposits')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', deposit.id)
        .eq('status', 'pending'); // Safety check

      if (depositError) throw depositError;

      // Update the account history
      const { error: historyError } = await supabase
        .from('account_history')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('deposit_id', deposit.id)
        .eq('type', 'deposit')
        .eq('status', 'pending');

      if (historyError) throw historyError;

      // If approved, update user's investment total
      if (approved) {
        const { data: profile, error: profileFetchError } = await supabase
          .from('profiles')
          .select('investment_total')
          .eq('user_id', deposit.user_id)
          .single();

        if (profileFetchError) throw profileFetchError;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            investment_total: (profile.investment_total || 0) + deposit.total_value,
          })
          .eq('user_id', deposit.user_id);

        if (profileError) throw profileError;
      }

      toast({
        title: `Deposit ${approved ? 'approved' : 'rejected'}`,
        description: `Transaction has been ${approved ? 'approved' : 'rejected'} successfully.`
      });

      await fetchPendingDeposits();

    } catch (error: any) {
      console.error('Approval error:', error);
      toast({
        title: "Error processing deposit",
        description: error.message || 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };
  
  // If admin is not logged in and not loading, redirect to admin auth page
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
              <h1 className="text-3xl font-bold tracking-tight text-white">Approve Deposits</h1>
              <p className="text-slate-400">
                Review and approve user deposits
              </p>
            </div>
            
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-semibold mb-4">Pending Deposits</h2>
              
              {isInitializing ? (
                <div className="flex items-center space-x-4 text-slate-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                  <p>Connecting to database...</p>
                </div>
              ) : (
                pendingDeposits.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDeposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell>
                            {new Date(deposit.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell>${deposit.total_value.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">
                              {deposit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-2">
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={() => handleApproval(deposit, true)}
                              disabled={processingId === deposit.id}
                            >
                              {processingId === deposit.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button 
                              variant="destructive"
                              size="sm"
                              onClick={() => handleApproval(deposit, false)}
                              disabled={processingId === deposit.id}
                            >
                              {processingId === deposit.id ? 'Processing...' : 'Reject'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-slate-400">No pending deposits to approve</p>
                )
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDeposits;