import { useQuery } from "@tanstack/react-query";
import { Building2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { profileApi, type OrgInfoRow } from "@/lib/api/profile.api";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function OrganizationSkeleton() {
  return (
    <div
      className="grid lg:grid-cols-2 gap-6 animate-in fade-in-0 duration-300"
      aria-busy="true"
      aria-label="Loading organization information"
    >
      <Skeleton className="h-52 rounded-2xl shimmer" />
      <Skeleton className="h-52 rounded-2xl shimmer" />
      <Skeleton className="h-40 rounded-2xl shimmer" />
    </div>
  );
}

// ─── Stagger wrapper ─────────────────────────────────────────────────────────

function StaggerCard({ children, index = 0 }: { children: ReactNode; index?: number }) {
  return (
    <div
      className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "300ms" }}
    >
      {children}
    </div>
  );
}

// ─── Field rows ──────────────────────────────────────────────────────────────

/**
 * Uses <dl>/<dt>/<dd> for accessible label/value pairs — mirrors the
 * InfoRow / InfoList pattern used in the Overview and Personal Info tabs
 * so the whole module is semantically consistent.
 */
function OrgField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <dt className="text-sm text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-right truncate max-w-[60%] m-0">{value}</dd>
    </div>
  );
}

function OrgPillRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="py-2.5 border-b border-border/60 last:border-0 space-y-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0">
        <ul className="flex flex-wrap gap-1.5" role="list" aria-label={label}>
          {items.map((item) => (
            <li
              key={item}
              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
            >
              {item}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}

function OrgRows({ rows }: { rows: OrgInfoRow[] }) {
  return (
    <dl>
      {rows.map((row) =>
        row.items && row.items.length > 0 ? (
          <OrgPillRow key={row.key} label={row.label} items={row.items} />
        ) : row.value ? (
          <OrgField key={row.key} label={row.label} value={row.value} />
        ) : null,
      )}
    </dl>
  );
}

// ─── Section cards ───────────────────────────────────────────────────────────

function OrganizationCard({ name }: { name?: string }) {
  if (!name) {
    return (
      <Panel
        eyebrow="Organization"
        title={<h3 className="text-base font-semibold tracking-tight">Organization</h3>}
        className="hover:shadow-md transition-shadow duration-200"
      >
        <p className="text-sm text-muted-foreground py-1">
          This account is not associated with an organization.
        </p>
      </Panel>
    );
  }
  return (
    <Panel
      eyebrow="Organization"
      title={<h3 className="text-base font-semibold tracking-tight">Organization</h3>}
      className="hover:shadow-md transition-shadow duration-200"
    >
      <dl>
        <OrgField label="Organization name" value={name} />
      </dl>
    </Panel>
  );
}

function EmploymentCard({ rows }: { rows: OrgInfoRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Panel
      eyebrow="Employment"
      title={<h3 className="text-base font-semibold tracking-tight">Employment information</h3>}
      className="hover:shadow-md transition-shadow duration-200"
    >
      <OrgRows rows={rows} />
    </Panel>
  );
}

function AssignmentCard({ rows }: { rows: OrgInfoRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Panel
      eyebrow="Assignment"
      title={<h3 className="text-base font-semibold tracking-tight">Assignment</h3>}
      className="hover:shadow-md transition-shadow duration-200"
    >
      <OrgRows rows={rows} />
    </Panel>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function OrganizationEmpty() {
  return (
    <div
      className="glass rounded-2xl p-10 sm:p-14 flex flex-col items-center text-center gap-3 animate-in fade-in-0 zoom-in-95 duration-300"
      role="status"
      aria-label="No organization information"
    >
      <div className="size-11 rounded-xl bg-muted grid place-items-center text-muted-foreground">
        <Building2 className="size-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">No organization on file</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        No organization information is available for this account. Contact your administrator to
        have your organization details added.
      </p>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function OrganizationError({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div
      className="glass rounded-2xl p-10 flex flex-col items-center text-center gap-3 animate-in fade-in-0 duration-300"
      role="alert"
    >
      <p className="text-sm text-muted-foreground">Couldn't load organization information.</p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        disabled={isRetrying}
        className="gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
      >
        <RefreshCw className={`size-3.5 ${isRetrying ? "animate-spin" : ""}`} aria-hidden="true" />
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Phase 5 — Organization tab. Lazy-loaded: only fires when the tab mounts,
 * because TabsContent unmounts when inactive (Radix default).
 *
 * Phase 10 additions:
 *  - Staggered card entrance animations.
 *  - Hover elevation on each Panel.
 *  - Shimmer on skeleton bones.
 *  - Semantic dl/dt/dd in OrgField/OrgRows.
 *  - Enriched empty and error states.
 *  - role="alert" on error, role="status" on empty.
 *  - isFetching passed to retry button.
 */
export function OrganizationTab() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["profile", "organization"],
    queryFn: () => profileApi.getOrganization(),
    retry: 1,
  });

  if (isLoading) return <OrganizationSkeleton />;
  if (isError || !data)
    return <OrganizationError onRetry={() => refetch()} isRetrying={isFetching} />;

  const org = data.data;
  const hasAnyContent =
    org.hasOrganization || org.employment.length > 0 || org.assignment.length > 0;

  if (!hasAnyContent) return <OrganizationEmpty />;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <StaggerCard index={0}>
        <OrganizationCard name={org.organizationName} />
      </StaggerCard>
      {org.employment.length > 0 && (
        <StaggerCard index={1}>
          <EmploymentCard rows={org.employment} />
        </StaggerCard>
      )}
      {org.assignment.length > 0 && (
        <StaggerCard index={2}>
          <AssignmentCard rows={org.assignment} />
        </StaggerCard>
      )}
    </div>
  );
}
