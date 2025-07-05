import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const rankStyles: Record<string, { bg: string; icon: string; border: string; gradient: string }> = {
  "New Member":      { bg: "bg-gray-200/10",      icon: "text-gray-100",    border: "border-blue-500/50",    gradient: "from-blue-500/5 via-transparent to-transparent" },
  "Amber":           { bg: "bg-amber-100/10",     icon: "text-amber-100",   border: "border-amber-500/50",   gradient: "from-amber-500/5 via-transparent to-transparent" },
  "Jade":            { bg: "bg-green-100/10",     icon: "text-green-100",   border: "border-green-500/50",   gradient: "from-green-500/5 via-transparent to-transparent" },
  "Pearl":           { bg: "bg-sky-100/10",       icon: "text-sky-100",     border: "border-sky-500/50",     gradient: "from-sky-500/5 via-transparent to-transparent" },
  "Sapphire":        { bg: "bg-blue-100/10",      icon: "text-blue-100",    border: "border-blue-500/50",    gradient: "from-blue-500/5 via-transparent to-transparent" },
  "Topaz":           { bg: "bg-yellow-100/10",    icon: "text-yellow-100",  border: "border-yellow-500/50",  gradient: "from-yellow-500/5 via-transparent to-transparent" },
  "Ruby":            { bg: "bg-rose-100/10",      icon: "text-rose-100",    border: "border-rose-500/50",    gradient: "from-rose-500/5 via-transparent to-transparent" },
  "Emerald":         { bg: "bg-emerald-100/10",   icon: "text-emerald-100", border: "border-emerald-500/50", gradient: "from-emerald-500/5 via-transparent to-transparent" },
  "Diamond":         { bg: "bg-cyan-100/10",      icon: "text-cyan-100",    border: "border-cyan-500/50",    gradient: "from-cyan-500/5 via-transparent to-transparent" },
  "Platinum":        { bg: "bg-slate-200/10",     icon: "text-slate-100",   border: "border-slate-500/50",   gradient: "from-slate-500/5 via-transparent to-transparent" },
  "Gold":            { bg: "bg-yellow-200/10",    icon: "text-yellow-100",  border: "border-yellow-500/50",  gradient: "from-yellow-500/5 via-transparent to-transparent" },
  "Legend":          { bg: "bg-purple-100/10",    icon: "text-purple-100",  border: "border-purple-500/50",  gradient: "from-purple-500/5 via-transparent to-transparent" },
  "Ultra Legend":    { bg: "bg-indigo-100/10",    icon: "text-indigo-100",  border: "border-indigo-500/50",  gradient: "from-indigo-500/5 via-transparent to-transparent" },
  "The King":        { bg: "bg-orange-100/10",    icon: "text-orange-100",  border: "border-orange-500/50",  gradient: "from-orange-500/5 via-transparent to-transparent" },
  "Mastermind":      { bg: "bg-pink-100/10",      icon: "text-pink-100",    border: "border-pink-500/50",    gradient: "from-pink-500/5 via-transparent to-transparent" },
  "Kohinoor":        { bg: "bg-fuchsia-100/10",   icon: "text-fuchsia-100", border: "border-fuchsia-500/50", gradient: "from-fuchsia-500/5 via-transparent to-transparent" },
};

export const AffiliateRankCard: React.FC<{
  businessStats: {
    currentRank: string;
    nextRank: { title: string; bonus: number; business_amount: number } | null;
    totalVolume: number;
  };
  directs: number;
  businessVolume: number;
}> = ({ businessStats, directs, businessVolume }) => {
  const rank = businessStats.currentRank || 'New Member';
  const style = rankStyles[rank] || rankStyles['New Member'];

  return (
    <Card className={`relative overflow-hidden border-2 ${style.border} hover:${style.border.replace('/50', '/70')}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-100 pointer-events-none`} />
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current/40 to-transparent opacity-100" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Affiliates</CardTitle>
          <Badge variant="secondary" className={style.icon.replace('text-', 'bg-').replace('text-', 'border-')}>
            {rank}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-4 mt-2 w-full">
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground mb-1">Direct</span>
            <span className="inline-flex items-center w-full justify-between px-4 py-2 rounded-full bg-green-400/10 border border-green-300/50 text-foreground text-xl font-bold">
              <span>{directs}</span>
              <span className="text-xs font-medium text-foreground bg-green-400/20 rounded-full px-2 py-0.5 ml-2">Users</span>
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs text-muted-foreground mb-1">Business Volume</span>
            <span className="inline-flex items-center w-full justify-between px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-300/50 text-foreground text-xl font-bold">
              <span>{businessVolume.toLocaleString()}</span>
              <span className="text-xs font-medium text-foreground bg-yellow-400/20 rounded-full px-2 py-0.5 ml-2">USD</span>
            </span>
          </div>
        </div>
        {businessStats.nextRank && (
          <div className="w-full flex justify-between items-center px-4 py-2 rounded-md bg-blue-400/20 border border-blue-300/50 text-xs font-semibold text-foreground shadow-sm mt-4">
            <div className="flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <span>Next: {businessStats.nextRank.title}</span>
            </div>
            <span className="text-foreground font-normal ml-2">
              {(businessStats.nextRank.business_amount - businessStats.totalVolume).toLocaleString()} USD required
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
