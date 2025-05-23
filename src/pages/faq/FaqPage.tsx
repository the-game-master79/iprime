import { PageTransition } from "@/components/ui-components";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, ChartLineUp, CurrencyCircleDollar, GlobeSimple, LockKey, Users } from "@phosphor-icons/react";

const faqCategories = [
  {
    icon: Brain,
    title: "Platform Features",
    questions: [
      {
        q: "What makes CloudForex different from other trading platforms?",
        a: "CloudForex uses advanced AI algorithms to provide real-time market insights, predictive analytics, and automated trading features. Our platform is designed to enhance your trading experience with cutting-edge technology."
      },
      {
        q: "Can I access the platform from anywhere?",
        a: "CloudForex can be accessed from anywhere in the world. Our platform is web-based and mobile-friendly, allowing you to trade on the go or from the comfort of your home."
      }
    ]
  },
  {
    icon: LockKey,
    title: "Security & Safety",
    questions: [
      {
        q: "How secure is my investment with CloudForex?",
        a: "We implement cryptographic security measures, including end-to-end encryption, regular security audits, and secure cold storage for digital assets. Your funds are protected by multiple layers of security protocols."
      },
      {
        q: "What security measures are in place to protect my account?",
        a: "We use industry-standard encryption, two-factor authentication, IP monitoring, and automated fraud detection systems to ensure your account remains secure."
      }
    ]
  },
  {
    icon: CurrencyCircleDollar,
    title: "Deposits & Withdrawals",
    questions: [
      {
        q: "What are the minimum deposit requirements?",
        a: "Our platform is designed to accommodate traders of all levels. You can start package purchase with as little as $10, making it accessible while still providing access to all our advanced features."
      },
      {
        q: "How long do withdrawals take to process?",
        a: "Most withdrawals are processed within 24 hours. The actual time may vary depending on the payment method and verification requirements."
      }
    ]
  },
  {
    icon: Users,
    title: "Support & Assistance",
    questions: [
      {
        q: "What kind of support do you offer?",
        a: "We provide 24/7 customer support through multiple channels including live chat, email, and phone. Our dedicated team of trading experts is always ready to assist you with any questions or concerns."
      },
      {
        q: "How can I contact the support team?",
        a: "You can reach our support team through the support portal in your dashboard, via email at hello@cloudforex.com, or through our 24/7 live chat service."
      }
    ]
  },
  {
    icon: ChartLineUp,
    title: "Trading & Investment",
    questions: [
      {
        q: "What trading instruments are available?",
        a: "We offer a wide range of trading instruments including forex pairs, cryptocurrencies, commodities, and indices. All instruments come with competitive spreads and leverage options."
      },
      {
        q: "Do you provide trading signals or analysis?",
        a: "Yes, our AI-powered platform provides real-time trading signals, market analysis, and predictive insights to help inform your trading decisions."
      }
    ]
  },
  {
    icon: GlobeSimple,
    title: "Account & Verification",
    questions: [
      {
        q: "What documents do I need for verification?",
        a: "For account verification, you'll need a valid government-issued ID (passport/driver's license), proof of address (utility bill/bank statement), and in some cases, additional documents based on your jurisdiction."
      },
      {
        q: "How long does verification take?",
        a: "Standard verification is typically completed within 24-48 hours. We use automated verification systems to speed up the process while maintaining security."
      }
    ]
  }
];

const FaqPage = () => {
  return (
    <PageTransition>
      <div className="min-h-screen">
        <Navbar />
        <main className="py-24 px-4">
          <div className="container mx-auto max-w-[1200px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-muted-foreground">
                Find answers to common questions about our platform, services, and features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {faqCategories.map((category, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-card border border-border/50 flex items-center justify-center">
                      <category.icon className="w-5 h-5 text-primary" weight="duotone" />
                    </div>
                    <h2 className="text-xl font-semibold">{category.title}</h2>
                  </div>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.questions.map((qa, qIdx) => (
                      <AccordionItem 
                        key={qIdx} 
                        value={`${idx}-${qIdx}`}
                        className="border border-border/50 rounded-lg bg-card px-4"
                      >
                        <AccordionTrigger className="py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180">
                          <div className="font-medium">{qa.q}</div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 pt-1">
                          <div className="text-muted-foreground text-sm">
                            {qa.a}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default FaqPage;
