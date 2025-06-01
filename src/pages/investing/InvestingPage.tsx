import { PageTransition } from "@/components/ui-components";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lightning } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Cpu, HardDrive, DatabaseZap, BarChart2, Send, MoveRight, Timer, Percent, ArrowRight, ShieldCheck, Lock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  investment: number;
  returns_percentage: number;
  duration_days: number;
  benefits: string;
  status: 'active' | 'inactive';
}

const InvestingPage = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showBenefits, setShowBenefits] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('plans')
          .select('*')
          .eq('status', 'active')
          .order('investment', { ascending: true });

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <Navbar />

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <Lightning className="h-5 w-5 animate-pulse text-primary" />, 
              text: "Investment Plans"
            }}
            title="Simple trading, powerful returns."
            subtitle="Confidence to grow."
            description="Discover our professionally managed auto-trading plans offering consistent returns through algorithmic trading and advanced market analysis."
            action={{
              text: "Start Investing",
              href: "/auth/login"
            }}
          />

          {/* Investment Overview Section */}
          <section className="py-16 bg-accent/5">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Why Invest with CloudForex?</h2>
                  <p className="text-muted-foreground">
                    Our investment plans combine sophisticated trading algorithms with expert market analysis to generate 
                    consistent returns. We leverage advanced technology and years of market expertise to manage your 
                    investments effectively.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Flexible Duration</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Choose investment periods that suit your financial goals</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Competitive Returns</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Earn attractive returns through our optimized trading strategies</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DatabaseZap className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Auto-Trading</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Let our AI-powered systems handle the trading for you</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Performance Tracking</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Monitor your investment performance in real-time</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card/40 backdrop-blur-sm p-6 rounded-2xl border border-border/20">
                  <h3 className="text-xl font-semibold mb-4">Investment Process</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Choose Your Plan</h4>
                        <p className="text-sm text-muted-foreground">Select an investment plan that matches your goals and budget</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Fund Your Account</h4>
                        <p className="text-sm text-muted-foreground">Deposit funds securely using your preferred payment method</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Start Earning</h4>
                        <p className="text-sm text-muted-foreground">Our systems begin trading and generating returns for you</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Investment Plans */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">Choose Your Investment Plan</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We offer carefully structured investment plans to suit different investment goals and risk appetites. 
                  Each plan is powered by our advanced trading algorithms and managed by experienced professionals.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border border-border/20 bg-card/40 backdrop-blur-sm">
                      <CardHeader className="p-4 pb-2 space-y-2">
                        <div className="h-3 w-16 bg-muted/20 rounded animate-pulse mb-1" />
                        <div className="h-5 w-24 bg-muted/20 rounded animate-pulse" />
                        <div className="h-3 w-full bg-muted/20 rounded animate-pulse mt-1" />
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-3">
                          <div className="h-3 w-4/5 bg-muted/20 rounded animate-pulse" />
                          <div className="h-3 w-3/4 bg-muted/20 rounded animate-pulse" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  plans.map((plan) => (
                    <Card key={plan.id} className="relative transition-all duration-300 hover:shadow-xl overflow-hidden border-border/20 bg-card/40 backdrop-blur-sm hover:bg-card/60">
                      <div className={cn(
                        "absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full opacity-30 blur-3xl transition-transform duration-1000 animate-pulse",
                        "bg-gradient-to-r from-primary/30 to-primary/20"
                      )} />
                      
                      <CardHeader className="p-4 pb-2 space-y-2 relative z-10">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-medium text-primary">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-2">
                            {plan.description}
                          </CardDescription>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                            {plan.investment.toLocaleString()}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-2 space-y-4 relative z-10">
                        <div className="rounded border border-border/20 bg-background/50 backdrop-blur-sm p-3">
                          <div className="flex items-center justify-between space-x-4">
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Duration</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm sm:text-lg font-semibold text-foreground">{plan.duration_days}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">days</span>
                              </div>
                            </div>
                            <Separator orientation="vertical" className="h-8 bg-border/20" />
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Total ROI</p>
                              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                                <span className="text-sm sm:text-lg font-semibold text-foreground">
                                  {(plan.returns_percentage * plan.duration_days).toFixed(1)}%
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  (${((plan.investment * plan.returns_percentage * plan.duration_days) / 100).toFixed(2)})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Link to="/auth/login">
                            <Button className="w-full text-xs sm:text-sm h-8 sm:h-9 bg-primary/90 hover:bg-primary">
                              Choose {plan.name}
                              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </Link>

                          <Button 
                            variant="secondary" 
                            className="w-full text-xs sm:text-sm h-8 sm:h-9 bg-secondary/80 hover:bg-secondary"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setShowBenefits(true);
                            }}
                          >
                            See Full Investment Benefits
                            <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>

        {/* Safety and Security Section */}
        <section className="py-16 bg-accent/5">
          <div className="container max-w-[1200px] mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">Your Investment Security</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We prioritize the security of your investments through robust risk management and transparent operations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card/40 backdrop-blur-sm p-6 rounded-2xl border border-border/20">
                <ShieldCheck className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Risk Management</h3>
                <p className="text-sm text-muted-foreground">
                  Our sophisticated risk management systems monitor and adjust trading positions in real-time to protect your investment.
                </p>
              </div>
              <div className="bg-card/40 backdrop-blur-sm p-6 rounded-2xl border border-border/20">
                <Lock className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Secure Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Bank-grade security measures protect your funds and personal information, with regular security audits.
                </p>
              </div>
              <div className="bg-card/40 backdrop-blur-sm p-6 rounded-2xl border border-border/20">
                <Eye className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Full Transparency</h3>
                <p className="text-sm text-muted-foreground">
                  Track your investment performance and returns in real-time through our detailed reporting dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />

        {/* Benefits Dialog */}
        <Dialog open={showBenefits} onOpenChange={setShowBenefits}>
          <DialogContent className="bg-card/95 backdrop-blur-sm border-border/20">
            <DialogHeader>
              <DialogTitle className="text-primary">{selectedPlan?.name} Benefits</DialogTitle>
              <DialogDescription>
                Detailed benefits breakdown for this investment plan
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-4 mt-4">
              {selectedPlan?.benefits.split('•').filter(Boolean).map((benefit, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  {idx === 0 && <Cpu className="h-5 w-5 text-primary shrink-0" />}
                  {idx === 1 && <HardDrive className="h-5 w-5 text-primary shrink-0" />}
                  {idx === 2 && <DatabaseZap className="h-5 w-5 text-primary shrink-0" />}
                  {idx === 3 && <BarChart2 className="h-5 w-5 text-primary shrink-0" />}
                  {idx === 4 && <Send className="h-5 w-5 text-primary shrink-0" />}
                  {idx === 5 && <MoveRight className="h-5 w-5 text-primary shrink-0" />}
                  <span className="text-sm text-foreground/90">{benefit.trim()}</span>
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
};

export default InvestingPage;
