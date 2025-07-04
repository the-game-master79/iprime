import { motion } from 'framer-motion';

const INFO_ITEMS = [
  '⚡ Ultra-Fast Trade Execution',
  '💹 Tier-1 Crypto & Forex Liquidity',
  '🛡️ Regulated by CySEC, FCA',
  '💰 Zero Spreads',
  '🤖 AlphaQuant Proprietary Software',
  '🚀 Up to 2000X Leverage',
  '🔒 Bank-Grade Security & TSL',
  '🕐 24/7 On-Demand Payouts',
  '🧠 Real Human Support — No AI Bullsh*t',
  '📈 Institutional-Grade Trading Tools',
  '🔍 Transparent Pricing — No Hidden Fees',
  '🎯 Built for Pro Traders',
  '🏦 Cold Wallet Storage by Default',
  '💼 Trade Forex, Crypto, Metals, & More',
  '🧾 Fully Audited Infrastructure',
  '🧬 Cross-Chain Payment Rail Coming Soon',
  '🏁 Launch in Under 60 Seconds',
  '🧠 Smart Order Routing Engine',
  '📉 Negative Balance Protection',
  '🛡️ Advanced WAF, SSL & TSL Encryption',
  '🔧 Powerful API Access for Bots',
  '💳 Instant Fiat-to-Crypto Onramp',
  '💸 Fastest Payout System in the Industry',
  '🏆 Ranked Top 5 in Execution Speed',
  '📡 Real-Time Market Depth Display'
];

// Shuffle function to randomize the items
const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const DepthMarquee = () => {
  // Create multiple copies of shuffled items to ensure seamless looping
  const shuffledItems1 = shuffleArray([...INFO_ITEMS]);
  const shuffledItems2 = shuffleArray([...INFO_ITEMS]);
  
  // Create multiple duplicates to ensure smooth continuous scrolling
  const duplicatedItems1 = [...shuffledItems1, ...shuffledItems1, ...shuffledItems1, ...shuffledItems1];
  const duplicatedItems2 = [...shuffledItems2, ...shuffledItems2, ...shuffledItems2, ...shuffledItems2];

  interface MarqueeRowProps {
    items: string[];
    reverse?: boolean;
    delay?: number;
  }

  const MarqueeRow = ({ items, reverse = false, delay = 0 }: MarqueeRowProps) => {
    // Calculate the width of the content to ensure seamless looping
    const contentWidth = items.length * 200; // Approximate width of items
    
    return (
      <div className="relative overflow-hidden w-full">
        <motion.div 
          className="flex items-center py-1.5 whitespace-nowrap"
          style={{
            display: 'inline-flex',
            whiteSpace: 'nowrap',
          }}
          initial={{ x: reverse ? '0%' : `-${contentWidth / 2}px` }}
          animate={{ 
            x: reverse ? `-${contentWidth / 2}px` : '0%',
          }}
          transition={{
            duration: 180,
            repeat: Infinity,
            ease: 'linear',
            repeatType: 'loop',
            delay: delay,
          }}
        >
          {items.map((text, index) => (
            <div 
              key={`${text}-${index}`} 
              className="relative group inline-flex items-center mx-2"
            >
              <div className="relative z-10 bg-white/95 rounded-xl px-5 py-1.5 text-sm font-medium text-gray-800 shadow-sm">
                {text}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="w-full bg-background/80 overflow-hidden relative">
      <div className="relative z-10 space-y-1">
        <MarqueeRow items={duplicatedItems1} reverse={false} delay={0} />
        <MarqueeRow items={duplicatedItems2} reverse={true} delay={-30} />
      </div>
      {/* Gradient fades for better visual effect */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background/80 to-transparent z-20 pointer-events-none" />
    </div>
  );
};

export default DepthMarquee;
