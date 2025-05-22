import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

function getCssVars(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const styles = getComputedStyle(document.documentElement);
  const vars: Record<string, string> = {};
  for (let i = 0; i < styles.length; i++) {
    const name = styles[i];
    if (name.startsWith("--")) {
      vars[name] = styles.getPropertyValue(name).trim();
    }
  }
  return vars;
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") return stored;
      // Fallback to system preference
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  // Set theme on html[data-theme]
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      setCssVars(getCssVars());
    }
  }, []);

  // Sync theme on mount and when theme changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      setCssVars(getCssVars());
    }
  }, [theme]);

  // Listen for system theme changes and auto-update if user hasn't set a preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        setTheme(media.matches ? "dark" : "light");
      }
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [setTheme]);

  // On first login, auto-set theme to system if not set
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Prevent calling setTheme during render phase (React strict mode, hydration, etc.)
    // Only run this effect after mount
    let didRun = false;
    if (!didRun) {
      const stored = localStorage.getItem("theme");
      if (!stored) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        // Use setTimeout to ensure this runs after initial render
        setTimeout(() => setTheme(systemTheme), 0);
      }
      didRun = true;
    }
  }, [setTheme]);

  // Update cssVars on mount and on theme change
  useEffect(() => {
    setCssVars(getCssVars());
    // Listen for manual CSS variable changes (optional)
    // Could add a MutationObserver here if needed
  }, []);

  return { theme, setTheme, cssVars };
}
