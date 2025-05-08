import { useEffect, useState } from 'react';

const BREAKPOINTS = {
  mobile: 768,  // Updated mobile breakpoint
  tablet: 1024,
  desktop: 1280
} as const;

// Add or verify the export of useMediaQuery
export function useMediaQuery(query: string): boolean {
  // Implementation of the hook
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);

    listener();
    mediaQueryList.addEventListener('change', listener);

    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}


export const useBreakpoints = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width < BREAKPOINTS.mobile);
      setIsTablet(width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet);
      setIsDesktop(width >= BREAKPOINTS.tablet);
    };

    // Initial check
    checkBreakpoints();

    // Add event listener
    window.addEventListener('resize', checkBreakpoints);

    // Cleanup
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  return { 
    isMobile, 
    isTablet, 
    isDesktop,
    breakpoints: BREAKPOINTS
  };
};
