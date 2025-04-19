import { supabase } from "@/lib/supabase";

type PriceData = {
  price: string;
  bid?: string;
  ask?: string;
  change: string;
};

type PriceSubscriber = (prices: Record<string, PriceData>) => void;

class WebSocketService {
  private static instance: WebSocketService;
  private cryptoWs: WebSocket | null = null;
  private forexWs: WebSocket | null = null;
  private subscribers = new Set<PriceSubscriber>();
  private prices: Record<string, PriceData> = {};
  private heartbeatInterval?: NodeJS.Timeout;
  private tradermadeApiKey = import.meta.env.VITE_TRADERMADE_API_KEY;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  subscribe(callback: PriceSubscriber) {
    this.subscribers.add(callback);
    callback(this.prices); // Initial prices
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.prices));
  }

  connectCrypto(symbols: string[]) {
    if (this.cryptoWs?.readyState === WebSocket.OPEN) return;

    this.cryptoWs = new WebSocket('wss://stream.binance.com:9443/ws');
    
    this.cryptoWs.onopen = () => {
      if (this.cryptoWs?.readyState === WebSocket.OPEN) {
        this.cryptoWs.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: symbols.map(s => `${s.toLowerCase()}@ticker`),
          id: 1
        }));
      }
    };

    this.cryptoWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === '24hrTicker') {
          const symbol = `BINANCE:${data.s}`;
          this.prices[symbol] = {
            price: data.c,
            bid: data.b,
            ask: data.a,
            change: data.P
          };
          this.notifySubscribers();
        }
      } catch (error) {
        console.error('Error handling crypto message:', error);
      }
    };
  }

  connectForex(symbols: string[]) {
    if (!this.tradermadeApiKey || this.forexWs?.readyState === WebSocket.OPEN) return;

    this.forexWs = new WebSocket('wss://marketdata.tradermade.com/feedadv');

    this.forexWs.onopen = () => {
      if (this.forexWs?.readyState === WebSocket.OPEN) {
        this.forexWs.send(JSON.stringify({
          userKey: this.tradermadeApiKey,
          symbol: symbols.join(','),
          _type: "subscribe"
        }));

        this.heartbeatInterval = setInterval(() => {
          this.forexWs?.readyState === WebSocket.OPEN && 
          this.forexWs.send(JSON.stringify({ heartbeat: "1" }));
        }, 30000);
      }
    };

    this.forexWs.onmessage = (event) => {
      try {
        if (!event.data.startsWith('{')) return;
        const data = JSON.parse(event.data);
        if (data.symbol && data.bid && data.ask) {
          const symbol = `FX:${data.symbol.slice(0,3)}/${data.symbol.slice(3)}`;
          this.prices[symbol] = {
            price: data.mid || data.bid,
            bid: data.bid,
            ask: data.ask,
            change: '0.00'
          };
          this.notifySubscribers();
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          console.error('Error handling forex message:', error);
        }
      }
    };
  }

  disconnect() {
    if (this.cryptoWs?.readyState === WebSocket.OPEN) this.cryptoWs.close();
    if (this.forexWs?.readyState === WebSocket.OPEN) this.forexWs.close();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.prices = {};
    this.subscribers.clear();
  }
}

export const websocketService = WebSocketService.getInstance();
