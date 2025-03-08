
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from '@/context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, LogIn } from 'lucide-react';
import { initializeDatabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AdminAuth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const { signIn, user, loading } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If admin is already logged in, redirect to admin dashboard
  useEffect(() => {
    if (user && !loading) {
      navigate('/admin/dashboard');
    }
  }, [user, loading, navigate]);

  // Initialize the database if needed
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      try {
        await initializeDatabase();
        toast({
          title: "Database initialized",
          description: "Admin user has been created or updated.",
        });
      } catch (error) {
        console.error('Database initialization error:', error);
        toast({
          title: "Database initialization failed",
          description: "Please check console for details.",
          variant: "destructive"
        });
      } finally {
        setIsInitializing(false);
      }
    };
    
    init();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Admin Portal</h1>
          <p className="text-slate-400 mt-2">Manage your affiliate marketing platform</p>
        </div>
        
        <Card className="w-full glass border-0 bg-slate-800/50 backdrop-blur-md text-white">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-center text-2xl">Admin Access</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Enter your credentials to access the admin panel
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {isInitializing ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                <p className="text-slate-300">Setting up admin account...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>
                  <Button type="submit" className="w-full button-hover bg-primary" disabled={loading}>
                    {loading ? "Authenticating..." : (
                      <span className="flex items-center gap-2">
                        <LogIn className="h-4 w-4" /> Sign In
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
          <CardFooter className="text-center text-sm text-slate-400 pt-0">
            <p>Admin credentials: abcd@yopmail.com / Admin123!</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AdminAuth;
