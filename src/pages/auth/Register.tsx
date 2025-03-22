import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { PageTransition } from "@/components/ui-components";
import { ArrowRight } from "lucide-react";
import { generateReferralCode } from "@/lib/utils";
import { AuthGuard } from "@/components/AuthGuard";

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

  useEffect(() => {
    // Get referral code from URL query parameter
    const refCode = searchParams.get('ref');
    if (refCode) {
      setReferralCode(refCode);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const providedReferralCode = formData.get('referral') as string;
      const firstName = formData.get('first-name') as string;
      const lastName = formData.get('last-name') as string;

      // Validate referral code if provided
      if (providedReferralCode) {
        const { data: referrerProfile, error: referralError } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', providedReferralCode)
          .single();

        if (referralError || !referrerProfile) {
          toast.error("Invalid referral code. Please check and try again.");
          setIsLoading(false);
          return;
        }
      }

      // Generate a unique referral code for the new user
      const newReferralCode = generateReferralCode();

      // Register the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            referred_by: providedReferralCode || null
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes("User already registered")) {
          toast.error("User already registered. Please proceed to login.", {
            duration: 5000,
            action: {
              label: "Login",
              onClick: () => navigate("/auth/login")
            }
          });
        } else {
          throw signUpError;
        }
        return;
      }

      if (authData.user) {
        // Create profile record
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            email: email,
            referred_by: providedReferralCode || null,
            referral_code: newReferralCode,
            status: 'active',
            business_rank: 'New Member'  // Add this line
          });

        if (profileError) throw profileError;

        toast.success("Registration successful! Please check your email to verify your account.");
        navigate("/auth/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("User already registered. Please log in.");
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
                  backgroundImage: `url('https://images.unsplash.com/photo-1508385082359-f38ae991e8f2')` 
                }}
              />
            </div>
            
            {/* Form */}
            <div className="w-full p-4 lg:p-8">
              <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
                <div className="flex flex-col items-center space-y-4">
                  <img src="/cloudforex.svg" alt="cloudforex" className="w-auto h-10 object-contain" />
                  <div className="flex flex-col space-y-2 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">Register an account</h1>
                    <p className="text-sm text-muted-foreground">
                      Add details and Create your CloudForex Account.
                    </p>
                  </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First name</Label>
                      <Input
                        id="first-name"
                        name="first-name"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last name</Label>
                      <Input
                        id="last-name"
                        name="last-name"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
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
                      placeholder="••••••••"
                      type="password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="referral">Referral code (Optional)</Label>
                    <Input
                      id="referral"
                      name="referral"
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox id="terms" required />
                    <label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the{" "}
                      <Link
                        to="/terms"
                        className="text-primary underline underline-offset-4"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        to="/privacy"
                        className="text-primary underline underline-offset-4"
                      >
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
                
                <div className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/auth/login"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </AuthGuard>
  );
};

export default Register;
