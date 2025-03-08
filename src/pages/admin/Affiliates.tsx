
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/context/AdminAuthContext';
import AdminNavbar from '@/components/admin/AdminNavbar';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav';

const AdminAffiliates = () => {
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
              <h1 className="text-3xl font-bold tracking-tight text-white">View Affiliates</h1>
              <p className="text-slate-400">
                Manage affiliate partners and view performance
              </p>
            </div>
            
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-xl font-semibold mb-4">Affiliate Partners</h2>
              <p className="text-slate-400">No affiliate partners registered yet</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAffiliates;
