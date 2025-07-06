import { useEffect, useState } from "react";

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
  const [cssVars, setCssVars] = useState<Record<string, string>>({});

  // Set light theme
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", "light");
      setCssVars(getCssVars());
    }
  }, []);

  return { theme: "light", setTheme: () => {}, cssVars };
}
