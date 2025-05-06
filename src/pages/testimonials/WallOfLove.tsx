import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { SEO } from "@/components/shared/SEO";
import { Fire } from "@phosphor-icons/react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Professional Trader",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    content: "The AI-powered analytics have completely transformed how I approach trading. The platform's speed and reliability are unmatched."
  },
  {
    name: "James Wilson",
    role: "Investment Analyst",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
    content: "CloudForex's 24/7 support team is exceptional. They've helped me optimize my trading strategy and maximize returns."
  },
  {
    name: "Emma Thompson",
    role: "Retail Investor",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    content: "As a beginner, I appreciate how user-friendly the platform is. The educational resources have helped me grow my portfolio significantly."
  },
  {
    name: "Michael Chen",
    role: "Day Trader",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    content: "The execution speed is incredible. I've never experienced such fast order processing before switching to CloudForex."
  },
  {
    name: "Sofia Rodriguez",
    role: "Forex Specialist",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2",
    content: "The advanced charting tools and technical indicators have given me a competitive edge in the market."
  },
  {
    name: "David Park",
    role: "Portfolio Manager",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    content: "CloudForex's risk management features help me maintain a disciplined trading approach. Excellent platform!"
  },
  {
    name: "Anna Kowalski",
    role: "Crypto Trader",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    content: "The seamless integration of crypto and forex markets makes diversification effortless. Love the platform!"
  },
  {
    name: "Thomas Weber",
    role: "Financial Analyst",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7",
    content: "The AI predictions have been remarkably accurate. It's like having a professional analyst by your side."
  },
  {
    name: "Lisa Johnson",
    role: "Swing Trader",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
    content: "The mobile app is fantastic. I can manage my trades on the go without compromising on features."
  }
];

const WallOfLove = () => {
  return (
    <PageTransition>
      <SEO
        title="Client Testimonials - CloudForex"
        description="Read what our clients say about their experience with CloudForex's trading platform and services."
        keywords="trading testimonials, client reviews, forex trading experience, cloudforex reviews"
      />
      <div className="min-h-screen">
        <Navbar />
        <main className="py-24">
          <div className="container max-w-[1200px] mx-auto px-4">
            <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto mb-12">
              <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Fire className="w-4 h-4 mr-1" weight="fill" />
                Client Testimonials
              </div>
              <h1 className="text-4xl font-bold">Wall of Love</h1>
              <p className="text-muted-foreground">
                See what our users have to say about their experience with CloudForex
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((testimonial, i) => (
                <div 
                  key={i} 
                  className="bg-card border border-border/50 p-6 rounded-xl animate-on-scroll opacity-0 translate-y-4 transition-all duration-700 hover:border-primary/20" 
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={`${testimonial.image}?auto=format&fit=crop&w=100&h=100`}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-medium text-foreground">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{testimonial.content}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default WallOfLove;
