import React from "react";

const rankStyles: Record<string, { bg: string; icon: string; border: string }> = {
  "New Member":      { bg: "bg-gray-200",      icon: "text-gray-500",    border: "border-gray-300" },
  "Amber":           { bg: "bg-amber-100",     icon: "text-amber-500",   border: "border-amber-300" },
  "Jade":            { bg: "bg-green-100",     icon: "text-green-600",   border: "border-green-300" },
  "Pearl":           { bg: "bg-sky-100",       icon: "text-sky-400",     border: "border-sky-300" },
  "Sapphire":        { bg: "bg-blue-100",      icon: "text-blue-500",    border: "border-blue-300" },
  "Topaz":           { bg: "bg-yellow-100",    icon: "text-yellow-500",  border: "border-yellow-300" },
  "Ruby":            { bg: "bg-rose-100",      icon: "text-rose-500",    border: "border-rose-300" },
  "Emerald":         { bg: "bg-emerald-100",   icon: "text-emerald-500", border: "border-emerald-300" },
  "Diamond":         { bg: "bg-cyan-100",      icon: "text-cyan-500",    border: "border-cyan-300" },
  "Platinum":        { bg: "bg-slate-200",     icon: "text-slate-500",   border: "border-slate-300" },
  "Gold":            { bg: "bg-yellow-200",    icon: "text-yellow-600",  border: "border-yellow-400" },
  "Legend":          { bg: "bg-purple-100",    icon: "text-purple-500",  border: "border-purple-300" },
  "Ultra Legend":    { bg: "bg-indigo-100",    icon: "text-indigo-500",  border: "border-indigo-300" },
  "The King":        { bg: "bg-orange-100",    icon: "text-orange-500",  border: "border-orange-300" },
  "Mastermind":      { bg: "bg-pink-100",      icon: "text-pink-500",    border: "border-pink-300" },
  "Kohinoor":        { bg: "bg-fuchsia-100",   icon: "text-fuchsia-600", border: "border-fuchsia-300" },
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
    <div
      className={`bg-background border-2 rounded-2xl p-6 flex flex-col justify-between cursor-pointer transition-shadow ${style.border}`}
      tabIndex={0}
      role="region"
      aria-label="Affiliate Rank Card"
    >
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-md text-foreground">Affiliate</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.icon} ${style.border}`}>
              {rank}
            </span>
          </div>
          <div className="flex gap-4 mt-4 w-full">
            <div className="flex flex-col items-start w-1/2">
              <span className="text-xs text-muted-foreground mb-1">Directs</span>
              <span className="inline-flex items-center w-full justify-between px-4 py-2 rounded-full bg-green-100 border border-green-300 text-green-700 text-xl font-bold">
                <span>{directs}</span>
                <span className="text-xs font-medium text-green-700 bg-green-200 rounded-full px-2 py-0.5 ml-2">Active</span>
              </span>
            </div>
            <div className="flex flex-col items-start w-1/2">
              <span className="text-xs text-muted-foreground mb-1">Business Volume</span>
              <span className="inline-flex items-center w-full justify-between px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 text-xl font-bold">
                <span>{businessVolume.toLocaleString()}</span>
                <span className="text-xs font-medium text-yellow-800 bg-yellow-200 rounded-full px-2 py-0.5 ml-2">USD</span>
              </span>
            </div>
          </div>
        </div>
        {businessStats.nextRank && (
          <div className="w-full flex justify-between items-center px-4 py-2 rounded-md bg-blue-100 border border-blue-300 text-xs font-semibold text-blue-700 shadow-sm mt-4">
            <div className="flex items-center">
              <span className="relative flex h-3 w-3 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <span>Next: {businessStats.nextRank.title}</span>
            </div>
            <span className="text-blue-500 font-normal ml-2">{(businessStats.nextRank.business_amount - businessStats.totalVolume).toLocaleString()} USD required</span>
          </div>
        )}
      </div>
    </div>
  );
};
