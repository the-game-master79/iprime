import { toast } from "@/components/ui/use-toast";
import { isForexTradingTime, getForexMarketStatus } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const HEARTBEAT_INTERVAL = 30000;
const PERFORMANCE_THRESHOLD = 100; // ms
const CONNECTION_TIMEOUT = 10000; // 10s timeout
const HEALTH_CHECK_INTERVAL = 10000; // 10s health check
const CONNECTION_QUEUE_DELAY = 100; // 100ms between connection attempts
const VISIBILITY_RECONNECT_DELAY = 1000; // 1s delay before reconnecting on visibility change

interface PriceData {
  price: string;
  bid: string;
  ask: string;
  change: string;
  timestamp?: number;
  latency?: number;
  source?: 'binance' | 'tradermade';
  status?: 'active' | 'stale' | 'closed';
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface ConnectionStats {
  messageCount: number;
  errorCount: number;
  avgLatency: number;
  lastUpdate: number;
  state: ConnectionState;
}

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

type PriceCallback = (symbol: string, data: PriceData) => void;
type StatusChangeCallback = (stats: Record<'crypto' | 'forex', ConnectionStats>) => void;

interface ConnectionQueue {
  type: 'crypto' | 'forex';
  pairs: string[];
  resolve: () => void;
  reject: (error: Error) => void;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private cryptoWs: WebSocket | null = null;
  private forexWs: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStats: Record<'crypto' | 'forex', ConnectionStats> = {
    crypto: this.createDefaultStats(),
    forex: this.createDefaultStats()
  };
  private statusSubscribers = new Set<StatusChangeCallback>();
  private subscribers = new Set<PriceCallback>();
  private reconnectAttempts = { crypto: 0, forex: 0 };
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private activePairs = new Set<string>();
  private tradermadeApiKey: string;
  private lastPrices: Record<string, PriceData> = {};
  private activeTrades: Trade[] = [];
  private liquidationCallbacks: ((tradeId: string) => void)[] = [];
  private tradingPairs: TradingPair[] = [];
  private connectionQueue: ConnectionQueue[] = [];
  private isProcessingQueue = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private pageVisible: boolean = true;
  private persistentPairs = new Set<string>();
  private subscriptionCache: Record<string, PriceData> = {};

  private constructor() {
    this.tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY || '';
    this.setupHealthCheck();
    this.setupVisibilityHandler();
  }

  private setupHealthCheck() {
    this.healthCheckInterval = setInterval(() => {
      this.checkConnections();
    }, HEALTH_CHECK_INTERVAL);
  }

  private checkConnections() {
    ['crypto', 'forex'].forEach((type: 'crypto' | 'forex') => {
      const ws = type === 'crypto' ? this.cryptoWs : this.forexWs;
      if (ws && ws.readyState !== WebSocket.OPEN && this.activePairs.size > 0) {
        this.handleConnectionError(type as 'crypto' | 'forex');
      }
    });
  }

  private createDefaultStats(): ConnectionStats {
    return {
      messageCount: 0,
      errorCount: 0,
      avgLatency: 0,
      lastUpdate: Date.now(),
      state: 'disconnected'
    };
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

  public onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusSubscribers.add(callback);
    // Send initial status
    callback(this.connectionStats);
    return () => this.statusSubscribers.delete(callback);
  }

  public offStatusChange(callback: StatusChangeCallback): void {
    this.statusSubscribers.delete(callback);
  }

  private notifyStatusChange(): void {
    this.statusSubscribers.forEach(callback => callback(this.connectionStats));
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

  private async processConnectionQueue() {
    if (this.isProcessingQueue || this.connectionQueue.length === 0) return;

    this.isProcessingQueue = true;
    
    while (this.connectionQueue.length > 0) {
      const item = this.connectionQueue.shift();
      if (!item) continue;

      try {
        if (item.type === 'crypto') {
          await this.connectCryptoWithTimeout(item.pairs);
        } else {
          await this.connectForexWithTimeout(item.pairs);
        }
        item.resolve();
      } catch (error) {
        item.reject(error as Error);
        this.handleConnectionError(item.type);
      }

      // Add delay between connections
      await new Promise(resolve => setTimeout(resolve, CONNECTION_QUEUE_DELAY));
    }

    this.isProcessingQueue = false;
  }

  private connectCryptoWithTimeout(pairs: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Crypto connection timeout'));
      }, CONNECTION_TIMEOUT);

      try {
        this.connectCrypto(pairs);
        clearTimeout(timeout);
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private connectForexWithTimeout(pairs: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Forex connection timeout'));
      }, CONNECTION_TIMEOUT);

