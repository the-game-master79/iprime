import { useState } from "react";
import { useNavigate, useLocation, Location } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui-components";
import AdminLayout from "./AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon } from "@phosphor-icons/react";

interface LocationState {
  from?: {
    pathname: string;
  };
}

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginAdmin } = useAdminAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 60 * 1000; // 1 minute
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const { theme, setTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast({
        title: "Too many failed attempts",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Password strength check (frontend)
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters, include a number and an uppercase letter.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      if (!loginAdmin) {
        throw new Error('Login service not available');
      }

      await loginAdmin(email, password);
      const from = (location.state as LocationState)?.from?.pathname || "/admin/dashboard";
      navigate(from, { replace: true });
      toast({
        title: "Login Successful",
        description: "Welcome to the admin panel.",
      });
    } catch (error: any) {
      setLoginAttempts(prev => prev + 1);
      if (loginAttempts + 1 >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_TIME);
        toast({
          title: "Too many failed attempts",
          description: "Please wait before trying again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: "Login failed. Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout requireAuth={false} showSidebar={false}>
      <PageTransition>
        <div className="flex min-h-screen flex-col">
          {/* Theme toggle at top right */}
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-lg bg-secondary-foreground text-primary hover:bg-secondary"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-400" weight="bold" />
              ) : (
                <Moon className="h-5 w-5 text-blue-500" weight="bold" />
              )}
            </Button>
          </div>

          <div className="container relative flex-1 flex flex-col items-center justify-center">
            {/* Gradient Background */}
            <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-30 pointer-events-none select-none">
              <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700 dark:to-purple-900 animate-pulse-slow" />
              <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:from-indigo-700 dark:to-indigo-900 animate-pulse-slower" />
              <div className="blur-[106px] absolute -bottom-48 left-0 h-72 w-72 bg-gradient-to-t from-blue-500 to-cyan-300 dark:from-blue-900 dark:to-blue-700 mix-blend-multiply dark:opacity-30 animate-pulse-slowest" />
            </div>

            <div className="relative w-full max-w-md p-4 min-h-[400px]">
              <div className="mx-auto flex w-full flex-col justify-center space-y-4 bg-background/90 dark:bg-[#18181b]/90 backdrop-blur-lg p-8 rounded-xl shadow-[0_2px_8px_2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_16px_2px_rgba(0,0,0,0.32)]">
                <div className="flex flex-col items-center space-y-4">
                  <img 
                    src="/ct-logo-dark.svg"
                    alt="Arthaa Logo"
                    className="w-16 h-16"
                  />
                  <p className="text-sm text-muted-foreground text-center">
                    Please sign in to continue
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <Input
                      className="placeholder:text-foreground text-foreground"
                      id="email"
                      type="email"
                      placeholder="Admin Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="relative">
                      <Input
                        className="placeholder:text-foreground text-foreground"
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Continue"}
                  </Button>
                  {/* TODO: Add CAPTCHA here for production */}
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
