import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import SidebarNav from '@/components/SidebarNav';
import DashboardStats from '@/components/DashboardStats';
import DashboardWidgets from '@/components/DashboardWidgets';
import { supabase, persistedState } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<any>(() => persistedState.getState('dashboard:stats'));
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds
  const { toast } = useToast();

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Auto-refresh data
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [user, refreshInterval]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('investment_total, withdrawal_total')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setStats(data);
      persistedState.setState('dashboard:stats', data);
    } catch (error: any) {
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while authentication is being checked
  if (authLoading || (user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user && !authLoading) {
    return <Navigate to="/" />;
  }
  
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
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back! Here's an overview of your account.
              </p>
            </div>
            
            <DashboardStats />
            
            <div className="mt-8">
              <DashboardWidgets />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
