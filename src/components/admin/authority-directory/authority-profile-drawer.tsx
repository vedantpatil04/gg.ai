import { useState } from "react";
import { format } from "date-fns";
import {
  Mail,
  MapPin,
  CalendarDays,
  Clock,
  ShieldCheck,
  ShieldX,
  Building2,
  Briefcase,
  Phone,
  IdCard,
  Tag,
  Loader2,
  Plus,
  X,
  Star,
  CheckCircle2,
  RotateCcw,
  Power,
  PowerOff,
  Lock,
  Unlock,
  Ban,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import {
  useAuthorityDetail,
  useAuthorityLifecycleHistory,
  usePerformLifecycleAction,
  useAssignCities,
  useRemoveCities,
  useSetPrimaryCity,
  type EnterpriseAuthority,
  type CapacityLabel,
} from "./authority-directory-queries";
import type { AuthorityApprovalStatus } from "@/components/admin/authority-requests/authority-request-queries";

// ─── Types ────────────────────────────────────────────────────────────────────

type LifecycleAction = "activate" | "deactivate" | "suspend" | "reinstate" | "lock" | "unlock";

interface LifecycleActionMeta {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "default" | "destructive" | "outline";
  description: string;
}

const LIFECYCLE_ACTIONS: Record<LifecycleAction, LifecycleActionMeta> = {
  activate: { label: "Activate", icon: Power, variant: "default", description: "Restore login access and set availability to Available." },
  deactivate: { label: "Deactivate", icon: PowerOff, variant: "destructive", description: "Prevent login without affecting approval status. Reversible." },
  suspend: { label: "Suspend", icon: Ban, variant: "destructive", description: "Disable account and revoke approval. Use for disciplinary action." },
  reinstate: { label: "Reinstate", icon: RefreshCw, variant: "default", description: "Restore a suspended account. Re-enables login and re-approves." },
  lock: { label: "Lock Account", icon: Lock, variant: "destructive", description: "Temporarily lock account for 24 hours." },
  unlock: { label: "Unlock", icon: Unlock, variant: "default", description: "Remove the account lock immediately." },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const APPROVAL_PILL: Record<AuthorityApprovalStatus, "success" | "warning" | "destructive"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
};

const CAPACITY_META: Record<CapacityLabel, { label: string; tone: "success" | "warning" | "destructive" | "muted" }> = {
  free: { label: "Free", tone: "success" },
  moderate: { label: "Moderate", tone: "warning" },
  busy: { label: "Busy", tone: "warning" },
  overloaded: { label: "Overloaded", tone: "destructive" },
};

function ProfileAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="relative">
      {avatar ? (
        <img src={avatar} alt={name} className="size-16 rounded-2xl object-cover" />
      ) : (
        <div className="size-16 rounded-2xl bg-primary/15 flex items-center justify-center text-xl font-semibold text-primary">
          {initials}
        </div>
      )}
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
}

