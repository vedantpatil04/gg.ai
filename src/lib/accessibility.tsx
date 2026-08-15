import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reduceMotion: false,
};

const STORAGE_KEY = "gg-accessibility";

function readStored(): AccessibilitySettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AccessibilitySettings>;
    return {
      highContrast: !!parsed.highContrast,
      largeText: !!parsed.largeText,
      reduceMotion: !!parsed.reduceMotion,
    };
  } catch {
    return DEFAULTS;
  }
}

function getSystemReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

const AccessibilityCtx = createContext<{
  settings: AccessibilitySettings;
  /** reduceMotion resolved against the OS-level preference too — true if
   *  either the user's explicit setting or their device says reduce. */
  resolvedReduceMotion: boolean;
  setSettings: (patch: Partial<AccessibilitySettings>) => void;
}>({
  settings: DEFAULTS,
  resolvedReduceMotion: false,
  setSettings: () => {},
});

/**
 * Applies Accessibility settings (High Contrast / Large Text / Reduce Motion)
 * to the whole app via classes on <html>, and persists them locally so they
 * survive refresh and apply from first paint on the next visit — mirroring
 * ThemeProvider (src/lib/theme.tsx). The Settings page remains the source of
 * truth for the authenticated user's saved preference; this provider is what
 * makes that preference actually do something everywhere, not just there.
 */
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AccessibilitySettings>(DEFAULTS);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  // Hydrate from localStorage on mount (client-only, same as ThemeProvider).
  useEffect(() => {
    setSettingsState(readStored());
    setSystemReducedMotion(getSystemReducedMotion());
  }, []);

  // Live-follow the OS "reduce motion" preference independent of the
  // explicit in-app toggle.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setSystemReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const resolvedReduceMotion = settings.reduceMotion || systemReducedMotion;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("high-contrast", settings.highContrast);
    root.classList.toggle("large-text", settings.largeText);
    root.classList.toggle("reduce-motion", resolvedReduceMotion);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage unavailable — non-fatal, in-memory state still applies */
    }
  }, [settings, resolvedReduceMotion]);

  // Stable reference (empty dep array — setSettingsState from useState never
  // changes) so consumers can safely depend on it in their own effects
  // without re-running every time settings change.
  const setSettings = useCallback(
    (patch: Partial<AccessibilitySettings>) =>
      setSettingsState((prev) => ({ ...prev, ...patch })),
    [],
  );

  return (
    <AccessibilityCtx.Provider value={{ settings, resolvedReduceMotion, setSettings }}>
      {children}
    </AccessibilityCtx.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityCtx);
