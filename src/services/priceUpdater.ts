import { supabaseNode } from '@/lib/supabaseNode';
import WebSocket from 'ws';

const WS_URL = 'wss://transfers.cloudforex.club/ws';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export class PriceUpdaterService {
  private ws: WebSocket | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private priceCheckInterval: NodeJS.Timeout | null = null;

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
  
      const symbols = pairs.map(p => p.symbol.toLowerCase().replace('binance:', '').replace('FX:', '').replace('/', ''));
      this.connect(symbols);
      
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

  private connect(pairs: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: [], // No need to specify pairs
          id: 1
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === '24hrTicker') {
          console.log(`Price update for ${data.s}:`, data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket closed. Reconnecting...');
      if (this.isRunning) {
        setTimeout(() => this.connect(pairs), 5000);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.ws?.close();
    };
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
      if (price.source === 'binance' && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          method: 'SUBSCRIBE',
          params: [price.symbol.toLowerCase().replace('binance:', '') + '@ticker'],
          id: Date.now()
        }));
      }
    } catch (error) {
      console.error(`Error refreshing price for ${price.symbol}:`, error);
    }
  }

  stop() {
    this.isRunning = false;
    this.ws?.close();
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.priceCheckInterval) clearInterval(this.priceCheckInterval);
  }
}
