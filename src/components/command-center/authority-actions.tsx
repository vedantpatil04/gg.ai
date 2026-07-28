import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Zap,
  TreePine,
  Car,
  Trash2,
  ClipboardCheck,
  AlertOctagon,
  Clock,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { commandApi, type AuthorityActionsData } from "@/lib/api/command.api";
import { Panel, StatCard, Pill, WorkspaceHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const URGENCY_CONFIG: Record<
  string,
  { tone: "destructive" | "warning" | "info" | "success"; label: string; icon: typeof Zap }
> = {
  Immediate: { tone: "destructive", label: "Immediate", icon: AlertOctagon },
  High: { tone: "warning", label: "High", icon: Zap },
  Moderate: { tone: "info", label: "Moderate", icon: Clock },
  Routine: { tone: "success", label: "Routine", icon: ClipboardCheck },
};

function ActionSection({
  icon: Icon,
  label,
  items,
  color = "var(--color-muted-foreground)",
}: {
  icon: typeof TreePine;
  label: string;
  items: string[];
  color?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="size-3.5 shrink-0" style={{ color }} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-1 size-1.5 rounded-full shrink-0" style={{ background: color }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CityActionCard({ plan }: { plan: AuthorityActionsData["actionPlans"][number] }) {
  const urgency = URGENCY_CONFIG[plan.plan.urgencyLevel] ?? URGENCY_CONFIG.Routine;
  const UrgencyIcon = urgency.icon;

  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 border",
        plan.plan.urgencyLevel === "Immediate"
          ? "border-destructive/30"
          : plan.plan.urgencyLevel === "High"
            ? "border-warning/30"
            : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="font-semibold">{plan.cityName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{plan.country}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Pill tone={urgency.tone}>
            <UrgencyIcon className="size-2.5" />
            {plan.plan.urgencyLevel}
          </Pill>
          <div className="text-xs text-muted-foreground tabular-nums">AQI {plan.currentAqi}</div>
        </div>
      </div>

      {plan.plan.emergencyInterventions.length > 0 && (
        <div className="rounded-lg bg-destructive/8 border border-destructive/20 p-3 mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertOctagon className="size-3.5 text-destructive" />
            <span className="text-[10px] uppercase tracking-wider text-destructive font-semibold">
              Emergency Interventions
            </span>
          </div>
          <ul className="space-y-1">
            {plan.plan.emergencyInterventions.map((item, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-destructive mt-1 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ActionSection
          icon={TreePine}
          label="Tree Plantation Target"
          items={[plan.plan.treePlantationTarget]}
          color="var(--color-success)"
        />
        <ActionSection
          icon={Car}
          label="Traffic Optimization"
          items={plan.plan.trafficOptimization}
          color="var(--color-info)"
        />
        <ActionSection
          icon={Trash2}
          label="Waste Management"
          items={plan.plan.wasteManagement}
          color="var(--color-warning)"
        />
        <ActionSection
          icon={ClipboardCheck}
          label="Inspection Schedule"
          items={plan.plan.inspectionSchedule}
          color="var(--color-primary)"
        />
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <TrendingDown className="size-3.5 text-success" />
          <span>
            Est. improvement:{" "}
            <span className="text-foreground font-medium">{plan.plan.estimatedAqiImprovement}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span className="truncate">{plan.plan.timeframe}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        {plan.activeAlerts > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-destructive" />
            {plan.activeAlerts} active alert{plan.activeAlerts !== 1 ? "s" : ""}
          </span>
        )}
        {plan.pendingComplaints > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-warning" />
            {plan.pendingComplaints} pending complaint{plan.pendingComplaints !== 1 ? "s" : ""}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-muted-foreground" />
          Risk {plan.currentRisk}/100
        </span>
      </div>
    </div>
  );
}

export function AuthorityActions() {
  const {
    data: res,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["command-authority-actions"],
    queryFn: () => commandApi.getAuthorityActions(),
    staleTime: 10 * 60 * 1000,
  });

  const d = res?.data as AuthorityActionsData | undefined;

  const immediateCount =
    d?.actionPlans.filter((p) => p.plan.urgencyLevel === "Immediate").length ?? 0;
  const highCount = d?.actionPlans.filter((p) => p.plan.urgencyLevel === "High").length ?? 0;
  const totalAlerts = d?.actionPlans.reduce((s, p) => s + p.activeAlerts, 0) ?? 0;
  const totalPending = d?.actionPlans.reduce((s, p) => s + p.pendingComplaints, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Workspace Header ─────────────────────────────────────────────── */}
      {/* Phase 3A.3: replaces the SectionTitle + separate Regenerate Button  */}
      {/* flex row. The button moves into the action slot for a tighter,      */}
      {/* single-line header. Stats surface on-load from cached data.         */}
      <WorkspaceHeader
        eyebrow="ENVIRONMENTAL MONITORING · AUTHORITY ACTIONS"
        title="City Action Plans"
        description="Gemini-generated intervention plans sorted by operational urgency."
        stats={
          d
            ? [
                {
                  label: "Immediate",
                  value: immediateCount,
                  tone: immediateCount > 0 ? "destructive" : "muted",
                },
                {
                  label: "High Priority",
                  value: highCount,
                  tone: highCount > 0 ? "warning" : "muted",
                },
                {
                  label: "Active Alerts",
                  value: totalAlerts,
                  tone: totalAlerts > 0 ? "destructive" : "muted",
                },
                {
                  label: "Pending Complaints",
                  value: totalPending,
                  tone: totalPending > 0 ? "warning" : "muted",
                },
              ]
            : undefined
        }
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5 mr-1.5" />
            )}
            {isFetching ? "Generating…" : "Regenerate"}
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground text-center">
            Gemini is generating authority action plans for each city…
            <br />
            <span className="text-xs">This may take 15–30 seconds</span>
          </span>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Immediate Actions"
              value={immediateCount}
              accent={immediateCount > 0 ? "destructive" : "success"}
              icon={<AlertOctagon className="size-4" />}
              hint="Cities requiring now"
            />
            <StatCard
              label="High Priority"
              value={highCount}
              accent={highCount > 0 ? "warning" : "success"}
              icon={<Zap className="size-4" />}
              hint="Cities in high urgency"
            />
            <StatCard
              label="Active Alerts"
              value={totalAlerts}
              accent={totalAlerts > 0 ? "destructive" : "success"}
              icon={<AlertOctagon className="size-4" />}
              hint="Across all cities"
            />
            <StatCard
              label="Pending Complaints"
              value={totalPending}
              accent="warning"
              icon={<ClipboardCheck className="size-4" />}
              hint="Awaiting resolution"
            />
          </div>

          {/* Action plan cards — sorted by urgency */}
          {d?.actionPlans && d.actionPlans.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {[...d.actionPlans]
                .sort((a, b) => {
                  const order = { Immediate: 0, High: 1, Moderate: 2, Routine: 3 };
                  return (
                    (order[a.plan.urgencyLevel as keyof typeof order] ?? 3) -
                    (order[b.plan.urgencyLevel as keyof typeof order] ?? 3)
                  );
                })
                .map((plan) => (
                  <CityActionCard key={plan.cityId} plan={plan} />
                ))}
            </div>
          ) : (
            <Panel>
              <p className="text-sm text-muted-foreground text-center py-8">
                No action plans available. Ensure city environmental data is present in the
                database.
              </p>
            </Panel>
          )}

          {d?.generatedAt && (
            <p className="text-xs text-muted-foreground text-right">
              Generated {new Date(d.generatedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
