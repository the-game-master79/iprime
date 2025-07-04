import { useRef } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import { CrosshairSimpleIcon, CpuIcon, EyeIcon } from "@phosphor-icons/react";

const features = [
  {
    icon: CrosshairSimpleIcon,
    title: "Precision at Every Click",
    description: "Execute trades with razor-sharp speed and surgical accuracy. Real-time charts, instant order placement, and institutional-grade spreads — all engineered into one seamless command center."
  },
  {
    icon: CpuIcon,
    title: "Smart Trade Engine",
    description: "Arthaa’s AI-enhanced backend routes your trades through Tier-1 liquidity pools, ensuring zero spread above $500 and lightning-fast execution."
  },
  {
    icon: EyeIcon,
    title: "Clarity Meets Control",
    description: "View open trades, monitor real-time PnL, and place limit/market orders with absolute transparency. No noise. No confusion. Just full control."
  }
];

const TiltImage = () => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [spring, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    config: { mass: 5, tension: 350, friction: 40 }
  }));

  useGesture({
    onMove: ({ xy: [x, y], hovering }) => {
      if (!ref.current || !hovering) return;
      const rect = ref.current.getBoundingClientRect();
      const X = (x - rect.left) / rect.width;
      const Y = (y - rect.top) / rect.height;
      
      api.start({
        rotateX: (Y - 0.5) * 10,
        rotateY: (0.5 - X) * 10,
        scale: 1.03,
      });
    },
    onHover: ({ hovering }) => {
      if (!hovering) {
        api.start({
          rotateX: 0,
          rotateY: 0,
          scale: 1,
        });
      }
    },
  }, { target: ref });

  return (
    <div ref={ref} className="w-full max-w-7xl mx-auto perspective-1000">
      <animated.div
        className="w-full h-full will-change-transform"
        style={{
          transform: 'perspective(1000px)',
          transformStyle: 'preserve-3d',
          ...spring,
        }}
      >
        <img
          src="/trade-page.png"
          alt="Trading Platform"
          className="w-full h-auto"
          style={{ maxHeight: '800px' }}
          loading="lazy"
        />
      </animated.div>
    </div>
  );
};

export const QuickFeatures = () => {
  return (
    <section className="py-16 relative overflow-hidden bg-background">
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-16">
            Built for Speed. <br />Engineered for Trust.
          </h2>
          
          {/* Trading Platform Image */}
          <TiltImage />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:-translate-y-2"
            >
              <div className="w-12 h-12 mb-4 flex items-center justify-center text-gray-800 dark:text-gray-200">
                <feature.icon size={32} weight="bold" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
