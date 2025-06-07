import { Trophy, Info, CheckCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Rank {
  id: string;
  title: string;
  business_amount: number;
  bonus: number;
}

interface RankTableProps {
  ranks: Rank[];
  businessVolume: number;
  currentRank: string;
  claimedRanks: string[];
  claimingRank: string | null;
  onClaimBonus: (rank: Rank) => void;
}

export function RankTable({
  ranks,
  businessVolume,
  currentRank,
  claimedRanks,
  claimingRank,
  onClaimBonus,
}: RankTableProps) {
  const isRankEligible = (targetRank: string) => {
    const sortedRanks = [...ranks].sort((a, b) => a.business_amount - b.business_amount);
    const currentRankIndex = sortedRanks.findIndex(r => r.title === currentRank);
    const targetRankIndex = sortedRanks.findIndex(r => r.title === targetRank);
    return targetRankIndex <= currentRankIndex;
  };

  const getNextUnachievedRank = () => {
    const sortedRanks = [...ranks].sort((a, b) => a.business_amount - b.business_amount);
    return sortedRanks.find(r => businessVolume < r.business_amount)?.title;
  };

  const getRankStyles = (rank: Rank) => {
    const nextRankTitle = getNextUnachievedRank();
    
    if (rank.title === nextRankTitle) {
      return "border-primary bg-primary/5";
    }
    if (businessVolume >= rank.business_amount) {
      return "border-success bg-success/5";
    }
    return "border-border bg-secondary hover:bg-secondary-foreground";
  };

  // Add a color map for each rank
  const rankColorMap: Record<string, { bg: string; icon: string }> = {
    "New Member":      { bg: "bg-gray-200",         icon: "text-gray-500" },
    "Amber":           { bg: "bg-amber-100",        icon: "text-amber-500" },
    "Jade":            { bg: "bg-green-100",        icon: "text-green-600" },
    "Pearl":           { bg: "bg-sky-100",          icon: "text-sky-400" },
    "Sapphire":        { bg: "bg-blue-100",         icon: "text-blue-500" },
    "Topaz":           { bg: "bg-yellow-100",       icon: "text-yellow-500" },
    "Ruby":            { bg: "bg-rose-100",         icon: "text-rose-500" },
    "Emerald":         { bg: "bg-emerald-100",      icon: "text-emerald-500" },
    "Diamond":         { bg: "bg-cyan-100",         icon: "text-cyan-500" },
    "Platinum":        { bg: "bg-slate-200",        icon: "text-slate-500" },
    "Gold":            { bg: "bg-yellow-200",       icon: "text-yellow-600" },
    "Legend":          { bg: "bg-purple-100",       icon: "text-purple-500" },
    "Ultra Legend":    { bg: "bg-indigo-100",       icon: "text-indigo-500" },
    "The King":        { bg: "bg-orange-100",       icon: "text-orange-500" },
    "Mastermind":      { bg: "bg-pink-100",         icon: "text-pink-500" },
    "Kohinoor":        { bg: "bg-fuchsia-100",      icon: "text-fuchsia-600" },
  };

  const getTrophyStyles = (rank: Rank) => {
    // Use the color map for each rank
    const color = rankColorMap[rank.title] || { bg: "bg-secondary-foreground", icon: "text-foreground" };
    return color;
  };

  const getProgressBarColor = (rank: Rank) => {
    if (claimedRanks.includes(rank.title)) {
      return "bg-green-500"; 
    }
    if (businessVolume >= rank.business_amount) {
      return "bg-green-500";
    }
    return "bg-primary";
  };

  // Add this helper to check if user has any downlines
  const hasDownlines = currentRank !== 'New Member';

  // Filter ranks to exclude New Member if user has downlines
  const displayRanks = hasDownlines 
    ? ranks.filter(r => r.title !== 'New Member')
    : ranks;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {displayRanks.map((rank) => {
          const trophyStyles = getTrophyStyles(rank);
          const progressBarColor = getProgressBarColor(rank);
          
          if (rank.title === 'New Member') {
            const trophyStyles = getTrophyStyles(rank);
            return (
              <div
                key={rank.id}
                className="relative rounded-lg border-2 border-border bg-secondary p-4 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    trophyStyles.bg
                  )}>
                    <Trophy className={cn("h-6 w-6", trophyStyles.icon)} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      {rank.title}
                      <Badge variant="default" className="h-5">Current</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      Welcome New Member! Start referring to earn bonus.
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={rank.id}
              className={cn(
                "relative rounded-lg border-2 border-border p-4 transition-colors",
                getRankStyles(rank)
              )}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div
                    className={cn(
                      "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full",
                      getTrophyStyles(rank).bg
                    )}
                  >
                    <Trophy
                      className={cn(
                        "h-5 w-5 sm:h-6 sm:w-6",
                        getTrophyStyles(rank).icon
                      )}
                    />
                  </div>
                  <div className="space-y-1 flex-1 sm:flex-none min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{rank.title}</h4>
                      {currentRank === rank.title && (
                        <Badge 
                          variant={businessVolume >= rank.business_amount ? "success" : "default"} 
                          className="h-5 shrink-0"
                        >
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-muted-foreground">
                        Target Volume: ${rank.business_amount.toLocaleString()}
                      </div>
                      {/* Only show progress bar if businessVolume > 0 */}
                      {businessVolume > 0 && (
                        <div className="flex items-center gap-2 max-w-[200px] sm:max-w-none">
                          <div className="h-1.5 sm:h-2 flex-1 rounded-full bg-secondary-foreground">
                            <div
                              className={cn(
                                "h-1.5 sm:h-2 rounded-full transition-all",
                                progressBarColor
                              )}
                              style={{
                                width: `${Math.min(100, (businessVolume / rank.business_amount) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[10px] sm:text-xs tabular-nums text-muted-foreground shrink-0">
                            {Math.min(100, Math.round((businessVolume / rank.business_amount) * 100))}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-end w-full gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "flex items-center gap-1 rounded-full px-3 py-1 bg-primary/10"
                          )}>
                            <span className={cn(
                              "text-sm font-medium",
                              claimedRanks.includes(rank.title)
                                ? "text-success"
                                : "text-primary"
                            )}>
                              {claimedRanks.includes(rank.title) ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>${rank.bonus.toLocaleString()}</span>
                                </div>
                              ) : (
                                <>+${rank.bonus.toLocaleString()}</>
                              )}
                            </span>
                            {!claimedRanks.includes(rank.title) && (
                              <Info className="h-4 w-4 text-primary/60" />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>One-time bonus for achieving this rank</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="sm:hidden">
                      {businessVolume >= rank.business_amount ? (
                        claimedRanks.includes(rank.title) ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Claimed
                          </Badge>
                        ) : rank.title !== "New Member" &&
                          isRankEligible(rank.title) ? (
                          <Button
                            size="sm"
                            onClick={() => onClaimBonus(rank)}
                            disabled={claimingRank === rank.title}
                          >
                            {claimingRank === rank.title ? "Claiming..." : "Claim"}
                          </Button>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Achieved
                          </Badge>
                        )
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    {/* Original desktop button/badge layout */}
                    {businessVolume >= rank.business_amount ? (
                      claimedRanks.includes(rank.title) ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Claimed
                        </Badge>
                      ) : rank.title !== "New Member" &&
                        isRankEligible(rank.title) ? (
                        <Button
                          size="sm"
                          onClick={() => onClaimBonus(rank)}
                          disabled={claimingRank === rank.title}
                        >
                          {claimingRank === rank.title ? "Claiming..." : "Claim Bonus"}
                        </Button>
                      ) : (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Achieved
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
