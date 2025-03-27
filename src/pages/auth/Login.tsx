import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/ui-components";
import { ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { Checkbox } from "@/components/ui/checkbox";

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: LoginFormData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      rememberMe: rememberMe
    };

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      toast.success("Login successful!");
      // No need to manually navigate - AuthGuard will handle it
    } catch (error) {
      toast.error("Error during login: " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard authPage>
      <PageTransition>
        <div className="flex min-h-screen flex-col">
          <div className="container relative flex-1 flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Background */}
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex">
              <div className="absolute inset-0 bg-primary/10" />
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-100" 
                style={{ 
                  backgroundImage: `url('https://images.unsplash.com/photo-1508385082359-f38ae991e8f2?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA')` 
                }}/>
            </div>

            {/* Form */}
            <div className="w-full p-4 lg:p-8">
              <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div className="flex flex-col items-center space-y-4">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cloudforex.svg" 
                    alt="cloudforex" 
                    className="w-auto h-10 object-contain" 
                  />
                  <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
                    <p className="text-sm text-muted-foreground">
                      Enter your Credentials and Access your Account.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Remember me for 30 days
                    </label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    to="/auth/register"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Sign up
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </AuthGuard>
  );
};

export default Login;
