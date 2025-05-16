import { useEffect } from 'react';
import { wsManager } from '@/services/websocket-manager';

const YourComponent = () => {
  useEffect(() => {
    const unsubscribe = wsManager.subscribe((symbol, data) => {
      console.log(`Price update for ${symbol}:`, data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return <div>WebSocket Example</div>;
};

export default YourComponent;
