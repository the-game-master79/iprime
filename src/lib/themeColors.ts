import { supabase } from "@/lib/supabase";

export async function fetchThemeColors(theme: "light" | "dark") {
  const { data, error } = await supabase
    .from("theme_colors")
    .select("var_name,value")
    .eq("theme", theme);

  if (error) {
    console.error("Failed to fetch theme colors:", error);
    return {};
  }

  const vars: Record<string, string> = {};
  data.forEach((row: { var_name: string; value: string }) => {
    vars[row.var_name] = row.value;
  });
  return vars;
}

export function injectThemeColors(vars: Record<string, string>, theme: "light" | "dark") {
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    if (theme === "light") {
      root.style.setProperty(key, value);
    } else {
      // For dark, set on [data-theme="dark"]
      const darkRoot = document.querySelector('[data-theme="dark"]') || root;
      (darkRoot as HTMLElement).style.setProperty(key, value);
    }
  });
}
