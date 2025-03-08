
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav';
import AdminDashboardStats from '@/components/admin/AdminDashboardStats';

const AdminDashboard = () => {
  const { user, loading } = useAdminAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
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
              <h1 className="text-3xl font-bold tracking-tight text-white">Admin Dashboard</h1>
              <p className="text-slate-400">
                Welcome to the admin panel. Monitor and manage your platform.
              </p>
            </div>
            
            <AdminDashboardStats />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Deposits</h2>
                <p className="text-slate-400">No pending deposits to approve</p>
              </div>
              
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Withdrawals</h2>
                <p className="text-slate-400">No pending withdrawals to approve</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
