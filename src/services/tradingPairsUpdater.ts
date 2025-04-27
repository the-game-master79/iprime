import { supabase } from '@/lib/supabase';

const BINANCE_API_URL = 'https://api.binance.com/api/v3';

interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  filters: {
    filterType: string;
    minQty?: string;
    maxQty?: string;
    stepSize?: string;
  }[];
}

export class TradingPairsUpdater {
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private retryAttempts = 0;
  private readonly maxRetries = 3;

  async start(intervalMinutes = 60) {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.updateTradingPairs();
    this.updateInterval = setInterval(
      () => this.updateTradingPairs(),
      intervalMinutes * 60 * 1000
    );
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.isRunning = false;
  }

  private async updateTradingPairs() {
    try {
      const response = await fetch(`${BINANCE_API_URL}/exchangeInfo`);
      if (!response.ok) throw new Error('Failed to fetch Binance exchange info');
      
      const data = await response.json();
      const usdtPairs = data.symbols.filter((s: BinanceSymbolInfo) => 
        s.quoteAsset === 'USDT' && 
        ['BTC', 'ETH', 'BNB', 'SOL', 'DOGE', 'ADA', 'DOT', 'TRX'].includes(s.baseAsset)
      );

      for (const pair of usdtPairs) {
        const lotFilter = pair.filters.find(f => f.filterType === 'LOT_SIZE');
        if (!lotFilter) continue;

        const { error } = await supabase
          .from('trading_pairs')
          .upsert({
            symbol: `BINANCE:${pair.symbol}`,
            name: this.getFullName(pair.baseAsset),
            short_name: pair.baseAsset,
            type: 'crypto',
            min_lots: parseFloat(lotFilter.minQty || '0.01'),
            max_lots: parseFloat(lotFilter.maxQty || '100'),
            lot_step: parseFloat(lotFilter.stepSize || '0.01'),
            base_currency: pair.baseAsset,
            quote_currency: pair.quoteAsset,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('symbol', `BINANCE:${pair.symbol}`);

        if (error) {
          console.error(`Error updating ${pair.symbol}:`, error);
        }
      }

      this.retryAttempts = 0;
    } catch (error) {
      console.error('Error updating trading pairs:', error);
      
      if (this.retryAttempts < this.maxRetries) {
        this.retryAttempts++;
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.retryAttempts), 30000);
        setTimeout(() => this.updateTradingPairs(), delay);
      }
    }
  }

  private getFullName(symbol: string): string {
    const names: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'BNB',
      'SOL': 'Solana',
      'DOGE': 'Dogecoin',
      'ADA': 'Cardano',
      'DOT': 'Polkadot',
      'TRX': 'TRON'
    };
    return names[symbol] || symbol;
  }
}
