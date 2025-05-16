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
  private ws: WebSocket | null = null; // Unified WebSocket connection
  private subscribers = new Set<PriceSubscriber>();
  private prices: Record<string, PriceData> = {};
  private heartbeatInterval?: NodeJS.Timeout;

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

  connect(symbols: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket('wss://transfers.cloudforex.club/ws');

    this.ws.onopen = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: symbols.map(s => `${s.toLowerCase()}@ticker`),
          id: 1
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === '24hrTicker') {
          // Process price updates
          const symbol = data.s.toUpperCase();
          this.prices[symbol] = {
            price: data.c,
            bid: data.b,
            ask: data.a,
            change: data.P,
            timestamp: new Date().toISOString()
          };
          this.notifySubscribers();
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket closed. Reconnecting...');
      setTimeout(() => this.connect(symbols), 5000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.close();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.prices = {};
    this.subscribers.clear();
  }
}

export const websocketService = WebSocketService.getInstance();
