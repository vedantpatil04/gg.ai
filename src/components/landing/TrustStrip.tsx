import type { ComponentType } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Landmark,
  Building2,
  ShieldCheck,
  Globe2,
  GraduationCap,
  HeartHandshake,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Matches the icon-prop convention already used across the app (e.g. `app-layout.tsx`). */
type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>;

const ORGANIZATIONS: readonly { label: string; icon: IconComponent }[] = [
  { label: "Municipal Corporations", icon: Landmark },
  { label: "Smart Cities", icon: Building2 },
  { label: "Pollution Control Boards", icon: ShieldCheck },
  { label: "Environmental Agencies", icon: Globe2 },
  { label: "Universities", icon: GraduationCap },
  { label: "NGOs", icon: HeartHandshake },
  { label: "Research Institutions", icon: FlaskConical },
] as const;

function OrgRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {ORGANIZATIONS.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 whitespace-nowrap px-8 text-muted-foreground/70 transition-colors hover:text-foreground/80"
        >
          <Icon className="size-4.5 shrink-0" strokeWidth={1.5} />
          <span className="text-sm font-medium tracking-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A clean, logo-free strip naming the categories of organizations GreenGuard
 * AI serves. Real deployments don't have public case studies to name yet,
 * so this shows categories rather than fabricated company logos.
 */
export function TrustStrip() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="border-y border-border/60 bg-card/30 py-8">
      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        {reducedMotion ? (
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3 px-6">
            <OrgRow />
          </div>
        ) : (
          <div className={cn("flex w-max", "marquee-scroll")}>
            <OrgRow />
            <OrgRow ariaHidden />
          </div>
        )}
      </div>
    </section>
  );
}
