import { Sun, Moon } from "lucide-react";
import { useLandingTheme } from "@/components/landing/LandingThemeContext";
import { cn } from "@/lib/utils";

export function LandingThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useLandingTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border border-border/60 bg-background/50 text-foreground/80 backdrop-blur transition-all hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-indigo-500 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
