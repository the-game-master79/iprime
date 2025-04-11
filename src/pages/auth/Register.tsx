import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/ui-components";
import { ArrowRight, Eye, EyeOff, AlertCircle, Check, ChevronDown } from "lucide-react";
import { generateReferralCode } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";
import { checkRateLimit } from "@/lib/rateLimit";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState("");
  const [referrerEmail, setReferrerEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    hasUpperCase: false,
    hasMinLength: false,
    hasNumber: false,
    hasSpecial: false
  });

  useEffect(() => {
    // Get referral code from URL query parameter
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  const validateReferralCode = async (code: string) => {
    if (!code) {
      setReferrerEmail(null);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .rpc('validate_referral_code', { 
          p_referral_code: code,
          p_user_id: user?.id || null
        });

      if (error) {
        setReferrerEmail(null);
        if (error.code === '42P01') {
          console.warn('MLM network tables not found:', error);
          const { data: basicCheck } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('referral_code', code)
            .eq('status', 'active')
            .single();

          if (basicCheck) {
            setReferrerEmail(basicCheck.email); // Show full email
            return;
          }
        }
        throw error;
      }

      if (!data?.is_valid) {
        setReferrerEmail(null);
        toast({
          title: "Invalid Code",
          description: data?.message || "Invalid referral code",
          variant: "destructive"
        });
        return;
      }

      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', data.referrer_id)
        .single();

      if (referrerProfile?.email) {
        setReferrerEmail(referrerProfile.email); // Show full email
      }
    } catch (error) {
      setReferrerEmail(null);
      console.error('Error validating referral code:', error);
      toast({
        title: "Error",
        description: "Unable to validate referral code",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Validate referral code whenever it changes
    validateReferralCode(referralCode);
  }, [referralCode]);

  const validateEmail = (email: string) => {
    // Simple email validation that allows shorter domains
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const firstName = formData.get('first-name') as string;
      const lastName = formData.get('last-name') as string;
      const providedReferralCode = formData.get('referral') as string;
      const password = formData.get('password') as string;

      let referrerId: string | null = null;

      // Validate referral code and get referrer info
      if (providedReferralCode) {
        const { data: referrer, error: refError } = await supabase
          .from('profiles')
          .select('id, referral_code')
          .eq('referral_code', providedReferralCode)
          .eq('status', 'active')
          .single();

        if (refError || !referrer) {
          throw new Error("Invalid referral code");
        }
        referrerId = referrer.id;
      }

      // Generate unique referral code
      const newReferralCode = generateReferralCode();

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            referral_code: newReferralCode
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create profile with referral info
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          referral_code: newReferralCode,
          referred_by: providedReferralCode || null,
          status: 'active',
          direct_count: 0,
          total_invested: 0,
          withdrawal_wallet: 0,
          investment_wallet: 0
        });

      if (profileError) throw profileError;

      // No need to manually create referral relationships
      // The database trigger will handle this automatically
      toast.success("Registration successful! Welcome to CloudForex");
      navigate("/dashboard");

    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
      // Cleanup on failure
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard authPage>
      <PageTransition>
        <div className="flex min-h-screen flex-col">
          <div className="container relative flex-1 flex flex-col items-center justify-center">
            {/* Background Pattern */}
            <div className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-30">
              <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700 animate-pulse-slow" />
              <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600 animate-pulse-slower" />
              <div className="blur-[106px] absolute -bottom-48 left-0 h-72 w-72 bg-gradient-to-t from-blue-500 to-cyan-300 dark:from-blue-400 mix-blend-multiply dark:opacity-20 animate-pulse-slowest" />
            </div>

            <div className="relative w-full max-w-md p-4 min-h-[400px]">
              <div className="mx-auto flex w-full flex-col justify-center space-y-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg p-8 rounded-xl shadow-[0_2px_8px_2px_rgba(0,0,0,0.08)]">
                <div className="flex flex-col items-center space-y-4">
                  <img 
                    src="https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cflogo.svg" 
                    alt="cloudforex" 
                    className="w-auto h-12 object-contain" 
                  />
                  <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        id="first-name"
                        name="first-name"
                        placeholder="First name"
                        required
                      />
                      <Input
                        id="last-name"
                        name="last-name"
                        placeholder="Last name"
                        required
                      />
                    </div>

                    <div>
                      <Input
                        id="email"
                        name="email"
                        placeholder="Email address"
                        type="email"
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect="off"
                        required
                        onChange={(e) => {
                          if (!validateEmail(e.target.value)) {
                            e.target.setCustomValidity("Invalid email format");
                          } else {
                            e.target.setCustomValidity("");
                          }
                        }}
                      />
                    </div>

                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create password"
                        required
                        onChange={(e) => validatePassword(e.target.value)}
                        className="pr-10" // Make room for the eye icon
                      />
                      <div className="absolute right-3 top-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-fit p-0 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showPassword ? "Hide password" : "Show password"}
                          </span>
                        </Button>
                      </div>

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
                    </div>

                    <Accordion type="single" collapsible>
                      <AccordionItem value="referral">
                        <AccordionTrigger className="text-sm">
                          Have a referral code?
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-2">
                            <Input
                              id="referral"
                              name="referral"
                              placeholder="Enter referral code"
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value)}
                            />
                            {referrerEmail && (
                              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                <span className="text-green-700 font-medium">Referred by:</span> {referrerEmail}
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By creating an account, you agree to our{" "}
                    <Link to="/terms" className="underline-offset-2 hover:underline">Terms</Link>
                    {" "}&{" "}
                    <Link to="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
                  </p>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-900 px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/auth/login" className="text-primary underline-offset-4 hover:underline">
                    Sign In
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

export default Register;
