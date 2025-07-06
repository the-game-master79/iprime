import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TransactionTable } from "@/components/transactionTable/TransactionTable";
import { RankTable } from "@/components/rankTable/RankTable";
import { Target } from "@phosphor-icons/react";

// Types
import type { Transaction, Rank } from "@/types/dashboard";

interface Trade {
  id: string;
  pair: string;
  type: string;
  lots: number;
  pnl: number;
  open_price: number;
  close_price: number;
  leverage: number;
  closed_at?: string;
  updated_at?: string;
  created_at?: string;
  status?: string;
}

interface BusinessStats {
  currentRank: string;
  totalVolume: number;
  rankBonus: number;
  nextRank: { title: string; bonus: number; business_amount: number } | null;
  progress: number;
  targetVolume: number;
}

interface DashboardTabsProps {
  transactions: Transaction[];
  transactionsLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  handleLoadMore: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  handleCopyId: (id: string) => void;
  ranks: Rank[];
  ranksLoading: boolean;
  businessStats: BusinessStats;
  claimedRanks: string[];
  claimingRank: string | null;
  onClaimRankBonus: (rank: Rank) => void;
  closedTrades: Trade[];
  closedTradesLoading: boolean;
  groupTradesByDate: (trades: Trade[]) => { dateKey: string; trades: Trade[] }[];
  formatDateLabel: (dateKey: string) => string;
  activeTab?: string;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  transactions,
  transactionsLoading,
  hasMore,
  isLoadingMore,
  handleLoadMore,
  handleCopyId,
  ranks,
  ranksLoading,
  businessStats,
  claimedRanks,
  claimingRank,
  onClaimRankBonus,
  closedTrades,
  closedTradesLoading,
  groupTradesByDate,
  formatDateLabel,
  activeTab,
}) => {
  // Add a mapping from symbol to display name
  const pairNameMap: Record<string, string> = {
    "XAUUSD": "Gold",
    "BTCUSDT": "Bitcoin",
    "ETHUSDT": "Ethereum",
    "SOLUSDT": "Solana",
    "LINKUSDT": "Chainlink",
    "BNBUSDT": "Binance Coin",
    "DOGEUSDT": "Dogecoin",
    "ADAUSDT": "Cardano",
    "TRXUSDT": "TRON",
    "DOTUSDT": "Polkadot",
    // ...add more as needed...
  };

  return (
    <div>
      <Tabs defaultValue={activeTab || "transactions"} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="ranks">Ranks</TabsTrigger>
          <TabsTrigger value="closed_trades">Closed Trades</TabsTrigger>
        </TabsList>
        <TabsContent 
          value="transactions" 
          className="space-y-3 w-full"
        >
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target 
                className="h-16 w-16 mb-4 text-white/20"
                weight="thin"
              />
              <p className="text-base">No transactions found</p>
              <p className="text-sm text-white/50 mt-1">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              <TransactionTable 
                transactions={transactions} 
                onCopyId={handleCopyId}
              />
              
              {hasMore && (
                <div className="py-4 text-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="w-full sm:w-auto"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}

              {!hasMore && transactions.length > 0 && (
                <div className="py-4 text-center text-sm text-white">
                  End of your Transactions
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranks" className="space-y-4 w-full">
          {ranksLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <RankTable
              ranks={ranks}
              businessVolume={businessStats.totalVolume}
              currentRank={businessStats.currentRank}
              claimedRanks={claimedRanks}
              claimingRank={claimingRank}
              onClaimBonus={onClaimRankBonus}
            />
          )}
        </TabsContent>

        <TabsContent value="closed_trades" className="space-y-4 w-full">
          {closedTradesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : closedTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Target 
                className="h-16 w-16 mb-4 text-white/20"
                weight="thin"
              />
              <p className="text-base">No closed trades found</p>
              <p className="text-sm text-white/50 mt-1">Your closed trades will appear here</p>
            </div>
          ) : (
            <div>
              {/* Total PNL for all closed trades */}
              <div className="mb-4 flex items-center gap-2">
                <span className="font-semibold text-lg">Total PNL:</span>
                <span className={`font-bold text-lg ${closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0 ? "text-success" : "text-error  "}`}>
                  {closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) >= 0 ? "+" : ""}
                  {closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)} USD
                </span>
              </div>
              {/* Grouped by date */}
              <div className="space-y-6">
                {groupTradesByDate(closedTrades).map(({ dateKey, trades }) => {
                  const dayPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                  return (
                    <div key={dateKey}>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-semibold text-base">{formatDateLabel(dateKey)}</span>
                        <span className={`font-bold text-base ${dayPnl >= 0 ? "text-success" : "text-error"}`}>
                          {dayPnl >= 0 ? "+" : ""} {dayPnl.toFixed(2)} USD
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {trades.map((trade) => {
                          const decimals =
                            trade.pair === "XAUUSD" ? 2 :
                            trade.pair.endsWith("JPY") ? 3 :
                            trade.pair.endsWith("USDT") && ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "BNBUSDT"].includes(trade.pair) ? 2 :
                            trade.pair === "DOGEUSDT" ? 5 :
                            trade.pair === "ADAUSDT" || trade.pair === "TRXUSDT" ? 4 :
                            trade.pair === "DOTUSDT" ? 3 :
                            !trade.pair.endsWith("USDT") ? 5 : 2;

                          const isProfitable = trade.pnl >= 0;
                          const closedAt = trade.closed_at || trade.updated_at || trade.created_at;
                          return (
                            <div
                              key={trade.id}
                              className="p-4 rounded-xl border border-border bg-muted/10 shadow-sm flex flex-col"
                            >
                              <div className="flex items-center gap-3 mb-2">
                                {/* Buy/Sell circle indicator */}
                                <span
                                  className={`h-3 w-3 rounded-full ${
                                    trade.type?.toLowerCase() === "buy"
                                      ? "bg-primary"
                                      : "bg-error"
                                  }`}
                                  title={trade.type?.toUpperCase()}
                                />
                                {/* Display name instead of symbol */}
                                <span className="font-bold text-base">
                                  {pairNameMap[trade.pair] || trade.pair}
                                </span>
                                <span className={`ml-auto font-bold ${isProfitable ? "text-success" : "text-error"}`}>
                                  {isProfitable ? "+" : ""}
                                  {trade.pnl?.toFixed(2)} USD
                                </span>
                              </div>
                              {/* Lots/open price line and close price in same row */}
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  <span
                                    className={
                                      trade.type?.toLowerCase() === "buy"
                                        ? "text-primary font-medium"
                                        : "text-error font-medium"
                                    }
                                  >
                                    {`${trade.type?.charAt(0).toUpperCase() + trade.type?.slice(1).toLowerCase()} ${Number(trade.lots).toFixed(2)} Lot`}
                                  </span>
                                  {` at ${Number(trade.open_price).toFixed(decimals)}`}
                                </span>
                                <span className="text-md text-foreground font-medium ml-2">
                                  {Number(trade.close_price).toFixed(decimals)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
