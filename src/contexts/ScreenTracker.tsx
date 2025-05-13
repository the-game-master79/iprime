import React, { createContext, useContext, useState, useEffect } from 'react';

type Screen = 'trade' | 'selectPairs';

interface ScreenTrackerContextType {
  activeScreen: Screen | null;
  setActiveScreen: (screen: Screen) => void;
  hasConflict: boolean;
}

const ScreenTrackerContext = createContext<ScreenTrackerContextType | undefined>(undefined);

export function ScreenTrackerProvider({ children }: { children: React.ReactNode }) {
  const [activeScreen, setActiveScreen] = useState<Screen | null>(null);
  const [hasConflict, setHasConflict] = useState(false);

  const handleScreenChange = (screen: Screen | null) => {
    if (screen === null) {
      setActiveScreen(null);
      setHasConflict(false);
      return;
    }

    if (activeScreen && activeScreen !== screen) {
      setHasConflict(true);
    } else {
      setHasConflict(false);
      setActiveScreen(screen);
    }
  };

  // Clean up active screen on unmount
  useEffect(() => {
    return () => {
      setActiveScreen(null);
      setHasConflict(false);
    };
  }, []);

  return (
    <ScreenTrackerContext.Provider 
      value={{ 
        activeScreen, 
        setActiveScreen: handleScreenChange, 
        hasConflict 
      }}
    >
      {children}
    </ScreenTrackerContext.Provider>
  );
}

export function useScreenTracker() {
  const context = useContext(ScreenTrackerContext);
  if (!context) {
    throw new Error('useScreenTracker must be used within a ScreenTrackerProvider');
  }
  return context;
}
