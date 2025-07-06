import React from "react";
import type { Transaction } from "@/types/dashboard";
import { ArrowUpRight, BarChart2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Define Trade interface locally since it's not exported from types
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

const statusStyles: Record<string, string> = {
  completed: 'bg-success/10 border border-success text-success',
  pending: 'bg-warning/10 border border-warning text-warning',
  failed: 'bg-error/10 border border-error text-error',
  cancelled: 'bg-gray-200 border border-gray-300 text-gray-500',
  default: 'bg-muted-foreground border border-border text-white',
};

export const TopDashboardLists: React.FC<{ transactions: Transaction[]; trades: Trade[] }> = ({ transactions, trades }) => {
  const navigate = useNavigate();
  const hasTransactions = transactions && transactions.length > 0;
  const hasTrades = trades && trades.length > 0;

  // Helper for date formatting (returns formatted date string as 'Jun, 19 • 5:30 AM')
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).replace(',', ',');
  };

  // Helper for status color
  const getStatusColor = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'bg-success';
      case 'pending':
        return 'bg-warning';
      case 'failed':
      case 'cancelled':
        return 'bg-error';
      default:
        return 'bg-muted-foreground';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Recent Transactions */}
      <Card className="bg-background rounded-2xl border-border flex flex-col h-full overflow-hidden">
        <CardHeader className="pb-4 pt-6 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart2 className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            </div>
            {hasTransactions && (
              <button
                type="button"
                className="text-primary text-xs font-medium flex items-center gap-1 hover:underline bg-transparent border-0 cursor-pointer px-2 py-1 hover:bg-muted/50 rounded-md"
                onClick={() => navigate('/history?tab=transactions')}
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 flex-1">
          {hasTransactions ? (
            <div className="space-y-4">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusColor(tx.status)}`}></span>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">
                          {tx.type === 'investment_return' 
                            ? 'Trade Profit' 
                            : tx.type === 'withdrawal' && tx.withdrawal_data?.wallet_address
                              ? `Withdrawal to ${tx.withdrawal_data.wallet_address.slice(0, 6)}...${tx.withdrawal_data.wallet_address.slice(-4)}`
                              : tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        {tx.withdrawal_data?.transaction_hash && (
                          <span className="text-xs text-muted-foreground">
                            TX: {tx.withdrawal_data.transaction_hash.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`font-semibold ${Number(tx.amount) > 0 ? 'text-success' : 'text-destructive'}`}>
                      {Number(tx.amount) > 0 ? '+' : ''}{Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full pl-4">
                    <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
                    <span className="text-xs text-muted-foreground capitalize">{tx.status || 'unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm text-center py-6">
              All your transactions will appear here
            </div>
          )}
        </CardContent>
      </Card>


      {/* Recent Closed Trades */}
      <div className="bg-background rounded-2xl p-4 border border-border flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Your Trades</h3>
          {hasTrades && (
            <button
              type="button"
              className="text-primary text-xs font-medium flex items-center gap-1 hover:underline ml-auto bg-transparent border-0 cursor-pointer"
              onClick={() => navigate('/history?tab=closed_trades')}
            >
              View All <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {hasTrades ? (
          <ul>
            {trades.slice(0, 5).map(trade => {
              const decimals =
                trade.pair === "XAUUSD" ? 2 :
                trade.pair.endsWith("JPY") ? 3 :
                trade.pair.endsWith("USDT") && ["BTCUSDT", "ETHUSDT", "SOLUSDT", "LINKUSDT", "BNBUSDT"].includes(trade.pair) ? 2 :
                trade.pair === "DOGEUSDT" ? 5 :
                trade.pair === "ADAUSDT" || trade.pair === "TRXUSDT" ? 4 :
                trade.pair === "DOTUSDT" ? 3 :
                !trade.pair.endsWith("USDT") ? 5 : 2;
              const isProfitable = trade.pnl >= 0;
              return (
                <li key={trade.id} className="py-2 flex flex-col gap-1 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${trade.type?.toLowerCase() === "buy" ? "bg-primary" : "bg-error"}`}></span>
                      <span className="font-medium text-foreground text-sm">{trade.pair}</span>
                    </div>
                    <span className={`font-semibold ${isProfitable ? "text-success" : "text-destructive"}`}>{isProfitable ? "+" : ""}{trade.pnl?.toFixed(2)} USD</span>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-muted-foreground">{formatDate(trade.closed_at)}</span>
                    <span className="text-xs text-muted-foreground">
                      {`${Number(trade.lots).toFixed(2)} Lot @ ${Number(trade.open_price).toFixed(decimals)} → ${Number(trade.close_price).toFixed(decimals)}`}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-muted-foreground text-sm text-center py-6">All your recent closed trades will appear here</div>
        )}
      </div>
    </div>
  );
};
