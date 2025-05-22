import { useState, useRef, useLayoutEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui-components";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { generateReferralCode, cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon } from "@phosphor-icons/react"; // Add for icon consistency
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || "");
  const [formHeight, setFormHeight] = useState<number | undefined>(undefined);
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // Fix: Always measure the height of the currently active tab content
  useLayoutEffect(() => {
    if (formWrapperRef.current) {
      // Find the active tab content inside the wrapper
      const activeContent = formWrapperRef.current.querySelector(
        '[data-state="active"]'
      ) as HTMLElement | null;
      if (activeContent) {
        setFormHeight(activeContent.scrollHeight);
      }
    }
  }, [showPassword]);

  // One-step login/signup handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const referral = formData.get('referral') as string;

    try {
      // 1. Try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError && signInData.user) {
        toast.success("Login successful!");
        navigate('/platform');
        return;
      }

      // 2. If sign in fails, try to sign up
      const newReferralCode = generateReferralCode();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            referral_code: newReferralCode
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Failed to create user");

      // 3. Create profile row
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          email,
          referral_code: newReferralCode,
          referred_by: referral || null,
          status: 'active',
          direct_count: 0,
          total_invested: 0,
          withdrawal_wallet: 0,
        });

      if (profileError) throw profileError;

      toast.success("Account created and logged in!");
      navigate('/platform');
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
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* Improved gradients */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -z-10 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-primary/40 via-blue-400/30 to-purple-500/30 blur-[140px] opacity-70 animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -z-10 h-[320px] w-[320px] rounded-full bg-gradient-to-tr from-pink-500/30 via-fuchsia-400/20 to-blue-400/20 blur-[120px] opacity-60 animate-[pulse_10s_ease-in-out_infinite]" />
            <div className="absolute right-0 bottom-0 -z-10 h-[350px] w-[350px] rounded-full bg-gradient-to-tl from-cyan-400/30 via-blue-500/20 to-indigo-500/20 blur-[130px] opacity-60 animate-[pulse_12s_ease-in-out_infinite]" />
            <div className="absolute left-1/4 top-1/3 -z-10 h-[220px] w-[220px] rounded-full bg-gradient-to-br from-indigo-500/30 via-blue-400/20 to-purple-400/20 blur-[100px] opacity-50 animate-[pulse_9s_ease-in-out_infinite]" />
            <div className="absolute right-1/3 bottom-1/4 -z-10 h-[180px] w-[180px] rounded-full bg-gradient-to-tr from-violet-500/30 via-purple-400/20 to-blue-400/20 blur-[90px] opacity-40 animate-[pulse_11s_ease-in-out_infinite]" />
            <div className="absolute inset-0 bg-grid-white/10 bg-[size:100px_90px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,white,transparent)] dark:bg-grid-slate-700/10" />
          </div>

          <div className="relative w-full px-4 sm:max-w-4xl min-h-[500px] flex flex-col sm:flex-row sm:items-stretch sm:justify-center">
            {/* Left: Login/Register */}
            <div className="sm:w-1/2 flex items-center">
              <div className="mx-auto flex w-full flex-col justify-center space-y-6 rounded-xl p-0">
                <div className="flex flex-col items-center space-y-4 w-full">
                  {/* Card background for the form */}
                  <div className="w-full bg-secondary shadow-lg rounded-xl p-8">
                    {/* Badge at the top of the form */}
                    <div className="flex justify-center mb-4">
                      <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground border border-border">
                        Please verify original URL: https://cloudforex.club
                      </span>
                    </div>
                    {/* Logo inside the form, at the top */}
                    <div className="flex justify-center mb-6">
                      <img
                        src={
                          theme === "dark"
                            ? "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-dark.svg"
                            : "https://acvzuxvssuovhiwtdmtj.supabase.co/storage/v1/object/public/images-public//cf-light.svg"
                        }
                        alt="cloudforex"
                        className="w-auto h-12 object-contain"
                      />
                    </div>
                    <div
                      ref={formWrapperRef}
                      style={{
                        transition: "height 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                        overflow: "visible",
                        position: "relative"
                      }}
                    >
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1.5 block text-foreground">Your Email</label>
                          <Input
                            id="email"
                            name="email"
                            placeholder="Email"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            required
                            pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                            title="Please enter a valid email address"
                            className="bg-background border border-border text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                        <div className="relative">
                          <label className="text-sm font-medium mb-1.5 block text-foreground">Your Password</label>
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="*********"
                            required
                            maxLength={60}
                            className="bg-background border border-border text-foreground placeholder:text-muted-foreground"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-[26px] h-10 px-3 py-2 hover:bg-secondary/80"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        {/* Referral Code Accordion */}
                        <Accordion type="single" collapsible>
                          <AccordionItem value="referral">
                            <AccordionTrigger className="text-sm font-medium text-foreground px-0 py-2 hover:underline">
                              Have a referral code? (optional)
                            </AccordionTrigger>
                            <AccordionContent>
                              <Input
                                id="referral"
                                name="referral"
                                placeholder="Referral code"
                                value={referralCode}
                                onChange={(e) => setReferralCode(e.target.value)}
                                className="bg-background border border-border text-foreground placeholder:text-muted-foreground mt-2"
                              />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90 h-12 text-base mt-2 mb-2 rounded-lg" disabled={isLoading}>
                          {isLoading ? "Processing..." : "Continue"}
                          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* "By continuing..." pinned to bottom */}
          <div className="w-full absolute bottom-0 left-0 pb-6 flex flex-col items-center">
            <p className="text-center text-xs text-foreground">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="underline-offset-2 hover:underline text-primary">Terms</Link>
              {" "}&{" "}
              <Link to="/privacy" className="underline-offset-2 hover:underline text-primary">Privacy</Link>
            </p>
            <span className="mt-1 text-[11px] text-muted-foreground text-center">
              CloudForex is an operator of commodities, currencies, crypto and indices only.
            </span>
          </div>
        </div>
      </PageTransition>
    </AuthGuard>
  );
};

export default Login;
