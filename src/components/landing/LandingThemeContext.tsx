import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type LandingTheme = "dark" | "light";

interface LandingThemeContextValue {
  theme: LandingTheme;
  setTheme: (t: LandingTheme) => void;
  toggleTheme: () => void;
}

const LandingThemeCtx = createContext<LandingThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function LandingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<LandingTheme>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("landing-theme");
        if (saved === "light" || saved === "dark") return saved;
        const ggTheme = localStorage.getItem("gg-theme");
        if (ggTheme === "light") return "light";
      } catch {}
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    try {
      localStorage.setItem("landing-theme", theme);
    } catch {}

    // Cleanup: when navigating away from the public landing page, restore the platform theme
    return () => {
      try {
        const platformTheme = localStorage.getItem("gg-theme") || "system";
        const isLight =
          platformTheme === "light" ||
          (platformTheme === "system" &&
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-color-scheme: light)").matches);
        root.classList.toggle("dark", !isLight);
        root.style.colorScheme = isLight ? "light" : "dark";
      } catch {}
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <LandingThemeCtx.Provider value={{ theme, setTheme: setThemeState, toggleTheme }}>
      {children}
    </LandingThemeCtx.Provider>
  );
}

export const useLandingTheme = () => useContext(LandingThemeCtx);
