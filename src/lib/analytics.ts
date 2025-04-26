declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export const trackEvent = (
  eventName: string,
  eventParams?: { [key: string]: any }
) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', eventName, eventParams);
  }
};

export const trackPageView = (path: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', 'G-6T064J1C87', {
      page_path: path
    });
  }
};

export const trackUserProperties = (properties: { [key: string]: any }) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('set', 'user_properties', properties);
  }
};
