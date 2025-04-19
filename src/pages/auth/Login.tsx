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
        <div className="flex min-h-screen flex-col">
          <div className="container relative flex-1 flex flex-col items-center justify-center">
            <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-30">
              <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700 animate-pulse-slow" />
              <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600 animate-pulse-slower" />
              <div className="blur-[106px] absolute -bottom-48 left-0 h-72 w-72 bg-gradient-to-t from-blue-500 to-cyan-300 dark:from-blue-400 mix-blend-multiply dark:opacity-20 animate-pulse-slowest" />
            </div>

            <div className="relative w-full max-w-md p-4 min-h-[400px]">
              <div className="mx-auto flex w-full flex-col justify-center space-y-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg p-8 rounded-xl shadow-[0_2px_8px_2px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center space-y-4">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cflogo.svg" 
                    alt="cloudforex" 
                    className="w-auto h-12 object-contain" 
                  />
                  
                  <div className="inline-flex rounded-lg border p-1 w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
                        !isRegisterMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all",
                        isRegisterMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Register
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    {isRegisterMode && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          id="first-name"
                          name="first-name"
                          placeholder="First name"
                          required={isRegisterMode}
                        />
                        <Input
                          id="last-name"
                          name="last-name"
                          placeholder="Last name"
                          required={isRegisterMode}
                        />
                      </div>
                    )}

                    <div>
                      <Input
                        id="email"
                        name="email"
                        placeholder="Your email"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        required
                      />
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        required
                        onChange={(e) => isRegisterMode && validatePassword(e.target.value)}
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

                    {isRegisterMode && (
                      <>
                        <div className="mt-2 p-3 border border-dashed border-muted-foreground/30 rounded-lg space-y-2">
                          {Object.entries({
                            'Must contain 8 characters': passwordCriteria.hasMinLength,
                            'Must contain uppercase letter': passwordCriteria.hasUpperCase,
                            'Must contain number': passwordCriteria.hasNumber,
                            'Must contain special character': passwordCriteria.hasSpecial,
                          }).map(([text, isValid]) => (
                            <div key={text} className="flex items-center gap-2 text-sm">
                              {isValid ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className={isValid ? 'text-green-500' : 'text-muted-foreground'}>
                                {text}
                              </span>
                            </div>
                          ))}
                        </div>

                        <Input
                          id="referral"
                          name="referral"
                          placeholder="Referral code (optional)"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                        />
                      </>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (isRegisterMode ? "Creating account..." : "Logging in...") : 
                      (isRegisterMode ? "Create Account" : "Login")}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>

                <p className="text-center text-xs text-muted-foreground">
                  By continuing, you agree to our{" "}
                  <Link to="/terms" className="underline-offset-2 hover:underline">Terms</Link>
                  {" "}&{" "}
                  <Link to="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
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
