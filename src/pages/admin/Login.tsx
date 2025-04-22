import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Key } from "lucide-react";
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
        <div className="flex min-h-screen flex-col">
          <div className="container relative flex-1 flex flex-col items-center justify-center">
            {/* Gradient Background */}
            <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-30">
              <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700 animate-pulse-slow" />
              <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600 animate-pulse-slower" />
              <div className="blur-[106px] absolute -bottom-48 left-0 h-72 w-72 bg-gradient-to-t from-blue-500 to-cyan-300 dark:from-blue-400 mix-blend-multiply dark:opacity-20 animate-pulse-slowest" />
            </div>

            <div className="relative w-full max-w-md p-4 min-h-[400px]">
              <div className="mx-auto flex w-full flex-col justify-center space-y-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg p-8 rounded-xl shadow-[0_2px_8px_2px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center space-y-4">
                  <Shield className="h-12 w-12 text-primary" />
                  <h1 className="text-2xl font-bold">Admin Panel</h1>
                  <p className="text-sm text-muted-foreground text-center">
                    Secure access to the administrative control panel
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {step === "credentials" ? (
                    <div className="space-y-4">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Admin Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          id="code"
                          placeholder="Enter 6-digit code"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          maxLength={6}
                          required
                        />
                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" 
                    disabled={isLoading}
                  >
                    {isLoading
                      ? "Processing..."
                      : step === "credentials"
                      ? "Continue"
                      : "Verify & Login"
                    }
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </AdminLayout>
  );
};

export default AdminLogin;