      try {
        this.connectForex(pairs);
        clearTimeout(timeout);
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private setupVisibilityHandler() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        const isVisible = document.visibilityState === 'visible';
        this.pageVisible = isVisible;
        
        if (isVisible && this.persistentPairs.size > 0) {
          // Reconnect with delay to avoid race conditions
          setTimeout(() => this.reconnectIfNeeded(), VISIBILITY_RECONNECT_DELAY);
        }
      });
    }
  }

  // Override watchPairs to support persistence
  async watchPairs(pairs: string[], persistent: boolean = false) {
    if (persistent) {
      pairs.forEach(pair => this.persistentPairs.add(pair));
    }
    
    // Cache existing prices before reconnecting
    Object.entries(this.lastPrices).forEach(([symbol, data]) => {
      this.subscriptionCache[symbol] = data;
    });

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

    // Queue connections instead of connecting directly
    if (groupedPairs.crypto.length > 0) {
      this.connectionQueue.push({
        type: 'crypto',
        pairs: groupedPairs.crypto,
        resolve: () => {},
        reject: (error) => console.error('Crypto connection failed:', error)
      });
    }

    // Only connect to forex if market is open
    if (groupedPairs.forex.length > 0 && isForexTradingTime()) {
      this.connectionQueue.push({
        type: 'forex',
        pairs: groupedPairs.forex,
        resolve: () => {},
        reject: (error) => console.error('Forex connection failed:', error)
      });
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

    this.processConnectionQueue();
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
    this.connectionStats[type].state = 'error';
    this.notifyStatusChange();
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
      this.connectionStats[type].state = 'disconnected';
      this.notifyStatusChange();
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

  // Override disconnect to respect persistent pairs
  disconnect() {
    if (this.persistentPairs.size > 0) {
      // Only disconnect non-persistent pairs
      const pairsToDisconnect = Array.from(this.activePairs)
        .filter(pair => !this.persistentPairs.has(pair));
      
      if (pairsToDisconnect.length > 0) {
        this.unwatchPairs(pairsToDisconnect);
      }
      return;
    }

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

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.connectionQueue = [];
    this.isProcessingQueue = false;
    this.activePairs.clear();
    this.lastPrices = {};
    this.reconnectAttempts = { crypto: 0, forex: 0 };
  }

  // Add method to remove persistent pairs
  unwatchPersistentPairs(pairs: string[]) {
    pairs.forEach(pair => this.persistentPairs.delete(pair));
    this.unwatchPairs(pairs);
  }

  // Override updatePrice to cache prices
  private updatePrice(symbol: string, data: PriceData) {
    const startTime = performance.now();
    const pairInfo = this.getPairInfo(symbol);
    
    if (!pairInfo || !this.validatePriceData(data)) {
      console.warn(`Invalid price data received for ${symbol}`, data);
      return;
    }

    const enrichedData = {
      ...data,
      timestamp: Date.now(),
      latency: performance.now() - startTime,
      pipValue: pairInfo.pip_value,
      lotSize: pairInfo.min_lots,
      status: this.getPriceStatus(pairInfo.type)
    };

    this.lastPrices[symbol] = enrichedData;
    this.subscriptionCache[symbol] = enrichedData;
    this.updateConnectionStats(pairInfo.type, enrichedData.latency);
    this.notifySubscribers(symbol, enrichedData);
    this.checkLiquidations(symbol, parseFloat(data.bid));
  }

  private getPriceStatus(type: 'crypto' | 'forex'): 'active' | 'stale' | 'closed' {
    if (type === 'forex' && !isForexTradingTime()) {
      return 'closed';
    }
    const stats = this.connectionStats[type];
    return Date.now() - stats.lastUpdate > 5000 ? 'stale' : 'active';
  }

  public getConnectionStats(): Record<'crypto' | 'forex', ConnectionStats> {
    return { ...this.connectionStats };
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

  private reconnectIfNeeded() {
    if (!this.pageVisible) return;

    if (this.activePairs.size === 0 && this.persistentPairs.size === 0) {
      this.disconnect();
      return;
    }

    // Restore cached prices
    Object.entries(this.subscriptionCache).forEach(([symbol, data]) => {
      if (this.activePairs.has(symbol) || this.persistentPairs.has(symbol)) {
        this.notifySubscribers(symbol, {
          ...data,
          status: 'stale'
        });
      }
    });

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

  private validatePriceData(data: PriceData): boolean {
    return !!(
      data.price && 
      !isNaN(parseFloat(data.price)) &&
      data.bid && 
      !isNaN(parseFloat(data.bid)) &&
      data.ask && 
      !isNaN(parseFloat(data.ask))
    );
  }

  private updateConnectionStats(type: 'crypto' | 'forex', latency: number): void {
    const stats = this.connectionStats[type];
    stats.messageCount++;
    stats.avgLatency = 
      (stats.avgLatency * (stats.messageCount - 1) + latency) / stats.messageCount;
    stats.lastUpdate = Date.now();
    this.notifyStatusChange(); // Add status notification
  }
}

export const wsManager = WebSocketManager.getInstance();
