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
      return "border-blue-500/50 bg-blue-500/5";
    }
    if (businessVolume >= rank.business_amount) {
      return "border-green-500/50 bg-green-500/5";
    }
    return "border-border hover:bg-muted/50";
  };

  const getTrophyStyles = (rank: Rank) => {
    const nextRankTitle = getNextUnachievedRank();
    
    if (rank.title === nextRankTitle) {
      return {
        bg: "bg-blue-500/20",
        icon: "text-blue-500"
      };
    }
    if (businessVolume >= rank.business_amount) {
      return {
        bg: "bg-green-500/20",
        icon: "text-green-500"
      };
    }
    return {
      bg: "bg-muted",
      icon: "text-muted-foreground/40"
    };
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
            return (
              <div
                key={rank.id}
                className="relative rounded-lg border bg-card p-4 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    "bg-muted"
                  )}>
                    <Trophy className="h-6 w-6 text-muted-foreground/40" />
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
                "relative rounded-lg border bg-card p-4 transition-colors",
                getRankStyles(rank)
              )}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <div
                    className={cn(
                      "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full",
                      trophyStyles.bg
                    )}
                  >
                    <Trophy
                      className={cn(
                        "h-5 w-5 sm:h-6 sm:w-6",
                        trophyStyles.icon
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
                      <div className="flex items-center gap-2 max-w-[200px] sm:max-w-none">
                        <div className="h-1.5 sm:h-2 flex-1 rounded-full bg-muted">
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
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
                  <div className="flex items-center justify-between sm:justify-end w-full gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "flex items-center gap-1 rounded-full px-3 py-1",
                            claimedRanks.includes(rank.title) 
                              ? "bg-green-100" 
                              : "bg-primary/10"
                          )}>
                            <span className={cn(
                              "text-sm font-medium",
                              claimedRanks.includes(rank.title)
                                ? "text-green-600"
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
