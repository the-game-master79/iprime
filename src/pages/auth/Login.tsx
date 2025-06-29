import { useState, useRef, useEffect } from "react";
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
import { Sun, Moon, SealCheckIcon } from "@phosphor-icons/react"; // Add for icon consistency
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || "");
  // Add state for referral validation
  const [referralEmail, setReferralEmail] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [formHeight, setFormHeight] = useState<number | undefined>(undefined);
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 60 * 1000; // 1 minute
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordValue, setPasswordValue] = useState("");
  const [email, setEmail] = useState("");

  // Store current user's referral code and email
  const [currentUserReferralCode, setCurrentUserReferralCode] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Error states for email and password
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // New state to track if the user has been referred
  const [referredBy, setReferredBy] = useState<string | null>(null);

  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  // Fix: Always measure the height of the currently active tab content
  useEffect(() => {
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

  // Password strength calculation
  function calculatePasswordStrength(password: string) {
    if (!password) return 0;
    // Very weak: only numbers or only letters (case-insensitive)
    if (/^\d+$/.test(password) || /^[a-zA-Z]+$/.test(password)) return 0.5;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }

  // Mask email utility
  function maskEmail(email: string) {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    if (name.length <= 2) return "*".repeat(name.length) + "@" + domain;
    return name[0] + "*".repeat(name.length - 2) + name[name.length - 1] + "@" + domain;
  }

  // One-step login/signup handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);

    // TODO: Implement server-side IP-based rate limiting via middleware or Supabase Edge Function.

    // Disable hCaptcha for now
    // if (!captchaToken) {
    //   setCaptchaError("Please complete the CAPTCHA.");
    //   return;
    // }
    setCaptchaError(null);

    // Rate limit: lock out after too many attempts
    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast.error("Too many failed attempts. Please try again later.");
      return;
    }

    setIsLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const referral = formData.get('referral') as string;

    // Password strength check (frontend)
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setPasswordError("Password must be at least 8 characters, include a number and an uppercase letter.");
      setIsLoading(false);
      return;
    }

    try {
      // Check if user exists in Supabase Auth
      const { data: userExistsData, error: userExistsError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userExistsData && !userExistsError) {
        // User exists, try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setPasswordError(signInError.message || "Incorrect email or password.");
          setIsLoading(false);
          return;
        }

        // Check Supabase session after login
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          setEmailError("Session invalid. Please try logging in again.");
          setIsLoading(false);
          return;
        }

        if (signInData.user) {
          toast.success("Login successful!");
          navigate('/platform');
          return;
        }
      } else {
        // User does not exist, sign up
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

        // --- Fix: If user_already_exists, try to login instead of showing error ---
        if (
          signUpError &&
          (signUpError.code === "user_already_exists" ||
            signUpError.message?.toLowerCase().includes("already registered"))
        ) {
          // Try to sign in instead
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setPasswordError(signInError.message || "Incorrect email or password.");
            setIsLoading(false);
            return;
          }

          // Check Supabase session after login
          const { data: session } = await supabase.auth.getSession();
          if (!session?.session) {
            setEmailError("Session invalid. Please try logging in again.");
            setIsLoading(false);
            return;
          }

          if (signInData.user) {
            toast.success("Login successful!");
            navigate('/platform');
            return;
          }
        }
        // --- End fix ---

        if (signUpError) {
          setEmailError(signUpError.message || "Signup failed.");
          throw signUpError;
        }
        if (!signUpData.user) {
          setEmailError("Failed to create user");
          throw new Error("Failed to create user");
        }

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

        if (profileError) {
          setEmailError(profileError.message || "Profile creation failed.");
          throw profileError;
        }

        // Check Supabase session after signup
        const { data: postSignUpSession } = await supabase.auth.getSession();
        if (!postSignUpSession?.session) {
          setEmailError("Session invalid. Please try logging in again.");
          throw new Error("Session invalid. Please try logging in again.");
        }

        toast.success("Account created and logged in!");
        navigate('/platform');
        return;
      }
    } catch (error) {
      setLoginAttempts(prev => prev + 1);
      if (loginAttempts + 1 >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_TIME);
        setEmailError("Too many failed attempts. Please wait before trying again.");
      } else {
        setPasswordError(
          error instanceof Error
            ? error.message
            : "Login failed. Please check your credentials and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch current user's referral code and email after login/signup
  useEffect(() => {
    let ignore = false;
    supabase.auth.getUser?.().then(async (userRes) => {
      if (ignore) return;
      const user = userRes?.data?.user;
      if (user && user.email) {
        setCurrentUserEmail(user.email);
        // Fetch referral_code from profiles table
        const { data, error } = await supabase
          .from("profiles")
          .select("referral_code")
          .eq("email", user.email)
          .single();
        if (!error && data?.referral_code) {
          setCurrentUserReferralCode(data.referral_code);
        } else {
          setCurrentUserReferralCode(null);
        }
      } else {
        setCurrentUserEmail(null);
        setCurrentUserReferralCode(null);
      }
    });
    return () => { ignore = true; };
  }, [supabase]);

  // Validate referral code on change
  useEffect(() => {
    // Only validate if code is exactly 8 alphanumeric characters
    if (!referralCode || referralCode.length !== 8 || /[^A-Z0-9]/.test(referralCode)) {
      setReferralEmail(null);
      setReferralError(null);
      return;
    }
    let ignore = false;
    setReferralLoading(true);
    setReferralError(null);
    setReferralEmail(null);

    supabase
      .from("profiles")
      .select("email,referral_code")
      .eq("referral_code", referralCode)
      .single()
      .then(({ data, error }) => {
        if (ignore) return;

        // Check for invalid code
        if (error || !data?.email) {
          setReferralEmail(null);
          setReferralError("Invalid referral code.");
        }
        // Check for self-referral by referral code or email
        else if (
          (currentUserReferralCode && referralCode === currentUserReferralCode) ||
          (currentUserEmail && data.email && currentUserEmail.toLowerCase() === data.email.toLowerCase())
        ) {
          setReferralEmail(null);
          setReferralError("Self-referral is not allowed.");
        } else {
          setReferralEmail(maskEmail(data.email));
          setReferralError(null);
        }
        setReferralLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [referralCode, supabase, currentUserReferralCode, currentUserEmail]);

  useEffect(() => {
    // Wait for theme to be set (avoids flicker)
    if (theme) setThemeReady(true);
  }, [theme]);

  return (
    <AuthGuard authPage>
      <PageTransition>
        <div className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden">
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
                    {/* Logo inside the form, at the top, left aligned */}
                    <div className="flex mb-6">
                      {themeReady ? (
                        <img
                          src={
                            theme === "dark"
                              ? "/arthaa-dark.svg"
                              : "/arthaa-light.svg"
                          }
                          alt="Arthaa Logo"
                          className="w-auto h-8 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-12 bg-muted rounded animate-pulse" />
                      )}
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
                        <div className="relative">
                          <Input
                          id="email"
                          name="email"
                          label="Your Email"
                          type="email"
                          autoCapitalize="none"
                          autoComplete="off"
                          autoCorrect="off"
                          required
                          pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                          title="Please enter a valid email address"
                          className="bg-background border border-border text-foreground placeholder:text-muted-foreground"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          onBlur={async e => {
                            const value = e.target.value.trim();
                            if (!value) {
                            setEmailError("Email is required.");
                            setCurrentUserReferralCode(null);
                            setReferredBy(null);
                            } else if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value)) {
                            setEmailError("Please enter a valid email address.");
                            setCurrentUserReferralCode(null);
                            setReferredBy(null);
                            } else {
                            setEmailError(null);
                            // Fetch referral_code and referred_by for entered email
                            const { data, error } = await supabase
                              .from("profiles")
                              .select("referral_code, referred_by")
                              .eq("email", value)
                              .single();
                            if (!error && data?.referral_code) {
                              setCurrentUserReferralCode(data.referral_code);
                            } else {
                              setCurrentUserReferralCode(null);
                            }
                            if (!error && data?.referred_by) {
                              setReferredBy(data.referred_by);
                            } else {
                              setReferredBy(null);
                            }
                            }
                          }}
                          error={emailError || undefined}
                          helperText={
                            currentUserReferralCode
                            ? (
                              <span className="text-success">
                                User is Active. Code: <b>{currentUserReferralCode}</b>
                              </span>
                              )
                            : undefined
                          }
                          />
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            name="password"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            autoCapitalize="none"
                            autoComplete="off"
                            autoCorrect="off"
                            required
                            minLength={8}
                            className="bg-background border border-border text-foreground placeholder:text-muted-foreground pr-12"
                            value={passwordValue}
                            onChange={e => {
                              setPasswordValue(e.target.value);
                              setPasswordError(null);
                              setPasswordStrength(calculatePasswordStrength(e.target.value));
                            }}
                            error={passwordError || undefined}
                            helperText={
                              passwordValue && (
                                <span className={
                                  passwordStrength >= 4
                                    ? "text-green-600"
                                    : passwordStrength >= 2
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }>
                                  Password strength: {passwordStrength >= 4 ? "Strong" : passwordStrength >= 2 ? "Medium" : "Weak"}
                                </span>
                              )
                            }
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {/* Referral Code Verification Input */}
                        {referredBy ? (
                          <div className="bg-secondary rounded-lg px-4 py-3 border-border border text-success flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                              <SealCheckIcon className="h-5 w-5 text-success" weight="fill" />
                              <span className="font-medium text-xs">Referred by</span>
                            </div>
                            <span className="ml-7 font-medium text-foreground break-all">{referredBy}</span>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              id="referral"
                              name="referral"
                              label="Referral Code (optional)"
                              type="text"
                              autoCapitalize="characters"
                              autoComplete="off"
                              autoCorrect="off"
                              maxLength={8}
                              pattern="[A-Z0-9]{8}"
                              className="bg-background border border-border text-foreground placeholder:text-muted-foreground pr-12"
                              value={referralCode}
                              onChange={e => {
                                setReferralCode(e.target.value.toUpperCase());
                                setReferralError(null);
                              }}
                              error={referralError || undefined}
                              helperText={
                                referralLoading ? (
                                  <span className="text-muted-foreground">Checking code...</span>
                                ) : referralEmail ? (
                                  <span className="text-green-600">Valid code from: <b>{referralEmail}</b></span>
                                ) : referralError ? (
                                  <span className="text-red-600">{referralError}</span>
                                ) : undefined
                              }
                            />
                          </div>
                        )}
                        <Button
                          type="submit"
                          className="w-full bg-primary text-white hover:bg-primary/90 h-12 text-base mt-2 mb-2 rounded-lg"
                          disabled={
                            isLoading ||
                            !email ||
                            !passwordValue ||
                            !!referralError // disables if self-referral or invalid code
                          }
                        >
                          {isLoading ? "Processing..." : "Continue"}
                          {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                        {/* TODO: Add CAPTCHA here for production */}
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
              Arthaa is an operator of commodities, currencies, crypto and indices only.<br />
              Arthaa doesn't provide financial advice, and all trading carries risk.<br />
              We don't accept clients from USA, Iran, North Korea, Syria, Afghanistan, or any other sanctioned countries.<br />
            </span>
          </div>
        </div>
      </PageTransition>
    </AuthGuard>
  );
};

export default Login;
