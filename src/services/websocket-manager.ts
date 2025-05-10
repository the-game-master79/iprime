import { toast } from "@/components/ui/use-toast";
import { isForexTradingTime, getForexMarketStatus } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 30000; // Increase timeout to 30 seconds
const API_KEY_ROTATION_DELAY = 60000;
const MAX_CONNECTION_RETRIES = 3;
const RETRY_DELAY = 2000;

interface PriceData {
  price: string;
  bid: string;
  ask: string;
  change: string;
  timestamp?: string;
  mid?: string;
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

interface Trade {
  id: string;
  pair: string;
  status: 'open' | 'pending' | 'closed';
}

export enum ConnectionMode {
  FULL = 'full',
  MINIMAL = 'minimal',
  SINGLE = 'single'
}

type ConnectionState = {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastError?: string;
  lastAttempt?: number;
};

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
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private apiKeyRetryTimeout: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private connectionState: { [key: string]: ConnectionState } = {
    crypto: { status: 'disconnected' },
    forex: { status: 'disconnected' }
  };
  private apiKeys: string[] = [
    import.meta.env.VITE_TRADERMADE_API_KEY || '',
    import.meta.env.VITE_TRADERMADE_API_KEY_2 || '',
    import.meta.env.VITE_TRADERMADE_API_KEY_3 || ''
  ].filter(Boolean);
  private currentApiKeyIndex = 0;
  private isConnecting = false;
  private forexPairsQueue: Set<string> = new Set();
  private forexSubscriptionTimeout: NodeJS.Timeout | null = null;
  private isForexConnecting: boolean = false;

