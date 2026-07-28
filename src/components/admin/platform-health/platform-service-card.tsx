import type { ComponentType, ReactNode } from "react";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";

export type ServiceStatus = "online" | "warning" | "offline" | "unknown";

const STATUS_PILL_TONE: Record<ServiceStatus, "success" | "warning" | "destructive" | "muted"> = {
  online: "success",
  warning: "warning",
  offline: "destructive",
  unknown: "muted",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  online: "Online",
  warning: "Attention",
  offline: "Offline",
  unknown: "Unknown",
};

interface PlatformServiceCardProps {
  icon: ComponentType<{ className?: string }>;
  name: string;
  status: ServiceStatus;
  description: string;
  lastChecked?: string;
  detail?: ReactNode;
}

export function PlatformServiceCard({
  icon: Icon,
  name,
  status,
  description,
  lastChecked,
  detail,
}: PlatformServiceCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-4",
        status === "offline" && "border border-destructive/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-muted grid place-items-center text-muted-foreground shrink-0">
            <Icon className="size-4" />
          </div>
          <div className="font-medium text-sm">{name}</div>
        </div>
        <Pill tone={STATUS_PILL_TONE[status]}>{STATUS_LABEL[status]}</Pill>
      </div>

      <p className="text-xs text-muted-foreground mt-3">{description}</p>

      {detail && <div className="text-xs text-muted-foreground mt-2">{detail}</div>}

      {lastChecked && (
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mt-3">
          Last checked {lastChecked}
        </div>
      )}
    </div>
  );
}
