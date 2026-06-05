export type ThemeMode = "light" | "dark" | "system";

export function resolveStoredTheme(value: string | null | undefined): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function toggleTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = mode;
}

export function getStoredTheme(): ThemeMode {
  return resolveStoredTheme(window.localStorage.getItem("edgetrail-theme"));
}

export function persistTheme(mode: ThemeMode): void {
  window.localStorage.setItem("edgetrail-theme", mode);
  applyTheme(mode);
}
