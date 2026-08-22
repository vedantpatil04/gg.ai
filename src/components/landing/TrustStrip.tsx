import type { ComponentType } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Landmark,
  Building2,
  ShieldCheck,
  Activity,
  Network,
  HeartPulse,
  AlertTriangle,
  Layers,
  Droplets,
  Recycle,
  FlaskConical,
  Leaf,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Matches the icon-prop convention already used across the app (e.g. `app-layout.tsx`). */
type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>;

/**
 * Real project-relevant stakeholder categories that GreenGuard AI is architected to serve.
 * Communicates the platform's target ecosystem without claiming unverified partnerships.
 */
const STAKEHOLDER_CATEGORIES: readonly { label: string; icon: IconComponent }[] = [
  { label: "Municipal Environmental Departments", icon: Landmark },
  { label: "State Pollution Control Boards", icon: ShieldCheck },
  { label: "Environmental Monitoring Agencies", icon: Activity },
  { label: "Smart City Operations", icon: Network },
  { label: "Public Health Departments", icon: HeartPulse },
  { label: "Disaster Management Authorities", icon: AlertTriangle },
  { label: "Urban Local Bodies", icon: Building2 },
  { label: "Urban Planning Departments", icon: Layers },
  { label: "Water Resource Authorities", icon: Droplets },
  { label: "Waste Management Authorities", icon: Recycle },
  { label: "Research & Academic Institutions", icon: FlaskConical },
  { label: "Sustainability Programs", icon: Leaf },
  { label: "Citizen Environmental Networks", icon: Users },
] as const;

function StakeholderRow({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {STAKEHOLDER_CATEGORIES.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 whitespace-nowrap px-8 text-muted-foreground/75 transition-colors hover:text-foreground"
        >
          <Icon className="size-4 shrink-0 text-[color:var(--color-primary)]" strokeWidth={1.75} />
          <span className="text-xs font-medium tracking-tight sm:text-sm">{label}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A clean, continuous horizontal marquee highlighting the primary municipal, regulatory,
 * research, and citizen stakeholder groups powered by GreenGuard AI.
 */
export function TrustStrip() {
  const reducedMotion = useReducedMotion();

  return (
    <section aria-label="Stakeholders and Ecosystem" className="border-y border-border/60 bg-card/30 py-6 sm:py-8">
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
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 px-6">
            <StakeholderRow />
          </div>
        ) : (
          <div className={cn("flex w-max", "marquee-scroll")}>
            <StakeholderRow />
            <StakeholderRow ariaHidden />
          </div>
        )}
      </div>
    </section>
  );
}
