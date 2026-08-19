/**
 * AlertsCard — Section 6: Alerts & Advisories
 *
 * Dedicated alert summary area displaying real active alerts from the backend.
 * When no active alert exists:
 *   - "No active environmental alerts"
 *   - "Everything is currently within normal advisory thresholds."
 * When alerts exist:
 *   - Displays real alert rows with severity indicators
 *   - Provides action: "View advisory →"
 */

import { Panel } from "@/components/ui-bits";
import { CardSkeleton } from "@/components/dashboard/dashboard-skeletons";
import { ShieldCheck, AlertTriangle, Megaphone, ArrowRight } from "lucide-react";
import { useReducedMotion, motion } from "framer-motion";
import { STAGGER, FADE_UP } from "@/lib/motion";

export interface DashboardAlert {
  id?: string;
  _id?: string;
  severity: string;
  title: string;
  area: string;
  time?: string;
  createdAt?: string;
  description?: string;
  desc?: string;
}

export function AlertsCard({
  alerts,
  onAdvisory,
  isLoading,
}: {
  alerts: DashboardAlert[];
  onAdvisory?: () => void;
  isLoading?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <Panel
      eyebrow="Monitoring & Advisories"
      title="Alerts & Advisories"
      surface="card"
      action={
        alerts.length > 0 ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
            {alerts.length} Active {alerts.length === 1 ? "Alert" : "Alerts"}
          </span>
        ) : (
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-[var(--color-success)]" />
            Normal
          </span>
        )
      }
    >
      {isLoading ? (
        <CardSkeleton rows={2} />
      ) : alerts.length === 0 ? (
        <div className="py-6 px-4 flex flex-col items-center justify-center text-center rounded-xl bg-muted/15 border border-border/50">
          <div className="size-10 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
            <ShieldCheck className="size-5" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            No active environmental alerts
          </h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Everything is currently within normal advisory thresholds for your region.
          </p>
          {onAdvisory && (
            <button
              onClick={onAdvisory}
              className="mt-3.5 text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
            >
              <Megaphone className="size-3" />
              Generate official advisory PDF
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <motion.div
            className="space-y-2.5"
            variants={STAGGER(0.06)}
            initial={prefersReduced ? false : "hidden"}
            animate="show"
          >
            {alerts.slice(0, 3).map((a) => {
              const isCritical = a.severity === "critical";
              const isWarning = a.severity === "warning" || a.severity === "high";

              const color = isCritical
                ? "var(--color-destructive)"
                : isWarning
                  ? "var(--color-warning)"
                  : "var(--color-info)";

              return (
                <motion.div
                  key={a.id ?? a._id ?? a.title}
                  variants={FADE_UP}
                  className="p-3.5 rounded-xl border transition-colors flex items-start gap-3"
                  style={{
                    background: `color-mix(in oklab, ${color} 7%, transparent)`,
                    borderColor: `color-mix(in oklab, ${color} 25%, transparent)`,
                  }}
                >
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: `color-mix(in oklab, ${color} 18%, transparent)`,
                      color,
                    }}
                  >
                    <AlertTriangle className="size-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {a.title}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
                        style={{
                          background: `color-mix(in oklab, ${color} 18%, transparent)`,
                          color,
                        }}
                      >
                        {a.severity}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a.area} {a.time ? `· ${a.time}` : ""}
                    </div>

                    {(a.desc || a.description) && (
                      <p className="text-xs text-foreground/80 mt-1.5 leading-relaxed line-clamp-2">
                        {a.desc || a.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {onAdvisory && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={onAdvisory}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>View advisory PDF</span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
