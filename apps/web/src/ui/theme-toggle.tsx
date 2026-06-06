import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getStoredTheme, persistTheme, type ThemeMode, toggleTheme } from "#/lib/theme";
import { m } from "#/paraglide/messages";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? m.theme_switch_to_light() : m.theme_switch_to_dark()}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-[#fff5ee] hover:text-[#ec7124] dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
      onClick={() => {
        const next = toggleTheme(theme);
        setTheme(next);
        persistTheme(next);
      }}
      type="button"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
