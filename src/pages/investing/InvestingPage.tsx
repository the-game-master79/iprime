import { PageTransition } from "@/components/ui-components";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Lightning } from "@phosphor-icons/react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Hero } from "@/components/shared/Hero";
import { Companies } from "@/components/shared/Companies";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Cpu, HardDrive, DatabaseZap, BarChart2, Send, MoveRight, Timer, Percent, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/shared/SEO";

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
      <SEO
        title="Investment Plans"
        description="Choose from our range of investment plans designed for optimal returns. Start investing with CloudForex today."
        keywords="investment plans, forex investment, crypto investment, trading investment, high return investment"
      />
      <div className="min-h-screen bg-[#F3F4F6]">
        {/* Magic Gradient Background */}
        <div className="fixed inset-0 -z-5 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-slower" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse-slowest" />
        </div>

        <Navbar />

        <main className="relative z-10">
          <Hero 
            badge={{
              icon: <Lightning className="h-5 w-5 animate-pulse" />,
              text: "Investment Plans"
            }}
            title="Grow Your Wealth"
            description="Choose from our range of investment plans designed for optimal returns."
            action={{
              text: "View Plans",
              href: "/auth/login"
            }}
          />

          <Companies />

          {/* Investment Plans */}
          <section className="py-16">
            <div className="container max-w-[1200px] mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="border border-border/40 bg-card/60">
                      <CardHeader className="p-4 pb-2 space-y-2">
                        <div className="h-3 w-16 bg-muted/60 rounded animate-pulse mb-1" />
                        <div className="h-5 w-24 bg-muted/60 rounded animate-pulse" />
                        <div className="h-3 w-full bg-muted/60 rounded animate-pulse mt-1" />
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="space-y-3">
                          <div className="h-3 w-4/5 bg-muted/60 rounded animate-pulse" />
                          <div className="h-3 w-3/4 bg-muted/60 rounded animate-pulse" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  plans.map((plan) => (
                    <Card key={plan.id} className="relative transition-all duration-300 hover:shadow-lg overflow-hidden border-border/40">
                      <div className={cn(
                        "absolute -top-32 -right-32 w-[300px] h-[300px] rounded-full opacity-50 blur-3xl transition-transform duration-1000 animate-pulse",
                        "bg-gradient-to-r from-primary/20 to-primary/10"
                      )} />
                      
                      <CardHeader className="p-4 pb-2 space-y-2">
                        <div>
                          <CardTitle className="text-base sm:text-lg font-medium">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-2">
                            {plan.description}
                          </CardDescription>
                        </div>
                        <div className="pt-1">
                          <span className="text-xs text-muted-foreground">$</span>
                          <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                            {plan.investment.toLocaleString()}
                          </span>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-2 space-y-4">
                        <div className="rounded border bg-card/50 p-3">
                          <div className="flex items-center justify-between space-x-4">
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Duration</p>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm sm:text-lg font-semibold">{plan.duration_days}</span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">days</span>
                              </div>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Total ROI</p>
                              <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                                <span className="text-sm sm:text-lg font-semibold">
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
                            <Button className="w-full text-xs sm:text-sm h-8 sm:h-9">
                              Choose {plan.name}
                              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </Link>

                          <Button 
                            variant="secondary" 
                            className="w-full text-xs sm:text-sm h-8 sm:h-9"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setShowBenefits(true);
                            }}
                          >
                            View Plan Benefits
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

        <Footer />

        {/* Benefits Dialog */}
        <Dialog open={showBenefits} onOpenChange={setShowBenefits}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedPlan?.name} Benefits</DialogTitle>
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
                  <span className="text-sm">{benefit.trim()}</span>
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