  private constructor() {
    this.tradermadeApiKey = this.apiKeys[0] || '';
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  subscribe(callback: PriceCallback): () => void {
    this.subscribers.add(callback);
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch trading pairs"
      });
    }
  }

  async watchPairs(pairs: string[], mode: ConnectionMode = ConnectionMode.FULL) {
    if (this.tradingPairs.length === 0) {
      await this.fetchTradingPairs();
    }

    if (mode === ConnectionMode.SINGLE) {
      this.activePairs.clear();
    }

    const validPairs = pairs.filter(pair =>
      this.tradingPairs.some(tp => tp.symbol === pair && tp.is_active)
    );

    switch (mode) {
      case ConnectionMode.FULL:
        validPairs.forEach(pair => this.activePairs.add(pair));
        break;
      case ConnectionMode.MINIMAL:
        validPairs
          .filter(pair =>
            this.activeTrades.some(t => t.pair === pair && ['open', 'pending'].includes(t.status))
          )
          .forEach(pair => this.activePairs.add(pair));
        break;
      case ConnectionMode.SINGLE:
        if (validPairs.length > 0) {
          this.activePairs.add(validPairs[0]);
        }
        break;
    }

    await this.connectToAll();
  }

  private async connectToAll() {
    if (this.isConnecting || 
        this.connectionState.crypto.status === 'connecting' || 
        this.connectionState.forex.status === 'connecting') {
      return;
    }

    this.isConnecting = true;
    try {
      const cryptoPairs = Array.from(this.activePairs).filter(pair =>
        this.tradingPairs.some(tp => tp.symbol === pair && tp.type === 'crypto')
      );
      const forexPairs = Array.from(this.activePairs).filter(pair =>
        this.tradingPairs.some(tp => tp.symbol === pair && tp.type === 'forex')
      );

      const shouldReconnectCrypto = cryptoPairs.length > 0 && 
        (!this.cryptoWs || this.cryptoWs.readyState !== WebSocket.OPEN);
      
      const shouldReconnectForex = forexPairs.length > 0 && 
        (!this.forexWs || this.forexWs.readyState !== WebSocket.OPEN) && 
        isForexTradingTime();

      if (shouldReconnectCrypto) {
        await this.connectCrypto(cryptoPairs);
      }

      if (shouldReconnectForex) {
        await this.connectForex(forexPairs);
      }
    } finally {
      this.isConnecting = false;
    }
  }

  private async connectCrypto(pairs: string[]) {
    let retries = 0;
    
    const tryConnect = async (): Promise<void> => {
      try {
        if (this.cryptoWs) {
          const oldWs = this.cryptoWs;
          this.cryptoWs = null;
          oldWs.onopen = null;
          oldWs.onclose = null;
          oldWs.onerror = null;
          oldWs.onmessage = null;
          if (oldWs.readyState === WebSocket.OPEN) {
            oldWs.close();
          }
        }

        this.setConnectionState('crypto', { status: 'connecting' });
        this.cryptoWs = new WebSocket(BINANCE_WS_URL);

        return new Promise<void>((resolve, reject) => {
          if (!this.cryptoWs) return reject(new Error('No WebSocket instance'));

          let isResolved = false;
          const timeoutId = setTimeout(() => {
            if (!isResolved) {
              isResolved = true;
              this.setConnectionState('crypto', { 
                status: 'error', 
                lastError: 'connection timeout' 
              });
              if (this.cryptoWs) {
                this.cryptoWs.close();
                this.cryptoWs = null;
              }
              reject(new Error('Connection timeout'));
            }
          }, CONNECTION_TIMEOUT);

          this.cryptoWs.onopen = () => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutId);
            
            const symbols = pairs.map(p => p.toLowerCase().replace('binance:', ''));
            this.sendMessage(this.cryptoWs, {
              method: "SUBSCRIBE",
              params: symbols.map(s => `${s}@ticker`),
              id: 1
            });

            this.setupReconnection(this.cryptoWs, 'crypto');
            this.setConnectionState('crypto', { status: 'connected' });
            resolve();
          };

          this.cryptoWs.onerror = (err) => {
            if (isResolved) return;
            isResolved = true;
            clearTimeout(timeoutId);
            this.setConnectionState('crypto', { 
              status: 'error', 
              lastError: err.type 
            });
            reject(err);
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
              console.warn('Error processing crypto message:', error);
            }
          };
        });
      } catch (error) {
        if (retries < MAX_CONNECTION_RETRIES) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return tryConnect();
        }
        throw error;
      }
    };

    return tryConnect();
  }

  private async connectForex(pairs: string[]) {
    if (this.isForexConnecting) {
      // Add pairs to queue and wait for current connection
      pairs.forEach(pair => this.forexPairsQueue.add(pair));
      return;
    }

    try {
      this.isForexConnecting = true;
      if (this.forexWs) {
        const oldWs = this.forexWs;
        this.forexWs = null;
        oldWs.onopen = null;
        oldWs.onclose = null;
        oldWs.onerror = null;
        oldWs.onmessage = null;
        if (oldWs.readyState === WebSocket.OPEN) {
          oldWs.close();
        }
      }

      // Add new pairs to queue
      pairs.forEach(pair => this.forexPairsQueue.add(pair));

      this.setConnectionState('forex', { status: 'connecting' });
      const apiKey = this.getCurrentApiKey();
      if (!apiKey) throw new Error('No API key available');

      this.forexWs = new WebSocket(TRADERMADE_WS_URL);

      await new Promise<void>((resolve, reject) => {
        if (!this.forexWs) return reject(new Error('No WebSocket instance'));

        const timeoutId = setTimeout(() => {
          this.setConnectionState('forex', { 
            status: 'error', 
            lastError: 'connection timeout' 
          });
          reject(new Error('Connection timeout'));
        }, CONNECTION_TIMEOUT);

        this.forexWs.onopen = () => {
          clearTimeout(timeoutId);
          this.processForexQueue();
          this.setupHeartbeat();
          this.setupReconnection(this.forexWs, 'forex');
          this.setConnectionState('forex', { status: 'connected' });
          resolve();
        };

        this.setupForexMessageHandler();
      });

    } catch (error) {
      this.isForexConnecting = false;
      throw error;
    }
  }

  private processForexQueue = () => {
    if (this.forexSubscriptionTimeout) {
      clearTimeout(this.forexSubscriptionTimeout);
    }

    this.forexSubscriptionTimeout = setTimeout(() => {
      const queuedPairs = Array.from(this.forexPairsQueue);
      if (queuedPairs.length > 0 && this.forexWs?.readyState === WebSocket.OPEN) {
        const symbols = queuedPairs.map(p => p.replace('FX:', '').replace('/', ''));
        
        this.sendMessage(this.forexWs, {
          userKey: this.getCurrentApiKey(),
          symbol: symbols.join(','),
          _type: "subscribe"
        });

        this.forexPairsQueue.clear();
      }
      this.isForexConnecting = false;
    }, 100); // Small delay to batch subscriptions
  };

  private setupForexMessageHandler() {
    if (!this.forexWs) return;

    this.forexWs.onmessage = async (event) => {
      try {
        const message = event.data.toString();
        
        if (message.includes('User Key Used')) {
          this.rotateApiKey();
          await this.connectForex(Array.from(this.forexPairsQueue));
          return;
        }

        if (!message.startsWith('{')) return;
        
        const data = JSON.parse(message);
        if (data.symbol && data.bid && data.ask) {
          const symbol = `FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`;
          this.updatePrice(symbol, {
            price: data.mid || ((Number(data.bid) + Number(data.ask)) / 2).toString(),
            bid: data.bid.toString(),
            ask: data.ask.toString(),
            change: '0.00',
            timestamp: data.ts,
            mid: data.mid?.toString()
          });
        }
      } catch (error) {
        console.error('Error handling forex message:', error);
      }
    };
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.forexWs?.readyState === WebSocket.OPEN) {
        this.sendMessage(this.forexWs, { heartbeat: "1" });
      }
    }, HEARTBEAT_INTERVAL);
  }

  private setupReconnection(ws: WebSocket, type: 'crypto' | 'forex') {
    ws.onerror = (error) => console.error(`${type} WebSocket error:`, error);
    ws.onclose = () => {
      this.setConnectionState(type, { status: 'disconnected' });

      if (this.reconnectAttempts[type] < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts[type]++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts[type]), 30000);
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.connectToAll();
        }, delay);
      }
    };
  }

  private sendMessage(ws: WebSocket | null, message: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private setConnectionState(type: 'crypto' | 'forex', state: Partial<ConnectionState>) {
    this.connectionState[type] = {
      ...this.connectionState[type],
      ...state,
      lastAttempt: Date.now()
    };
  }

  private async connectWithTimeout(ws: WebSocket, type: 'crypto' | 'forex'): Promise<void> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        ws.onopen = null;
        ws.onerror = null;
      };

      timeoutId = setTimeout(() => {
        cleanup();
        this.setConnectionState(type, { status: 'error', lastError: 'connection timeout' });
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        cleanup();
        resolve();
      };

      ws.onerror = (err) => {
        cleanup();
        this.setConnectionState(type, { status: 'error', lastError: err.type });
        reject(new Error(`WebSocket ${type} connection error: ${err.type}`));
      };
    });
  }

  private getCurrentApiKey(): string {
    return this.apiKeys[this.currentApiKeyIndex];
  }

  private rotateApiKey() {
    this.currentApiKeyIndex = (this.currentApiKeyIndex + 1) % this.apiKeys.length;
    if (this.apiKeyRetryTimeout) clearTimeout(this.apiKeyRetryTimeout);
    this.apiKeyRetryTimeout = setTimeout(() => {
      this.currentApiKeyIndex = 0;
    }, API_KEY_ROTATION_DELAY);
  }

  private updatePrice(symbol: string, data: PriceData) {
    const pairInfo = this.tradingPairs.find(p => p.symbol === symbol);
    if (pairInfo) {
      const enriched = {
        ...data,
        pipValue: pairInfo.pip_value,
        lotSize: pairInfo.min_lots
      };
      this.lastPrices[symbol] = enriched;
      this.notifySubscribers(symbol, enriched);
    }
  }

  public setActiveTrades(trades: Trade[]) {
    this.activeTrades = trades;
  }

  public onLiquidation(callback: (tradeId: string) => void) {
    this.liquidationCallbacks.push(callback);
  }

  unwatchPairs(pairs: string[]) {
    const remainingPairs = new Set(this.activePairs);
    pairs.forEach(pair => remainingPairs.delete(pair));

    if (remainingPairs.size === 0) {
      // Only disconnect if we have no remaining pairs
      this.disconnect();
    } else {
      // Update active pairs and reconnect with remaining pairs
      this.activePairs = remainingPairs;
      this.connectToAll().catch(console.error);
    }
  }

  disconnect() {
    this.isConnecting = false;

    // Clear all timeouts and intervals first
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.apiKeyRetryTimeout) {
      clearTimeout(this.apiKeyRetryTimeout);
      this.apiKeyRetryTimeout = null;
    }

    // Helper function to safely close a WebSocket
    const safeCloseWebSocket = (ws: WebSocket | null) => {
      if (!ws) return;
      
      try {
        const socket = ws;
        // Remove all listeners first
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.onopen = null;
        
        if (socket.readyState === WebSocket.OPEN || 
            socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }
      } catch (err) {
        console.warn('Error closing websocket:', err);
      }
    };

    // Close connections
    safeCloseWebSocket(this.cryptoWs);
    safeCloseWebSocket(this.forexWs);
    
    // Clear references
    this.cryptoWs = null;
    this.forexWs = null;

    // Reset state
    this.activePairs.clear();
    this.lastPrices = {};
    this.reconnectAttempts = { crypto: 0, forex: 0 };
    
    // Update connection states
    this.setConnectionState('crypto', { status: 'disconnected' });
    this.setConnectionState('forex', { status: 'disconnected' });
  }

  private async subscribeToCryptoPairs(pairs: string[]) {
    if (!this.binanceWs || this.binanceWs.readyState !== WebSocket.OPEN) {
      throw new Error('Binance WebSocket not ready');
    }

    const symbols = pairs.map(p => p.toLowerCase().replace('binance:', ''));
    
    // Subscribe to both ticker and bookTicker for more accurate data
    this.sendMessage(this.binanceWs, {
      method: "SUBSCRIBE",
      params: [
        ...symbols.map(s => `${s}@ticker`),
        ...symbols.map(s => `${s}@bookTicker`)
      ],
      id: Date.now()
    });

    this.binanceWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        let priceUpdate;

        if (data.e === '24hrTicker') {
          // Handle ticker data
          priceUpdate = {
            symbol: `BINANCE:${data.s}`,
            price: data.c,
            bid: data.b,
            ask: data.a,
            change: data.P
          };
        } else if (data.e === 'bookTicker') {
          // Handle real-time book ticker data
          priceUpdate = {
            symbol: `BINANCE:${data.s}`,
            price: data.b, // Use bid as reference price
            bid: data.b,
            ask: data.a,
            change: this.lastPrices[`BINANCE:${data.s}`]?.change || '0.00'
          };
        }

        if (priceUpdate) {
          this.updatePrice(priceUpdate.symbol, priceUpdate);
        }
      } catch (error) {
        console.warn('Error processing crypto message:', error);
      }
    };
  }

  private async subscribeToForexPairs(pairs: string[]) {
    if (!this.tradermadeWs || this.tradermadeWs.readyState !== WebSocket.OPEN) {
      throw new Error('TradeMade WebSocket not ready');
    }

    const symbols = pairs.map(p => p.replace('FX:', '').replace('/', ''));
    
    // Send subscription message with proper formatting
    this.sendMessage(this.tradermadeWs, {
      userKey: this.getCurrentApiKey(),
      symbol: symbols.join(','),
      _type: "subscribe"
    });

    this.tradermadeWs.onmessage = async (event) => {
      try {
        const message = event.data.toString();
        
        // Handle connection confirmation
        if (message.includes('"connected":"connected"')) {
          console.log('TradeMade WebSocket connected successfully');
          return;
        }

        // Handle API key rotation message
        if (message.includes('User Key Used')) {
          console.log('TradeMade API key rotation needed');
          await this.rotateApiKeyAndReconnect(pairs);
          return;
        }

        if (!message.startsWith('{')) return;
        
        const data = JSON.parse(message);
        if (data.symbol && data.bid && data.ask) {
          const symbol = `FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`;
          const priceUpdate = {
            symbol,
            price: data.mid || data.bid,
            bid: data.bid,
            ask: data.ask,
            change: '0.00'
          };
          
          this.updatePrice(symbol, priceUpdate);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          console.error('Error handling forex message:', error);
        }
      }
    };
  }

  private async rotateApiKeyAndReconnect(pairs: string[]) {
    this.rotateApiKey();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    await this.connectForex(pairs);
  }
}

export const wsManager = WebSocketManager.getInstance();
