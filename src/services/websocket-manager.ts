import { toast } from "@/components/ui/use-toast";
import { isForexTradingTime, getForexMarketStatus } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const HEARTBEAT_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 10000;
const API_KEY_ROTATION_DELAY = 60000;

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
    if (this.connectionState.crypto.status === 'connecting' || this.connectionState.forex.status === 'connecting') {
      return;
    }

    const cryptoPairs = Array.from(this.activePairs).filter(pair =>
      this.tradingPairs.some(tp => tp.symbol === pair && tp.type === 'crypto')
    );
    const forexPairs = Array.from(this.activePairs).filter(pair =>
      this.tradingPairs.some(tp => tp.symbol === pair && tp.type === 'forex')
    );

    if (cryptoPairs.length > 0 && (!this.cryptoWs || this.cryptoWs.readyState > WebSocket.OPEN)) {
      this.connectCrypto(cryptoPairs);
    }

    if (forexPairs.length > 0 && (!this.forexWs || this.forexWs.readyState > WebSocket.OPEN) && isForexTradingTime()) {
      await this.connectForex(forexPairs);
    }
  }

  private connectCrypto(pairs: string[]) {
    if (this.cryptoWs) this.cryptoWs.close();

    this.setConnectionState('crypto', { status: 'connecting' });
    this.cryptoWs = new WebSocket(BINANCE_WS_URL);

    const symbols = pairs.map(p => p.toLowerCase().replace('binance:', ''));

    this.cryptoWs.onopen = () => {
      this.sendMessage(this.cryptoWs, {
        method: "SUBSCRIBE",
        params: symbols.map(s => `${s}@ticker`),
        id: 1
      });
      this.setConnectionState('crypto', { status: 'connected' });
    };

    this.cryptoWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === '24hrTicker') {
        this.updatePrice(`BINANCE:${data.s}`, {
          price: data.c,
          bid: data.b,
          ask: data.a,
          change: data.P
        });
      }
    };

    this.setupReconnection(this.cryptoWs, 'crypto');
  }

  private async connectForex(pairs: string[]) {
    if (this.forexWs) this.forexWs.close();

    this.setConnectionState('forex', { status: 'connecting' });

    const apiKey = this.getCurrentApiKey();
    if (!apiKey) {
      this.setConnectionState('forex', { status: 'error', lastError: 'No API key' });
      return;
    }

    this.forexWs = new WebSocket(TRADERMADE_WS_URL);
    await this.connectWithTimeout(this.forexWs, 'forex');

    this.forexWs.onmessage = async (event) => {
      if (event.data.includes('User Key Used')) {
        this.rotateApiKey();
        await this.connectForex(pairs);
        return;
      }

      if (typeof event.data === 'string' && !event.data.startsWith('{')) return;

      const data = JSON.parse(event.data);
      if (data.symbol && data.bid && data.ask) {
        const symbol = `FX:${data.symbol.slice(0, 3)}/${data.symbol.slice(3)}`;
        this.updatePrice(symbol, {
          price: data.bid,
          bid: data.bid,
          ask: data.ask,
          change: '0.00'
        });
      }
    };

    this.sendMessage(this.forexWs, { userKey: apiKey, _type: "init" });

    const symbols = pairs.map(p => p.replace('FX:', '').replace('/', ''));
    for (let i = 0; i < symbols.length; i += 10) {
      const batch = symbols.slice(i, i + 10);
      await new Promise(resolve => setTimeout(() => {
        this.sendMessage(this.forexWs, {
          userKey: apiKey,
          symbol: batch.join(','),
          _type: "subscribe"
        });
        resolve(true);
      }, 100));
    }

    this.setupHeartbeat();
    this.setConnectionState('forex', { status: 'connected' });
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
      const timeout = setTimeout(() => {
        this.setConnectionState(type, { status: 'error', lastError: 'timeout' });
        reject(new Error('Timeout'));
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve();
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        reject(err);
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
    pairs.forEach(pair => this.activePairs.delete(pair));
    if (this.activePairs.size === 0) {
      this.disconnect();
    } else {
      this.connectToAll();
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.isReconnecting = false;

    if (this.cryptoWs) {
      this.cryptoWs.close();
      this.cryptoWs = null;
    }

    if (this.forexWs) {
      this.forexWs.close();
      this.forexWs = null;
    }

    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    this.activePairs.clear();
    this.lastPrices = {};
    this.reconnectAttempts = { crypto: 0, forex: 0 };

    this.setConnectionState('crypto', { status: 'disconnected' });
    this.setConnectionState('forex', { status: 'disconnected' });
  }
}

export const wsManager = WebSocketManager.getInstance();
