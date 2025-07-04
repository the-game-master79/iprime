import { useEffect, useState } from 'react';
import { PageTransition } from "@/components/ui-components";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, ChartLineUp, CurrencyCircleDollar, GlobeSimple, LockKey, Users } from "@phosphor-icons/react";
import { supabase } from '@/lib/supabase';

interface FAQQuestion {
  q: string;
  a: string;
}

interface FAQCategory {
  id: string;
  category_title: string;
  category_icon: string;
  questions: FAQQuestion[];
}

const iconMap: Record<string, any> = {
  Brain,
  LockKey,
  CurrencyCircleDollar,
  Users,
  ChartLineUp,
  GlobeSimple
};

const FaqPage = () => {
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setFaqCategories(data || []);
      } catch (err) {
        console.error('Error fetching FAQs:', err);
        setError('Failed to load FAQs. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (faqCategories.length === 0) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div>No FAQs found.</div>
      </div>
    );
  }
	  return (
    <PageTransition>
      <div className="min-h-[calc(100vh-100px)] relative overflow-hidden pt-4">
        <main className="py-4 sm:py-8 px-3 sm:px-4 relative z-10">
          <div className="container mx-auto max-w-[1200px]">
            <div className="flex flex-col items-center text-center gap-3 max-w-4xl mx-auto mb-8 sm:mb-12 mt-6 sm:mt-12 px-2">
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold text-foreground leading-tight">
                Everything you need to know — fast, clear, and real.
              </h2>
            </div>
            
            <Tabs defaultValue={faqCategories[0]?.category_title?.toLowerCase() || ''} className="w-full">
              <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:justify-center w-full hide-scrollbar">
                <TabsList className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-2 mb-6 sm:mb-8 w-auto px-2 sm:px-0">
                  {faqCategories.map((category) => {
                    const IconComponent = iconMap[category.category_icon] || GlobeSimple;
                    return (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.category_title.toLowerCase()}
                        className="flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm sm:text-base"
                      >
                        <IconComponent className="h-4 w-4 flex-shrink-0" weight="bold" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{category.category_title}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {faqCategories.map((category) => (
                <TabsContent 
                  key={category.id} 
                  value={category.category_title.toLowerCase()} 
                  className="space-y-4 px-1 sm:px-0"
                >
                  <Accordion type="single" collapsible className="space-y-3 sm:space-y-4">
                    {category.questions.map((qa: FAQQuestion, qIdx: number) => (
                      <AccordionItem
                        key={qIdx}
                        value={`${category.id}-${qIdx}`}
                        className="border border-border/30 rounded-lg sm:rounded-xl bg-background/80 dark:bg-background/60 px-4 sm:px-6 transition-all"
                      >
                        <AccordionTrigger className="py-3 sm:py-4 text-left hover:no-underline [&[data-state=open]>svg]:rotate-180 transition-colors font-medium text-base sm:text-lg px-3">
                          <span className="text-left">{qa.q}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 sm:pb-4 pt-1 sm:pt-2 transition-all duration-300 text-sm sm:text-base px-3">
                          <div className="text-muted-foreground leading-relaxed">{qa.a}</div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
        <style jsx global>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none; /* Hide scrollbar for Chrome, Safari and Opera */
          }
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
        `}</style>
      </div>
    </PageTransition>
  );
};

export default FaqPage;
