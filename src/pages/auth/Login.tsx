import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui-components";
import { ArrowRight, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { generateReferralCode, cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface AuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
}

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || "");
  const [referrerEmail, setReferrerEmail] = useState<string | null>(null);
  const [passwordCriteria, setPasswordCriteria] = useState({
    hasUpperCase: false,
    hasMinLength: false,
    hasNumber: false,
    hasSpecial: false
  });
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    setPasswordCriteria({
      hasUpperCase: /[A-Z]/.test(password),
      hasMinLength: password.length >= 8,
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password)
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: AuthFormData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      ...(isRegisterMode && {
        firstName: formData.get('first-name') as string,
        lastName: formData.get('last-name') as string,
        referralCode: formData.get('referral') as string,
      })
    };

    try {
      if (isRegisterMode) {
        const newReferralCode = generateReferralCode();
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              referral_code: newReferralCode
            }
          }
        });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create user");

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            referral_code: newReferralCode,
            referred_by: data.referralCode || null,
            status: 'active',
            direct_count: 0,
            total_invested: 0,
            withdrawal_wallet: 0,
            investment_wallet: 0
          });

        if (profileError) throw profileError;
        toast.success("Registration successful! Welcome to CloudForex");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) throw error;
        toast.success("Login successful!");
      }
    } catch (error) {
      toast.error(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard authPage>
      <PageTransition>
        <div className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-grid-white/10 bg-[size:100px_90px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,white,transparent)] dark:bg-grid-slate-700/10" />
            
            {/* Animated Gradient Orbs with slower animations and more blur */}
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[400px] w-[400px] rounded-full bg-primary/30 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute bottom-0 left-0 -z-10 h-[350px] w-[350px] rounded-full bg-purple-500/20 blur-[130px] animate-[pulse_10s_ease-in-out_infinite]" />
            <div className="absolute right-0 bottom-0 -z-10 h-[450px] w-[450px] rounded-full bg-blue-500/20 blur-[140px] animate-[pulse_12s_ease-in-out_infinite]" />
            
            {/* Additional floating gradients with varied sizes and positions */}
            <div className="absolute left-1/4 top-1/3 -z-10 h-[300px] w-[300px] rounded-full bg-indigo-500/20 blur-[120px] animate-[pulse_9s_ease-in-out_infinite]" />
            <div className="absolute right-1/3 bottom-1/4 -z-10 h-[250px] w-[250px] rounded-full bg-violet-500/20 blur-[130px] animate-[pulse_11s_ease-in-out_infinite]" />
          </div>

          <div className="relative w-full px-4 sm:max-w-[400px] min-h-[500px]">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 bg-[#141414] rounded-xl p-6">
              <div className="flex flex-col items-center space-y-4">
                <img 
                  src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cflogo.svg" 
                  alt="cloudforex" 
                  className="w-auto h-12 object-contain" 
                />
                
                <Tabs 
                  defaultValue="signin" 
                  className="w-full" 
                  onValueChange={(value) => setIsRegisterMode(value === "register")}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>

                  <div className="relative">
                    <TabsContent 
                      value="signin"
                      className="data-[state=inactive]:absolute data-[state=inactive]:inset-0 data-[state=inactive]:z-10 transition-all duration-500 ease-in-out data-[state=inactive]:translate-x-[-100%] data-[state=active]:translate-x-0"
                    >
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block text-white">Your Email</label>
                            <Input
                              id="email"
                              name="email"
                              placeholder="Email"
                              type="email"
                              autoCapitalize="none"
                              autoComplete="email"
                              autoCorrect="off"
                              required
                              className="h-10"
                            />
                          </div>

                          <div className="relative">
                            <label className="text-sm font-medium mb-1.5 block text-white">Your Password</label>
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="*********"
                              required
                              className="h-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-[26px] h-10 px-3 py-2 hover:bg-transparent"
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

                        <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 h-10 text-base mt-2" disabled={isLoading}>
                          {isLoading ? "Logging in..." : "Login"}
                          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent 
                      value="register"
                      className="data-[state=inactive]:absolute data-[state=inactive]:inset-0 data-[state=inactive]:z-10 transition-all duration-500 ease-in-out data-[state=inactive]:translate-x-[100%] data-[state=active]:translate-x-0"
                    >
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium mb-1.5 block text-white">First Name</label>
                            <Input
                              id="first-name"
                              name="first-name"
                              placeholder="First name"
                              required={isRegisterMode}
                              className="h-10"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1.5 block text-white">Last Name</label>
                            <Input
                              id="last-name"
                              name="last-name"
                              placeholder="Last name"
                              required={isRegisterMode}
                              className="h-10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1.5 block text-white">Your Email</label>
                          <Input
                            id="email"
                            name="email"
                            placeholder="Email"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            required
                            className="h-10"
                          />
                        </div>

                        <div className="relative">
                          <label className="text-sm font-medium mb-1.5 block text-white">Your Password</label>
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="*********"
                            required
                            onChange={(e) => isRegisterMode && validatePassword(e.target.value)}
                            className="h-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-[26px] h-10 px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>

                        <div className="mt-1 p-3 border border-dashed border-white/30 rounded-lg space-y-1.5">
                          {Object.entries({
                            'Must contain 8 characters': passwordCriteria.hasMinLength,
                            'Must contain uppercase letter': passwordCriteria.hasUpperCase,
                            'Must contain number': passwordCriteria.hasNumber,
                            'Must contain special character': passwordCriteria.hasSpecial,
                          }).map(([text, isValid]) => (
                            <div key={text} className="flex items-center gap-2 text-xs">
                              {isValid ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <AlertCircle className="h-3.5 w-3.5 text-white/60" />
                              )}
                              <span className={isValid ? 'text-green-500' : 'text-white/60'}>
                                {text}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-1.5 block text-white">Referral Code</label>
                          <Input
                            id="referral"
                            name="referral"
                            placeholder="Referral code (optional)"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            className="h-10"
                          />
                        </div>

                        <Button type="submit" className="w-full bg-white text-black hover:bg-white/90 h-10 text-base mt-1" disabled={isLoading}>
                          {isLoading ? "Creating account..." : "Create Account"}
                          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                      </form>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <p className="text-center text-xs text-white">
                By continuing, you agree to our{" "}
                <Link to="/terms" className="underline-offset-2 hover:underline">Terms</Link>
                {" "}&{" "}
                <Link to="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
              </p>
            </div>
          </div>
        </div>
      </PageTransition>
    </AuthGuard>
  );
};

export default Login;
