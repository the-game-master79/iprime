import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback, useRef } from "react";
import { AuthActionButton } from "./AuthActionButton";
import { Menu, X } from "lucide-react";

// Debounce function to limit the rate at which a function can fire
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoize the scroll handler with useCallback
  const handleScroll = useCallback(() => {
    const isScrolled = window.scrollY > 20;
    // Only update state if it's different to prevent unnecessary re-renders
    setScrolled(prev => prev !== isScrolled ? isScrolled : prev);
  }, []);

  useEffect(() => {
    // Create a debounced version of the scroll handler
    const debouncedHandleScroll = debounce(handleScroll, 10);
    
    // Add passive event listener for better performance
    window.addEventListener('scroll', debouncedHandleScroll, { passive: true });
    
    // Initial check
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', debouncedHandleScroll);
    };
  }, [handleScroll]);

  const handleNavigation = (path: string) => {
    // List of routes that require authentication
    const protectedRoutes = [
      "/platform",
      "/plans",
      "/affiliate",
      "/profile",
      "/cashier",
      "/promotions",
    ];
    // If the route is protected and user is not logged in, redirect to login
    if (protectedRoutes.some((r) => path.startsWith(r)) && !user) {
      navigate("/auth/login");
      return;
    }
    // Close mobile menu when navigating
    setMobileMenuOpen(false);
    // All routes (public or not) can be navigated to directly, no reload for same path
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Always render the spacer but control its visibility */}
      <div 
        className={`transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0 h-0'}`} 
        style={{ height: scrolled ? '4rem' : '0' }} 
        aria-hidden="true"
      />
      <header
        ref={navbarRef}
        className={cn(
          "w-full max-w-[1200px] z-30 text-foreground will-change-transform",
          "transition-all duration-300 ease-out",
          scrolled
            ? "fixed top-6 inset-x-0 mx-auto bg-background/80 backdrop-blur-md shadow-lg rounded-xl border border-border py-3 px-6"
            : "relative bg-background my-6 mx-auto py-3 pl-6 pr-4"
        )}
        style={{
          // Optimize for GPU acceleration
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px',
          // Smooth transitions for specific properties
          transitionProperty: 'background, box-shadow, border-radius, transform, padding, margin',
        }}
      >
        <div className="w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 text-foreground">
                <img
                  src={"/arthaa-light.svg"}
                  alt="Arthaa Logo"
                  className="h-8 md:h-10 w-auto max-w-[180px] object-contain"
                  style={{
                    height: 'auto',
                    maxHeight: '100%',
                    width: 'auto',
                    maxWidth: '180px',
                  }}
                />
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {[
                  { path: "/trading", label: "Trading" },
                  { path: "/alphaquant", label: "AlphaQuant" },
                  { path: "/blogs", label: "Blogs" },
                ].map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "text-sm md:text-base lg:text-lg px-2 md:px-3 py-1.5 transition-colors text-foreground hover:text-primary hover:scale-105 whitespace-nowrap",
                      isActive(item.path) && "underline underline-offset-4"
                    )}
                    style={{ border: "none", borderRadius: 0, background: "none" }}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2 text-foreground hover:text-primary focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
              <AuthActionButton className="px-4 py-1.5 md:px-6 md:py-2 text-sm md:text-base lg:text-xl font-semibold shadow-lg whitespace-nowrap" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div 
        ref={menuRef}
        className={cn(
          "fixed inset-x-0 top-0 z-20 bg-background/95 backdrop-blur-md transition-all duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-y-0 shadow-lg" : "-translate-y-full"
        )}
        style={{
          paddingTop: navbarRef.current?.offsetHeight,
          maxHeight: `calc(100vh - ${navbarRef.current?.offsetHeight}px)`,
          overflowY: 'auto',
        }}
      >
        <div className="px-4 sm:px-6 py-4 space-y-4 mx-4 sm:mx-6 my-4 rounded-lg bg-background/80">
          {[
            { path: "/trading", label: "Trading" },
            { path: "/alphaquant", label: "AlphaQuant" },
            { path: "/blogs", label: "Blogs" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "block w-full text-left px-4 py-3 text-lg transition-colors rounded-lg",
                "hover:bg-accent hover:text-accent-foreground",
                isActive(item.path) ? "bg-primary/10 text-primary" : "text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};