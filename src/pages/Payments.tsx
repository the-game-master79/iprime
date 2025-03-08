import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SidebarNav from '@/components/SidebarNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const Payments = () => {
  const { user, loading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 1 minute
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Auto-refresh data
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchTransactions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [user, refreshInterval]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      // Get all transaction types including plan subscriptions
      const { data: accountHistory, error: historyError } = await supabase
        .from('account_history')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Format transactions including plan subscriptions
      const formattedTransactions = accountHistory.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        description: tx.description,
        created_at: tx.created_at,
        method: tx.type === 'plan_subscription' ? 'Investment Plan' : tx.method
      }));

      setTransactions(formattedTransactions);
    } catch (error: any) {
      toast({
        title: "Error fetching transactions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If user is not logged in and not loading, redirect to auth page
  if (!user && !loading) {
    return <Navigate to="/" />;
  }
  
  const getStatusBadge = (status: string, type: string) => {
    if (type === 'plan_subscription' && status === 'completed') {
      return <Badge variant="default" className="bg-blue-500">Subscribed</Badge>;
    }
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };
  
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdrawal';
      case 'affiliate_income':
        return 'Affiliate Commission';
      case 'plan_subscription':
        return 'Plan Subscription';
      default:
        return type;
    }
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
              <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
              <p className="text-muted-foreground">
                View your transaction history and payment details.
              </p>
            </div>
            
            <Card className="glass">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  All your deposits, withdrawals, and affiliate earnings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method/Network</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {new Date(transaction.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="capitalize">
                          {getTypeDisplay(transaction.type)}
                        </TableCell>
                        <TableCell>
                          ${transaction.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {transaction.type === 'withdrawal' ? transaction.network_type : transaction.method}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              transaction.status === 'completed' ? 'default' :
                              transaction.status === 'pending' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {transaction.status}
                          </Badge>
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

export default Payments;
