import { supabase } from "@/lib/supabase";

export async function fetchThemeColors() {
  const { data, error } = await supabase
    .from("theme_colors")
    .select("var_name,value")
    .eq("theme", "light");

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

export function injectThemeColors(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
