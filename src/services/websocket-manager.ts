import { toast } from "@/components/ui/use-toast";
import { isForexTradingTime, getForexMarketStatus } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const HEARTBEAT_INTERVAL = 30000;

interface PriceData {
  price: string;
  bid: string;
  ask: string;
  change: string;
}

type PriceCallback = (symbol: string, data: PriceData) => void;

interface TradingPair {
  symbol: string;
  type: 'crypto' | 'forex';
  name: string;
  is_active: boolean;
  pip_value: number;
  min_lots: number;
  max_lots: number;
  base_currency: string;
  quote_currency: string;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private cryptoWs: WebSocket | null = null;
  private forexWs: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscribers = new Set<PriceCallback>();
  private reconnectAttempts = { crypto: 0, forex: 0 };
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private activePairs = new Set<string>();
  private tradermadeApiKey: string;
  private lastPrices: Record<string, PriceData> = {};
  private activeTrades: Trade[] = [];
  private liquidationCallbacks: ((tradeId: string) => void)[] = [];
  private tradingPairs: TradingPair[] = [];

  private constructor() {
    this.tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY || '';
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  subscribe(callback: PriceCallback): () => void {
    this.subscribers.add(callback);
    // Send last known prices to new subscriber
    Object.entries(this.lastPrices).forEach(([symbol, data]) => {
      callback(symbol, data);
    });
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(symbol: string, data: PriceData) {
    this.subscribers.forEach(callback => callback(symbol, data));
  }

  private async fetchTradingPairs(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      this.tradingPairs = data;
    } catch (error) {
      console.error('Error fetching trading pairs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch trading pairs"
      });
    }
  }

  async watchPairs(pairs: string[]) {
    // Fetch trading pairs if not already loaded
    if (this.tradingPairs.length === 0) {
      await this.fetchTradingPairs();
    }

    // Filter pairs based on database info
    const validPairs = pairs.filter(pair => 
      this.tradingPairs.some(tp => tp.symbol === pair && tp.is_active)
    );

    validPairs.forEach(pair => this.activePairs.add(pair));

    // Group pairs by type
    const groupedPairs = validPairs.reduce((acc, pair) => {
      const pairInfo = this.tradingPairs.find(tp => tp.symbol === pair);
      if (pairInfo) {
        acc[pairInfo.type].push(pair);
      }
      return acc;
    }, { crypto: [] as string[], forex: [] as string[] });

    if (groupedPairs.crypto.length > 0) {
      this.connectCrypto(groupedPairs.crypto);
    }

    // Only connect to forex if market is open
    if (groupedPairs.forex.length > 0 && isForexTradingTime()) {
      this.connectForex(groupedPairs.forex);
    } else if (groupedPairs.forex.length > 0) {
      const { message } = getForexMarketStatus();
      console.log('Forex market closed:', message);
      // Notify subscribers about closed market status
      groupedPairs.forex.forEach(pair => {
        if (this.lastPrices[pair]) {
          this.notifySubscribers(pair, {
            ...this.lastPrices[pair],
            marketClosed: true
          });
        }
      });
    }
  }

  getPairInfo(symbol: string): TradingPair | undefined {
    return this.tradingPairs.find(p => p.symbol === symbol);
  }

