import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

function getSystemTheme(): ResolvedTheme {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("gg-theme") as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

const ThemeCtx = createContext<{
  theme: Theme;
  /** The actual applied appearance — resolves "system" to the OS preference. */
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}>({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getInitialTheme();
    return initial === "system" ? getSystemTheme() : initial;
  });

  useEffect(() => {
    const applyResolved = () => {
      const resolved = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(resolved);
      const root = document.documentElement;
      root.classList.toggle("dark", resolved === "dark");
      root.style.colorScheme = resolved;
    };

    applyResolved();
    try {
      localStorage.setItem("gg-theme", theme);
    } catch {}

    // Live-follow the OS preference while "system" is selected, so a user
    // who leaves the tab open across a day/night switch sees it update
    // without needing to revisit Settings.
    if (theme === "system" && typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => applyResolved();
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
  }, [theme]);

  return (
    <ThemeCtx.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme: setThemeState,
        // Toggle flips the *resolved* appearance and sets it explicitly —
        // stepping out of "system" mode, same as picking Light/Dark by hand.
        toggle: () => setThemeState(resolvedTheme === "dark" ? "light" : "dark"),
      }}
    >
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
