import { Home, BarChart2, Wallet, Users, Menu } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useBreakpoints } from '@/hooks/use-breakpoints';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface MobileBottomNavProps {
  onWalletClick?: () => void;
}

const navItems = [
  { name: 'Dashboard', icon: Home, href: '/platform' },
  { name: 'Trade', icon: BarChart2, href: '/tradingstation' },
  { name: 'Affiliates', icon: Users, href: '/affiliate' },
  { name: 'Wallet', icon: Wallet, href: '/wallet' },
] as const;

export const MobileBottomNav = ({ onWalletClick }: MobileBottomNavProps) => {
  const location = useLocation();
  const { isMobile } = useBreakpoints();
  const [activeHref, setActiveHref] = useState(location.pathname);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll to hide/show navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY <= 0) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Update active href when location changes
  useEffect(() => {
    setActiveHref(location.pathname);
  }, [location]);

  if (!isMobile) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 bg-background backdrop-blur-sm rounded-xl shadow-lg border border-border z-50 md:hidden"
          style={{
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const isActive = activeHref.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.name === 'Wallet' ? '#' : item.href}
                  onClick={(e) => {
                    if (item.name === 'Wallet') {
                      e.preventDefault();
                      if (onWalletClick) {
                        onWalletClick();
                      }
                    }
                  }}
                  className={cn(
                    'relative flex flex-col items-center justify-center flex-1 h-full',
                    'text-muted-foreground hover:text-foreground transition-all duration-200',
                    isActive && item.name !== 'Wallet' ? 'text-primary' : 'hover:opacity-80',
                    item.name === 'Wallet' ? 'cursor-pointer' : ''
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeNavItem"
                      className="absolute -top-1 h-1 w-6 bg-primary rounded-full"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                  <div className="relative">
                    <item.icon 
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        isActive ? 'scale-110' : 'scale-100'
                      )} 
                    />
                    {item.name === 'Wallet' && (
                      <span className="absolute -top-1 -right-2 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default MobileBottomNav;
