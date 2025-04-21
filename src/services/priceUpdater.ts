import { supabaseNode } from '@/lib/supabaseNode';
import WebSocket from 'ws';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export class PriceUpdaterService {
  private binanceWs: WebSocket | null = null;
  private tradermadeWs: WebSocket | null = null;
  private tradermadeApiKey: string;
  private isRunning = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private priceCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: Record<string, number> = {
    binance: 0,
    tradermade: 0
  };

  constructor(tradermadeApiKey: string) {
    this.tradermadeApiKey = tradermadeApiKey;
  }

  private getReconnectDelay(service: 'binance' | 'tradermade'): number {
    const attempts = this.reconnectAttempts[service];
    return Math.min(RECONNECT_DELAY * Math.pow(2, attempts), MAX_RECONNECT_DELAY);
  }

  async start() {
    try {
      this.isRunning = true;
      await this.initializeConnections();
      this.startPriceChecking();
    } catch (error) {
      console.error('Error starting price updater:', error);
      this.stop();
    }
  }

  private async initializeConnections() {
    try {
      console.log('Fetching active trading pairs...');
      const { data: pairs, error } = await this.fetchTradingPairs();
      
      if (error) throw error;
      if (!pairs?.length) {
        console.log('No active trading pairs found');
        return;
      }
  
      const cryptoPairs = pairs.filter(p => p.type === 'crypto');
      const forexPairs = pairs.filter(p => p.type === 'forex');
  
      // Initialize connections sequentially to avoid overwhelming the server
      if (cryptoPairs.length) {
        await this.initializeCryptoConnection(cryptoPairs);
      }
      
      if (forexPairs.length) {
        await this.initializeForexConnection(forexPairs);
      }
      
      console.log('Price updater initialized successfully');
    } catch (error) {
      console.error('Error initializing connections:', error);
      // Wait and retry connection
      await new Promise(resolve => setTimeout(resolve, 5000));
      return this.initializeConnections();
    }
  }
  
  private async fetchTradingPairs(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await supabaseNode
          .from('trading_pairs')
          .select('*')
          .eq('is_active', true);
        
        if (result.error) {
          throw result.error;
        }
        
        return result;
      } catch (error) {
        console.error(`Attempt ${i + 1}/${retries} failed:`, error);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Failed to fetch trading pairs after all retries');
  }

  private async initializeCryptoConnection(pairs: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!pairs.length) return resolve();

      const connectWebSocket = () => {
        if (!this.isRunning) return resolve();
        
        this.binanceWs = new WebSocket(BINANCE_WS_URL);
        console.log('Connecting to Binance WebSocket...');

        let connectionTimeout = setTimeout(() => {
          this.binanceWs?.close();
          throw new Error('Binance WebSocket connection timeout');
        }, 10000);

        this.binanceWs.on('open', () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts.binance = 0;
          console.log('Binance WebSocket connected');
          
          this.subscribeToCryptoPairs(pairs).then(resolve).catch(reject);
        });

        this.setupCryptoErrorHandling(pairs);
      };

      connectWebSocket();
    });
  }

  private async subscribeToCryptoPairs(pairs: any[]) {
    if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) {
      throw new Error('Binance WebSocket not ready');
    }

    const symbols = pairs.map(p => p.symbol.toLowerCase().replace('binance:', ''));
    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: symbols.map(s => `${s}@bookTicker`),
      id: Date.now()
    };

    this.binanceWs.send(JSON.stringify(subscribeMessage));
    
    this.binanceWs.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.s && message.b && message.a) {
          const symbol = `BINANCE:${message.s}`;
          console.log(`Updating crypto price for ${symbol}: Bid=${message.b}, Ask=${message.a}`);
          
          const { error } = await supabaseNode.rpc('update_live_price', {
            p_symbol: symbol,
            p_bid_price: message.b,
            p_ask_price: message.a,
            p_source: 'binance'
          });

          if (error) {
            console.error(`Error updating price for ${symbol}:`, error);
          }
        }
      } catch (error) {
        console.error('Error handling crypto message:', error);
      }
    });
  }

  private setupCryptoErrorHandling(pairs: any[]) {
    if (!this.binanceWs) return;

    this.binanceWs.on('error', (error) => {
      console.error('Binance WebSocket error:', error);
    });

    this.binanceWs.on('close', () => {
      if (!this.isRunning) return;

      if (this.reconnectAttempts.binance < MAX_RECONNECT_ATTEMPTS) {
        const delay = this.getReconnectDelay('binance');
        this.reconnectAttempts.binance++;
        console.log(`Reconnecting to Binance in ${delay}ms... (Attempt ${this.reconnectAttempts.binance})`);
        setTimeout(() => this.initializeCryptoConnection(pairs), delay);
      } else {
        console.error('Max reconnection attempts reached for Binance');
      }
    });
  }

  private async initializeForexConnection(pairs: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!pairs.length) return resolve();

      const connectWebSocket = () => {
        if (!this.isRunning) return resolve();
        
        this.tradermadeWs = new WebSocket(TRADERMADE_WS_URL);
        console.log('Connecting to TradeMade WebSocket...');

        let connectionTimeout = setTimeout(() => {
          this.tradermadeWs?.close();
          throw new Error('TradeMade WebSocket connection timeout');
        }, 10000);

        this.tradermadeWs.on('open', () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts.tradermade = 0;
          console.log('TradeMade WebSocket connected');
          
          this.subscribeToForexPairs(pairs).then(resolve).catch(reject);
        });

        this.setupForexErrorHandling(pairs);
      };

      connectWebSocket();
    });
  }

  private async subscribeToForexPairs(pairs: any[]) {
    if (!this.tradermadeWs || this.tradermadeWs.readyState !== WebSocket.OPEN) {
      throw new Error('TradeMade WebSocket not ready');
    }

    const symbols = pairs.map(p => p.symbol.replace('FX:', '').replace('/', ''));
    const subscribeMessage = {
      userKey: this.tradermadeApiKey,
      symbol: symbols.join(','),
      _type: "subscribe"
    };

    this.tradermadeWs.send(JSON.stringify(subscribeMessage));
    
    this.tradermadeWs.on('message', async (data) => {
      try {
        const message = data.toString();
        if (!message.startsWith('{')) return;
        
        const parsed = JSON.parse(message);
        if (parsed.symbol && parsed.bid && parsed.ask) {
          const symbol = `FX:${parsed.symbol.slice(0,3)}/${parsed.symbol.slice(3)}`;
          console.log(`Updating forex price for ${symbol}: Bid=${parsed.bid}, Ask=${parsed.ask}`);
          
          const { error } = await supabaseNode.rpc('update_live_price', {
            p_symbol: symbol,
            p_bid_price: parsed.bid,
            p_ask_price: parsed.ask,
            p_source: 'tradermade'
          });

          if (error) {
            console.error(`Error updating price for ${symbol}:`, error);
          }
        }
      } catch (error) {
        console.error('Error handling forex message:', error);
      }
    });

    this.heartbeatInterval = setInterval(() => {
      if (this.tradermadeWs?.readyState === WebSocket.OPEN) {
        this.tradermadeWs.send(JSON.stringify({ heartbeat: "1" }));
      }
    }, 30000);
  }

  private setupForexErrorHandling(pairs: any[]) {
    if (!this.tradermadeWs) return;

    this.tradermadeWs.on('error', (error) => {
      console.error('TradeMade WebSocket error:', error);
    });

    this.tradermadeWs.on('close', () => {
      if (!this.isRunning) return;

      if (this.reconnectAttempts.tradermade < MAX_RECONNECT_ATTEMPTS) {
        const delay = this.getReconnectDelay('tradermade');
        this.reconnectAttempts.tradermade++;
        console.log(`Reconnecting to TradeMade in ${delay}ms... (Attempt ${this.reconnectAttempts.tradermade})`);
        setTimeout(() => this.initializeForexConnection(pairs), delay);
      } else {
        console.error('Max reconnection attempts reached for TradeMade');
      }

      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
    });
  }

  private startPriceChecking() {
    this.priceCheckInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.checkStaleAndUpdatePrices();
      } catch (error) {
        console.error('Error checking stale prices:', error);
      }
    }, 1000);
  }

  private async checkStaleAndUpdatePrices() {
    const { data: prices, error } = await supabaseNode
      .from('live_prices')
      .select('*')
      .lt('last_updated', new Date(Date.now() - 1000).toISOString());

    if (error) throw error;
    if (!prices?.length) return;

    await Promise.all(prices.map(price => this.refreshStalePrice(price)));
  }

  private async refreshStalePrice(price: any) {
    try {
      if (price.source === 'binance' && this.binanceWs?.readyState === WebSocket.OPEN) {
        this.binanceWs.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: [price.symbol.toLowerCase().replace('binance:', '') + '@bookTicker'],
          id: Date.now()
        }));
      }
    } catch (error) {
      console.error(`Error refreshing price for ${price.symbol}:`, error);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.binanceWs) this.binanceWs.close();
    if (this.tradermadeWs) this.tradermadeWs.close();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.priceCheckInterval) clearInterval(this.priceCheckInterval);
  }
}
