import { useEffect } from 'react';

export function useCacheFlush() {
  useEffect(() => {
    const clearCache = async () => {
      if ('caches' in window) {
        try {
          const keys = await window.caches.keys();
          await Promise.all(
            keys.map(key => window.caches.delete(key))
          );
          console.log('Cache cleared successfully');
        } catch (error) {
          console.error('Error clearing cache:', error);
        }
      }
    };

    clearCache();
  }, []);
}
