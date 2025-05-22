import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { DashboardTopbar } from "@/components/shared/DashboardTopbar";
import { PageTransition } from "@/components/ui-components";
import { Confetti } from "@phosphor-icons/react";

interface Promotion {
  id: string;
  title: string;
  image_url: string;
  link: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const Promotions = () => {
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PageTransition>
      <div className="min-h-[100dvh] bg-[#000000]">
        <DashboardTopbar />
        
        <main className="py-12 px-4 md:py-16">
          <div className="container mx-auto max-w-[1000px]">
            {promotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="flex justify-center mb-4">
                  <Confetti className="w-12 h-12 text-primary" weight="fill" />
                </div>
                <p>No active promotions at the moment</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Confetti className="w-6 h-6 text-primary" weight="fill" />
                  <h2 className="text-2xl font-semibold">Active Promotions</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {promotions.map((promo) => (
                    <Link key={promo.id} to={promo.link}>
                      <div className="group bg-card rounded-xl overflow-hidden border border-border/5 hover:border-border/20 transition-all duration-300">
                        <div className="aspect-[2/1] relative overflow-hidden">
                          <img 
                            src={promo.image_url} 
                            alt={promo.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-lg">{promo.title}</h3>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default Promotions;
