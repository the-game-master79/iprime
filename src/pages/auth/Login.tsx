import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui-components";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import { AuthGuard } from "@/components/AuthGuard";
import { generateReferralCode } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { SealCheckIcon } from "@phosphor-icons/react";

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || "");
  const [referralEmail, setReferralEmail] = useState<string | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const navigate = useNavigate();
  // Force light theme for login page
  const { setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);
  
  // Set theme to light on mount
  useEffect(() => {
    setTheme('light');
  }, [setTheme]);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const MAX_ATTEMPTS = 5;
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  
  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordValue, setPasswordValue] = useState("");
  const [email, setEmail] = useState("");
  const [showEmailError, setShowEmailError] = useState(false);
  
  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Store current user's referral code and email
  const [currentUserReferralCode, setCurrentUserReferralCode] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Handle email blur with validation and data fetching
  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setShowEmailError(true);
    
    if (!value) {
      setEmailError("Email is required.");
      setCurrentUserReferralCode(null);
      setReferredBy(null);
      return;
    }
    
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value)) {
      setEmailError("Please enter a valid email address.");
      setCurrentUserReferralCode(null);
      setReferredBy(null);
      return;
    }
    
    setEmailError(null);
    
    // Fetch referral_code and referred_by for entered email
    const { data, error } = await supabase
      .from("profiles")
      .select("referral_code, referred_by")
      .eq("email", value)
      .single();
      
    if (!error) {
      setCurrentUserReferralCode(data?.referral_code || null);
      setReferredBy(data?.referred_by || null);
    } else {
      setCurrentUserReferralCode(null);
      setReferredBy(null);
    }
  };

  // Error states for email and password
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Track if the user has been referred
  const [referredBy, setReferredBy] = useState<string | null>(null);

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

    // Rate limit: lock out after too many attempts
    const LOCKOUT_TIME = 60 * 1000; // 1 minute
    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast.error(`Too many failed attempts. Please try again in ${Math.ceil((lockoutUntil - Date.now()) / 1000)} seconds.`);
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
        // User exists, try to sign in first
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setPasswordError(signInError.message || "Incorrect email or password.");
          setIsLoading(false);
          return;
        }

        // After successful login, check if they're trying to add a referral code
        if (referral) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('email', email)
            .single();

          if (profileData?.referred_by) {
            // Sign out since we don't want to keep them logged in with an invalid state
            await supabase.auth.signOut();
            setEmailError("A referral code has already been added to this account.");
            setIsLoading(false);
            return;
          }

          // If no referral code exists, update with the new one
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ referred_by: referral })
            .eq('email', email);

          if (updateError) {
            console.error('Failed to update referral code:', updateError);
          }
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
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (ignore || !user?.email) {
        setCurrentUserEmail(null);
        setCurrentUserReferralCode(null);
        return;
      }
      
      setCurrentUserEmail(user.email);
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("email", user.email)
        .single();
      
      setCurrentUserReferralCode(error ? null : data?.referral_code || null);
    };
    
    fetchUserData();
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
    setThemeReady(true);
  }, []);

  return (
    <AuthGuard authPage>
      <PageTransition>
        <div className="flex flex-col md:flex-row min-h-screen bg-background">
          {/* Left: Auth Image */}
          <div className="hidden md:flex md:w-1/2 h-screen relative p-4">
            <div className="relative w-full h-full rounded-2xl overflow-hidden">
              <img
                src="/Auth-img.png"
                alt="Authentication"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
              {/* Text at bottom left */}
              <div className="absolute bottom-8 left-8">
                <h2 className="text-9xl font-bold text-white">Ready to Leap?</h2>
              </div>
            </div>
          </div>
          
          {/* Right: Login Form */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="mb-8">
                {themeReady ? (
                  <img
                    src="/arthaa-light.svg"
                    alt="Arthaa Logo"
                    className="w-auto h-8 mb-2"
                  />
                ) : (
                  <div className="w-32 h-8 bg-muted rounded animate-pulse mb-2" />
                )}
                <h1 className="text-2xl font-bold tracking-tight">{getTimeBasedGreeting()}, Trader</h1>
              </div>
              
              <div className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      label="Email"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      required
                      className="bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-md"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                      }}
                      onBlur={handleEmailBlur}
                      error={showEmailError && emailError ? emailError : undefined}
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
                      className="bg-background border border-border text-foreground placeholder:text-muted-foreground pr-12 rounded-md"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none rounded-md"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Referral Code Verification Input */}
                  {referredBy ? (
                    <div className="bg-secondary/50 rounded-md px-4 py-3 border border-border text-success flex flex-col items-start gap-1">
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
                        className="bg-background border border-border text-foreground placeholder:text-muted-foreground pr-12 rounded-md"
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
                  
                  <div className="flex justify-end mt-6">
                    <InteractiveHoverButton
                      type="submit"
                      disabled={isLoading || !email || !passwordValue || !!referralError}
                      className={`px-6 py-2 text-sm font-medium ${isLoading || !email || !passwordValue || !!referralError ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isLoading ? "Logging in..." : "Login"}
                    </InteractiveHoverButton>
                  </div>
                </form>
                
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-center text-xs text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link to="/terms" className="underline underline-offset-4 hover:text-primary">Terms</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">Privacy Policy</Link>
                  </p>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Arthaa is an operator of commodities, currencies, crypto and indices only.
                    We don't accept clients from USA, Iran, North Korea, Syria, Afghanistan, or any other sanctioned countries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </AuthGuard>
  );
};

export default Login;
