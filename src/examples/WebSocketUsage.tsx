import { useEffect } from 'react';
import { wsManager } from '@/services/websocket-manager';

const YourComponent = () => {
  useEffect(() => {
    // Subscribe to price updates
    const unsubscribePrices = wsManager.subscribe((symbol, data) => {
      // Handle price updates
    });

    // Subscribe to status changes
    const unsubscribeStatus = wsManager.onStatusChange((stats) => {
      // Handle connection status changes
    });

    // Subscribe to liquidation events
    const unsubscribeLiquidation = wsManager.onLiquidation((tradeId) => {
      // Handle liquidation events
    });

    // Cleanup on unmount
    return () => {
      unsubscribePrices();
      unsubscribeStatus();
      unsubscribeLiquidation();
    };
  }, []);

  // Rest of component code...
};