  private sendMessage(ws: WebSocket | null, message: any, retry = 3): void {
    if (!ws) return;

    const tryToSend = (attemptsLeft: number) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        } else if (ws.readyState === WebSocket.CONNECTING && attemptsLeft > 0) {
          // Wait for connection and retry
          setTimeout(() => tryToSend(attemptsLeft - 1), 100);
        } else {
          console.error('WebSocket not in OPEN state:', ws.readyState);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        if (attemptsLeft > 0) {
          setTimeout(() => tryToSend(attemptsLeft - 1), 100);
        }
      }
    };

    tryToSend(retry);
  }

  private connectCrypto(pairs: string[]) {
    if (this.cryptoWs?.readyState === WebSocket.OPEN) return;

    try {
      this.cryptoWs = new WebSocket(BINANCE_WS_URL);
      const symbols = pairs.map(p => p.toLowerCase().replace('binance:', ''));

      this.cryptoWs.onopen = () => {
        try {
          const subscribeMsg = {
            method: "SUBSCRIBE",
            params: symbols.map(s => `${s}@ticker`),
            id: 1
          };
          this.sendMessage(this.cryptoWs, subscribeMsg);
          this.reconnectAttempts.crypto = 0;
        } catch (error) {
          console.error('Error in crypto onopen handler:', error);
          this.handleConnectionError('crypto');
        }
      };

      this.cryptoWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === '24hrTicker') {
            this.updatePrice(`BINANCE:${data.s}`, {
              price: data.c,
              bid: data.b,
              ask: data.a,
              change: data.P
            });
          }
        } catch (error) {
          console.error('Error handling crypto message:', error);
        }
      };

      this.setupReconnection(this.cryptoWs, 'crypto');
    } catch (error) {
      console.error('Error creating crypto WebSocket:', error);
      this.handleConnectionError('crypto');
    }
  }

  private connectForex(pairs: string[]) {
    if (!this.tradermadeApiKey || this.forexWs?.readyState === WebSocket.OPEN) return;
    
    // Double check market is open before connecting
    if (!isForexTradingTime()) {
      const { message } = getForexMarketStatus();
      console.log('Forex market closed:', message);
      return;
    }

    try {
      this.forexWs = new WebSocket(TRADERMADE_WS_URL);
      const symbols = pairs.map(p => p.replace('FX:', '').replace('/', ''));

      this.forexWs.onopen = () => {
        try {
          // Initialize connection
          this.sendMessage(this.forexWs, {
            userKey: this.tradermadeApiKey,
            _type: "init"
          });

          // Subscribe in batches of 10 with proper delay
          symbols.reduce((promise, _, index) => {
            if (index % 10 === 0) {
              const batch = symbols.slice(index, index + 10);
              return promise.then(() => new Promise(resolve => {
                setTimeout(() => {
                  this.sendMessage(this.forexWs, {
                    userKey: this.tradermadeApiKey,
                    symbol: batch.join(','),
                    _type: "subscribe"
                  });
                  resolve(true);
                }, 100);
              }));
            }
            return promise;
          }, Promise.resolve());

          this.setupHeartbeat();
          this.reconnectAttempts.forex = 0;
        } catch (error) {
          console.error('Error in forex onopen handler:', error);
          this.handleConnectionError('forex');
        }
      };

      this.forexWs.onmessage = (event) => {
        try {
          if (typeof event.data === 'string' && !event.data.startsWith('{')) return;
          const data = JSON.parse(event.data);
          if (data.symbol && data.bid && data.ask) {
            const symbol = `FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`;
            this.updatePrice(symbol, {
              price: data.bid,
              bid: data.bid,
              ask: data.ask,
              change: '0.00' // TradeMade doesn't provide change percentage
            });
          }
        } catch (error) {
          console.error('Error handling forex message:', error);
        }
      };

      this.setupReconnection(this.forexWs, 'forex');
    } catch (error) {
      console.error('Error creating forex WebSocket:', error);
      this.handleConnectionError('forex');
    }
  }

  private handleConnectionError(type: 'crypto' | 'forex') {
    if (this.reconnectAttempts[type] < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts[type]++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts[type]), 30000);
      setTimeout(() => this.connectToAll(), delay);
    } else {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: `Failed to connect to ${type} feed after multiple attempts. Please check your internet connection.`
      });
    }
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      try {
        if (this.forexWs?.readyState === WebSocket.OPEN) {
          this.sendMessage(this.forexWs, { heartbeat: "1" });
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private setupReconnection(ws: WebSocket, type: 'crypto' | 'forex') {
    ws.onerror = (error) => {
      console.error(`${type} WebSocket error:`, error);
    };

    ws.onclose = () => {
      if (this.reconnectAttempts[type] < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts[type]++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts[type]), 30000);
        setTimeout(() => this.connectToAll(), delay);
      } else {
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: `Failed to connect to ${type} feed after multiple attempts`
        });
      }
    };
  }

  unwatchPairs(pairs: string[]) {
    // Remove pairs from active pairs set
    pairs.forEach(pair => this.activePairs.delete(pair));

    // Store last known prices before disconnecting
    const lastKnownPrices = { ...this.lastPrices };

    // If no more active pairs, disconnect completely
    if (this.activePairs.size === 0) {
      this.disconnect();
      return;
    }

    // Otherwise reconnect with remaining pairs
    this.connectToAll();

    // Restore last known prices for disconnected pairs
    pairs.forEach(pair => {
      if (lastKnownPrices[pair]) {
        this.notifySubscribers(pair, {
          ...lastKnownPrices[pair],
          disconnected: true
        });
      }
    });
  }

  disconnect() {
    // Close websocket connections
    if (this.cryptoWs) {
      this.cryptoWs.close();
      this.cryptoWs = null;
    }
    if (this.forexWs) {
      this.forexWs.close(); 
      this.forexWs = null;
    }

    // Clear intervals and state
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.activePairs.clear();
    this.lastPrices = {};
    this.reconnectAttempts = { crypto: 0, forex: 0 };
  }

  private reconnectIfNeeded() {
    if (this.activePairs.size === 0) {
      this.disconnect();
      return;
    }
    this.connectToAll();
  }

  private connectToAll() {
    const cryptoPairs = Array.from(this.activePairs).filter(pair =>
      this.tradingPairs.some(tp => tp.symbol === pair && tp.type === 'crypto')
    );
    const forexPairs = Array.from(this.activePairs).filter(pair =>
      this.tradingPairs.some(tp => tp.symbol === pair && tp.type === 'forex')
    );

    if (cryptoPairs.length > 0) {
      this.connectCrypto(cryptoPairs);
    }

    if (forexPairs.length > 0 && isForexTradingTime()) {
      this.connectForex(forexPairs);
    }
  }

  // Update price update handler to include pip values
  private updatePrice(symbol: string, data: PriceData) {
    const pairInfo = this.getPairInfo(symbol);
    if (pairInfo) {
      const enrichedData = {
        ...data,
        pipValue: pairInfo.pip_value,
        lotSize: pairInfo.min_lots
      };
      this.lastPrices[symbol] = enrichedData;
      this.notifySubscribers(symbol, enrichedData);
    }
  }

  public setActiveTrades(trades: Trade[]) {
    this.activeTrades = trades;
  }

  public onLiquidation(callback: (tradeId: string) => void) {
    this.liquidationCallbacks.push(callback);
  }

  private async checkLiquidations(symbol: string, price: number) {
    const trades = this.activeTrades.filter(t => 
      t.pair === symbol && 
      t.status === 'open'
    );

    for (const trade of trades) {
      try {
        const { data, error } = await supabase.rpc('check_liquidation', {
          p_trade_id: trade.id,
          p_current_price: price
        });

        if (!error && data) {
          // Notify subscribers if trade was liquidated
          this.liquidationCallbacks.forEach(cb => cb(trade.id));
        }
      } catch (error) {
        console.error('Error checking liquidation:', error);
      }
    }
  }

  protected handlePriceUpdate(symbol: string, priceData: PriceData) {
    const price = parseFloat(priceData.bid);
    this.checkLiquidations(symbol, price);
  }
}

export const wsManager = WebSocketManager.getInstance();
