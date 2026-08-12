/**
 * WorkspaceLoader — animated state indicator for upload/processing lifecycle.
 * States: validating | uploading | processing
 */
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, CheckCircle, Shield, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export type LoaderStage = "validating" | "uploading" | "processing";

const STAGE_CONFIG: Record<LoaderStage, { icon: typeof Loader2; label: string; sub: string; color: string }> = {
  validating: { icon: Shield,  label: "Validating file",    sub: "Checking format and size…",        color: "var(--color-info)" },
  uploading:  { icon: Loader2, label: "Uploading securely", sub: "Sending to GreenGuard AI…",        color: "var(--color-primary)" },
  processing: { icon: Cpu,     label: "Generating analysis",sub: "AI is preparing your insights…",   color: "var(--color-warning)" },
};

const STEPS: LoaderStage[] = ["validating", "uploading", "processing"];

interface WorkspaceLoaderProps {
  stage: LoaderStage;
}

export function WorkspaceLoader({ stage }: WorkspaceLoaderProps) {
  const reduced = useReducedMotion();
  const cfg = STAGE_CONFIG[stage];
  const Icon = cfg.icon;
  const currentIdx = STEPS.indexOf(stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 py-10 px-6"
      role="status" aria-live="polite"
      aria-label={cfg.label}
    >
      {/* Spinner */}
      <div className="relative size-14">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: `2px solid ${cfg.color}20` }}
        />
        {!reduced && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ borderTop: `2px solid ${cfg.color}`, borderRight: "2px solid transparent", borderBottom: "2px solid transparent", borderLeft: "2px solid transparent" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )}
        <div
          className="absolute inset-2 rounded-full grid place-items-center"
          style={{ background: `color-mix(in oklab, ${cfg.color} 10%, transparent)` }}
        >
          <Icon className={cn("size-5", stage === "uploading" && !reduced && "animate-spin")} style={{ color: cfg.color }} />
        </div>
      </div>

      {/* Labels */}
      <div className="text-center">
        <div className="text-sm font-semibold">{cfg.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{cfg.sub}</div>
      </div>

      {/* Step trail */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn("size-2 rounded-full transition-colors duration-300",
                i < currentIdx  ? "bg-[var(--color-success)]"
                : i === currentIdx ? ""
                : "bg-muted",
              )}
              style={i === currentIdx ? { background: cfg.color } : {}}
            >
              {i < currentIdx && <CheckCircle className="size-2 text-[var(--color-success)]" />}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-6 h-0.5 rounded transition-colors duration-300",
                i < currentIdx ? "bg-[var(--color-success)]" : "bg-muted",
              )} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
