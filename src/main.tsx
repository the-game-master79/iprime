import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import '@/styles/fonts.css'; // Custom fonts
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from '@vercel/analytics/react';

// Developer warning
console.log('%cSTOP!', 'color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px #000;');
console.log(
  '%cThis is a browser feature intended for developers. If someone told you to copy and paste something here to enable a CloudForex.club feature or "hack" someone\'s account, it is a scam and will give them access to your CloudForex account.',
  'color: red; font-size: 16px; font-weight: bold;'
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SpeedInsights />
    <Analytics />
  </StrictMode>
);