function CapacityBar({ capacity, active }: { capacity: CapacityLabel; active: number }) {
  const pct = Math.min(100, (active / 12) * 100);
  const color = { free: "bg-success", moderate: "bg-warning", busy: "bg-warning", overloaded: "bg-destructive" }[capacity];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{active} active cases</span>
        <Pill tone={CAPACITY_META[capacity].tone}>{CAPACITY_META[capacity].label}</Pill>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

interface AuthorityProfileDrawerProps {
  authority: EnterpriseAuthority | null;
  onOpenChange: (open: boolean) => void;
  onApprove?: (a: EnterpriseAuthority) => void;
  onReject?: (a: EnterpriseAuthority) => void;
}

export function AuthorityProfileDrawer({
  authority,
  onOpenChange,
  onApprove,
  onReject,
}: AuthorityProfileDrawerProps) {
  const [tab, setTab] = useState("overview");
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);
  const [cityInput, setCityInput] = useState("");
  const [showCityForm, setShowCityForm] = useState(false);

  const { data: detail, isLoading: detailLoading } = useAuthorityDetail(authority?._id ?? null);
  const { data: lifecycleData, isLoading: lifecycleLoading } = useAuthorityLifecycleHistory(
    tab === "activity" ? (authority?._id ?? null) : null,
  );

  const lifecycle = usePerformLifecycleAction();
  const assignCities = useAssignCities();
  const removeCities = useRemoveCities();
  const setPrimary = useSetPrimaryCity();

  const a = detail?.authority ?? authority;
  const workload = detail?.workload ?? authority?.workload;
  const cityVolumes = detail?.cityVolumes ?? {};

  function handleLifecycleConfirm() {
    if (!pendingAction || !a) return;
    lifecycle.mutate({ id: a._id, action: pendingAction }, { onSuccess: () => setPendingAction(null) });
  }

  function handleAssignCity() {
    const city = cityInput.trim().toLowerCase();
    if (!city || !a) return;
    assignCities.mutate({ id: a._id, cities: [city] }, { onSuccess: () => { setCityInput(""); setShowCityForm(false); } });
  }

  function handleRemoveCity(city: string) {
    if (!a) return;
    removeCities.mutate({ id: a._id, cities: [city] });
  }

  function handleSetPrimary(city: string) {
    if (!a) return;
    setPrimary.mutate({ id: a._id, primaryCity: city });
  }

  const availableActions: LifecycleAction[] = [];
  if (a) {
    if (!a.isActive) availableActions.push("activate");
    if (a.isActive) availableActions.push("deactivate");
    if (a.approvalStatus !== "rejected") availableActions.push("suspend");
    if (a.approvalStatus === "rejected" || !a.isActive) availableActions.push("reinstate");
    availableActions.push("lock");
    availableActions.push("unlock");
  }

  return (
    <>
      <Sheet open={!!authority} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {!a ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* ── Sticky header ── */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4">
                <SheetHeader className="text-left gap-3">
                  <div className="flex items-start gap-4">
                    <ProfileAvatar name={a.name} avatar={a.avatar} />
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-lg">{a.name}</SheetTitle>
                      <SheetDescription className="text-xs">
                        {a.designation || "Authority"}{a.department ? ` · ${a.department}` : ""}
                        {a.employeeId && <span className="ml-1 text-muted-foreground">#{a.employeeId}</span>}
                      </SheetDescription>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Pill tone={APPROVAL_PILL[a.approvalStatus]}>{a.approvalStatus}</Pill>
                        <Pill tone={a.isActive ? "success" : "muted"}>{a.isActive ? "Active" : "Inactive"}</Pill>
                        {workload && <Pill tone={CAPACITY_META[workload.capacity].tone}>{CAPACITY_META[workload.capacity].label}</Pill>}
                        <Pill tone={a.availability === "available" ? "success" : a.availability === "on_leave" ? "info" : "muted"}>
                          {a.availability.replace("_", " ")}
                        </Pill>
                      </div>
                    </div>
                  </div>
                </SheetHeader>
              </div>

              {/* ── Tabs ── */}
              <Tabs value={tab} onValueChange={setTab} className="flex-1">
                <div className="px-6 pt-3 border-b">
                  <TabsList className="w-full justify-start gap-0 bg-transparent p-0 h-auto">
                    {["overview", "cities", "workload", "performance", "activity"].map((t) => (
                      <TabsTrigger
                        key={t}
                        value={t}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent capitalize pb-2.5 text-xs"
                      >
                        {t}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="px-6 py-5 space-y-5">
                  {/* ── Overview ── */}
                  <TabsContent value="overview" className="mt-0 space-y-5">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
                      <Field icon={Mail} label="Email" value={a.email} />
                      {a.phone && <Field icon={Phone} label="Phone" value={a.phone} />}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization</h4>
                      {a.organization && <Field icon={Building2} label="Organization" value={a.organization} />}
                      {a.department && <Field icon={Briefcase} label="Department" value={a.department} />}
                      {a.designation && <Field icon={IdCard} label="Designation" value={a.designation} />}
                      {a.employeeId && <Field icon={IdCard} label="Employee ID" value={a.employeeId} />}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h4>
                      <Field
                        icon={CalendarDays}
                        label="Joined"
                        value={format(new Date(a.createdAt), "MMMM d, yyyy")}
                      />
                      <Field
                        icon={Clock}
                        label="Last Active"
                        value={a.lastLogin ? format(new Date(a.lastLogin), "MMM d, yyyy 'at' h:mm a") : "Never"}
                      />
                      <Field
                        icon={a.isVerified ? ShieldCheck : ShieldX}
                        label="Email Verification"
                        value={a.isVerified ? "Verified" : "Unverified"}
                      />
                    </div>
                    {a.specializations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Specializations</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {a.specializations.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-primary/8 text-primary border-primary/20">
                              <Tag className="size-2.5" />
                              {s.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Quick actions for pending */}
                    {a.approvalStatus === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-1" onClick={() => onApprove?.(a)}>Approve</Button>
                        <Button variant="outline" className="flex-1 text-destructive hover:text-destructive" onClick={() => onReject?.(a)}>Reject</Button>
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Cities ── */}
                  <TabsContent value="cities" className="mt-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Assigned Cities ({(a.assignedCities ?? []).length})
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setShowCityForm((v) => !v)}
                      >
                        <Plus className="size-3" />
                        Add
                        <ChevronDown className={cn("size-3 transition-transform", showCityForm && "rotate-180")} />
                      </Button>
                    </div>

                    {showCityForm && (
                      <div className="flex gap-2">
                        <Input
                          value={cityInput}
                          onChange={(e) => setCityInput(e.target.value)}
                          placeholder="City ID (e.g. belagavi)"
                          className="h-8 text-sm flex-1"
                          onKeyDown={(e) => e.key === "Enter" && handleAssignCity()}
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={assignCities.isPending || !cityInput.trim()}
                          onClick={handleAssignCity}
                        >
                          {assignCities.isPending ? <Loader2 className="size-3 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    )}

                    {(a.assignedCities ?? []).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed">
                        No cities assigned yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(a.assignedCities ?? []).map((city) => {
                          const isPrimary = city === a.primaryCity;
                          const volume = cityVolumes[city] ?? 0;
                          return (
                            <div
                              key={city}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                isPrimary ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30",
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <MapPin className={cn("size-4 shrink-0", isPrimary ? "text-primary" : "text-muted-foreground")} />
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium capitalize">{city}</span>
                                    {isPrimary && (
                                      <Pill tone="primary">Primary</Pill>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{volume} complaint{volume !== 1 ? "s" : ""}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {!isPrimary && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[11px] px-2 gap-1"
                                    disabled={setPrimary.isPending}
                                    onClick={() => handleSetPrimary(city)}
                                  >
                                    <Star className="size-3" />
                                    Set Primary
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  disabled={removeCities.isPending}
                                  onClick={() => handleRemoveCity(city)}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* ── Workload ── */}
                  <TabsContent value="workload" className="mt-0 space-y-5">
                    {detailLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                    ) : workload ? (
                      <>
                        <CapacityBar capacity={workload.capacity} active={workload.active} />
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Active", value: workload.active, color: "text-primary" },
                            { label: "Pending", value: workload.pending, color: "text-warning" },
                            { label: "Rework", value: workload.rework, color: "text-destructive" },
                            { label: "Verification", value: workload.verificationWaiting ?? workload.resolved, color: "text-info" },
                            { label: "Closed", value: workload.closed, color: "text-success" },
                            { label: "Total Assigned", value: workload.total, color: "text-foreground" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-xl border bg-muted/30 p-3">
                              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                              <div className={cn("text-2xl font-semibold mt-1", color)}>{value}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No workload data available.</p>
                    )}
                  </TabsContent>

                  {/* ── Performance ── */}
                  <TabsContent value="performance" className="mt-0 space-y-5">
                    {detailLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                    ) : workload ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border bg-success/8 p-4 text-center">
                            <div className="text-3xl font-semibold text-success">{workload.resolutionRate}%</div>
                            <div className="text-xs text-muted-foreground mt-1">Resolution Rate</div>
                          </div>
                          <div className="rounded-xl border bg-destructive/8 p-4 text-center">
                            <div className="text-3xl font-semibold text-destructive">{workload.reworkRate ?? 0}%</div>
                            <div className="text-xs text-muted-foreground mt-1">Rework Rate</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border bg-muted/30 p-3 text-center">
                            <div className="text-2xl font-semibold">{workload.closed}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Cases Closed</div>
                          </div>
                          <div className="rounded-xl border bg-muted/30 p-3 text-center">
                            <div className="text-2xl font-semibold">{workload.rework}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Rework Count</div>
                          </div>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground mb-1">Performance Score</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${workload.resolutionRate}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{workload.resolutionRate}</span>
                          </div>
                        </div>
                        {workload.total < 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            Performance metrics are more meaningful with more assigned cases.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No performance data available.</p>
                    )}
                  </TabsContent>

                  {/* ── Activity / Timeline ── */}
                  <TabsContent value="activity" className="mt-0 space-y-3">
                    {lifecycleLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
                    ) : (lifecycleData?.lifecycleEvents ?? []).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8 rounded-xl border border-dashed">
                        No lifecycle events recorded yet.
                      </div>
                    ) : (
                      <div className="relative pl-4 space-y-0">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                        {[...((lifecycleData?.lifecycleEvents ?? []) as Array<{ event: string; description: string; performedByName?: string; at: string }>)]
                          .reverse()
                          .map((evt, i) => (
                            <div key={i} className="relative pl-5 pb-5 last:pb-0">
                              <div className="absolute -left-[5px] top-1 size-2.5 rounded-full border-2 border-primary bg-background" />
                              <div className="rounded-xl border bg-muted/30 p-3 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold capitalize">{evt.event.replace(/_/g, " ")}</span>
                                  <span className="text-[10px] text-muted-foreground shrink-0">
                                    {format(new Date(evt.at), "MMM d, yyyy 'at' h:mm a")}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{evt.description}</p>
                                {evt.performedByName && (
                                  <p className="text-[10px] text-muted-foreground">By {evt.performedByName}</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                </div>

                {/* ── Lifecycle actions (sticky footer) ── */}
                {a.approvalStatus === "approved" && (
                  <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-4">
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                        Lifecycle Actions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableActions.map((action) => {
                          const meta = LIFECYCLE_ACTIONS[action];
                          const Icon = meta.icon;
                          return (
                            <Button
                              key={action}
                              variant={meta.variant}
                              size="sm"
                              className="h-8 text-xs gap-1.5"
                              disabled={lifecycle.isPending}
                              onClick={() => setPendingAction(action)}
                            >
                              <Icon className="size-3" />
                              {meta.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Lifecycle Confirmation Dialog ── */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction ? LIFECYCLE_ACTIONS[pendingAction].label : ""} this account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction ? LIFECYCLE_ACTIONS[pendingAction].description : ""}
              {a && (
                <span className="block mt-2">
                  Account: <strong className="text-foreground">{a.name}</strong> ({a.email})
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lifecycle.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={lifecycle.isPending}
              className={cn(
                pendingAction &&
                  ["deactivate", "suspend", "lock"].includes(pendingAction) &&
                  "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
              )}
              onClick={(e) => { e.preventDefault(); handleLifecycleConfirm(); }}
            >
              {lifecycle.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
