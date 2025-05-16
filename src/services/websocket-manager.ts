import { toast } from "@/components/ui/use-toast";

const WS_URL = 'wss://transfers.cloudforex.club/ws';

interface PriceData {
  price: string;
  bid: string;
  ask: string;
  change: string;
  timestamp?: string;
  mid?: string;
}

type PriceCallback = (symbol: string, data: PriceData) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscribers = new Set<PriceCallback>();
  private lastPrices: Record<string, PriceData> = {};

  private constructor() {}

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

  async connect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.symbol && data.price) {
            this.updatePrice(data.symbol, {
              price: data.price,
              bid: data.bid,
              ask: data.ask,
              change: data.change,
              timestamp: data.timestamp,
              mid: data.mid
            });
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to WebSocket"
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.lastPrices = {};
    this.subscribers.clear();
  }

  private updatePrice(symbol: string, data: PriceData) {
    this.lastPrices[symbol] = data;
    this.notifySubscribers(symbol, data);
  }
}

export const wsManager = WebSocketManager.getInstance();
