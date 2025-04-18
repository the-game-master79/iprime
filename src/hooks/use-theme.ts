import { useState, useEffect } from 'react';

interface UseThemeReturnType {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useTheme = (): UseThemeReturnType => {
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) {
      return savedTheme as 'light' | 'dark';
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Update localStorage when theme changes
    localStorage.setItem('app-theme', theme);
    
    // Update document classes
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return {
    theme,
    setTheme: setThemeState
  };
};
