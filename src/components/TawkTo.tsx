import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    Tawk_API?: {
      onLoaded?: () => void;
      hideWidget?: () => void;
      showWidget?: () => void;
      toggle?: () => void;
      popup?: () => void;
      maximize?: () => void;
      minimize?: () => void;
      endChat?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

export const TawkTo = () => {
  const location = useLocation();
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!scriptRef.current) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://embed.tawk.to/${import.meta.env.VITE_TAWKTO_PROPERTY_ID}/${import.meta.env.VITE_TAWKTO_WIDGET_ID}`;
      script.charset = 'UTF-8';
      script.setAttribute('crossorigin', '*');
      scriptRef.current = script;

      const style = document.createElement('style');
      style.innerHTML = `
        .tawk-min-container {
          margin-bottom: 65px !important;
          right: 5px !important;
        }
        @media (min-width: 768px) {
          .tawk-min-container {
            margin-bottom: 5px !important;
            right: 15px !important;
          }
        }
      `;
      styleRef.current = style;
      
      document.head.appendChild(style);
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(script, firstScript);
    }

    return () => {
      if (scriptRef.current?.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      if (styleRef.current?.parentNode) {
        styleRef.current.parentNode.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Handle route changes
  useEffect(() => {
    if (window.Tawk_API?.onLoaded) {
      window.Tawk_API.showWidget?.();
    }
  }, [location.pathname]);

  return null;
};
