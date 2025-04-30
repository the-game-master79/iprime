export interface TradingPair {
  symbol: string;
  name: string;
  short_name: string;
  type: 'crypto' | 'forex';
  min_leverage: number;
  max_leverage: number;
  leverage_options: number[];
  is_active: boolean;
  min_lots: number;
  max_lots: number;
  pip_value: number; // Add pip value configuration
  lot_step: number;
  image_url?: string;
}

export interface PriceData {
  price: string;
  change: string;
  bid?: string;
  ask?: string;
}

export interface PriceAnimation {
  direction: 'up' | 'down';
  timestamp: number;
}

export interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  status: 'open' | 'pending' | 'closed';
  openPrice: number;
  lots: number;
  currentPrice?: number;
  pnl?: number;
  leverage: number;
  orderType: 'market' | 'limit';
  limitPrice: number | null;
  openTime: number;
  margin_amount?: number;
  pip_value?: number;
}

export interface TradeParams {
  type: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  lots: number;
  leverage: number;
  limitPrice?: number;
  openPrice?: number;  // Add this field
}
