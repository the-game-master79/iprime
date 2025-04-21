import { createClient } from '@supabase/supabase-js';

export class PriceSubscriber {
  private supabase;
  private subscription;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  subscribe(onUpdate: (price: any) => void) {
    // Subscribe to price updates
    this.subscription = this.supabase
      .channel('price-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_prices'
        },
        (payload) => {
          onUpdate(payload.new);
        }
      )
      .subscribe();
  }

  unsubscribe() {
    if (this.subscription) {
      this.supabase.removeChannel(this.subscription);
    }
  }
}
