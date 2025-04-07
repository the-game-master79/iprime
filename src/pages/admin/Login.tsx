import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui-components";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const { loginAdmin } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (step === "credentials") {
      try {
        const success = await loginAdmin(email, password);
        if (success) {
          setStep("2fa");
          toast({
            title: "Verification Required",
            description: "Please enter the 2FA code to continue.",
          });
        }
      } catch (error) {
        toast({
          title: "Authentication Failed", 
          description: "Invalid admin credentials. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      if (code === "666666") { // Hardcoded 2FA code
        navigate("/admin/dashboard", { replace: true });
        toast({
          title: "Login Successful",
          description: "Welcome to the admin panel.",
        });
      } else {
        setIsLoading(false);
        toast({
          title: "Verification Failed",
          description: "Invalid verification code.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <AdminLayout requireAuth={false} showSidebar={false}>
      <PageTransition>
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <Card className="mx-auto w-full max-w-md">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">Admin Login</CardTitle>
              <CardDescription>
                Secure access to the administrative control panel
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {step === "credentials" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="code">2FA Verification Code</Label>
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-muted-foreground" />
                      <Input
                        id="code"
                        placeholder="Enter 6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Processing..."
                    : step === "credentials"
                    ? "Continue"
                    : "Verify & Login"
                  }
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </PageTransition>
    </AdminLayout>
  );
};

export default AdminLogin;
