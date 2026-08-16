import { useState, type ReactNode } from "react";
import { AUTH_BACKGROUND_IMAGE } from "@/lib/auth-background";
import { cn } from "@/lib/utils";

type AuthAccent = "primary" | "warning" | "info";

interface AuthBackgroundProps {
  children: ReactNode;
  /** Tints the ambient glow behind the content. Defaults to the brand primary. */
  accent?: AuthAccent;
  className?: string;
}

/**
 * Full-viewport environmental photograph with a theme-aware atmospheric
 * overlay, shared by the sign-in and two-factor verification screens so
 * both feel like one continuous authentication experience rather than two
 * different products.
 *
 * The overlay is built entirely from `oklch(from var(--color-background) …)`
 * — the same relative-color technique already used for the city hero fade
 * in `env-city-context.tsx` — so it re-tints itself correctly for Light,
 * Dark, and System with no `dark:` branching required here. Light mode gets
 * a brighter, more translucent wash with dark typography; dark mode gets a
 * deeper wash with light typography — automatically, because both are
 * derived from the same `--background` token consumers already rely on.
 *
 * The photo is a single, replaceable reference — see `lib/auth-background.ts`.
 */
export function AuthBackground({ children, accent = "primary", className }: AuthBackgroundProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const accentVar = `var(--color-${accent})`;

  return (
    <div className={cn("relative min-h-[100dvh] w-full overflow-hidden bg-background", className)}>
      {!imageFailed && (
        <img
          src={AUTH_BACKGROUND_IMAGE.url}
          alt=""
          aria-hidden="true"
          decoding="async"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-[70%_30%] sm:object-[65%_40%] lg:object-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-700"
        />
      )}

      {/* Directional wash — strongest where text sits directly on the photo (left/lower),
          fading out toward the right so the photograph stays visible and unobstructed. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, oklch(from var(--color-background) l c h / 0.93) 0%, oklch(from var(--color-background) l c h / 0.65) 36%, oklch(from var(--color-background) l c h / 0.32) 66%, oklch(from var(--color-background) l c h / 0.5) 100%)",
        }}
      />

      {/* Top/bottom vignette for grounding */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, oklch(from var(--color-background) l c h / 0.6) 0%, transparent 32%), linear-gradient(to bottom, oklch(from var(--color-background) l c h / 0.38) 0%, transparent 20%)",
        }}
      />

      {/* Restrained role-accent glow — purely atmospheric, never the only source of contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 transition-[background] duration-500"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 10% 80%, oklch(from ${accentVar} l c h / 0.16) 0%, transparent 60%)`,
        }}
      />

      <main className="relative z-10 flex min-h-[100dvh] flex-col">{children}</main>
    </div>
  );
}
