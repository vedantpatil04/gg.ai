import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel, Pill } from "@/components/ui-bits";
import { Upload, MapPin, Camera, Megaphone, Users, Loader2, CheckCircle } from "lucide-react";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { complaintApi } from "@/lib/api/services.api";
import { COMPLAINTS } from "@/lib/mock-data";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/citizen")({
  head: () => ({ meta: [{ title: "Citizen Hub — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <Citizen />
    </AppLayout>
  ),
});

const ISSUE_TYPES = [
  { value: "air_pollution", label: "Air pollution" },
  { value: "water_contamination", label: "Water contamination" },
  { value: "open_burning", label: "Open burning" },
  { value: "noise", label: "Noise" },
  { value: "waste_dumping", label: "Waste dumping" },
  { value: "chemical_spill", label: "Chemical spill" },
  { value: "other", label: "Other" },
];

function Citizen() {
  const { city, isApiConnected } = useCity();
  const { user, isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    issueType: "air_pollution",
    severity: "medium",
    description: "",
    address: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const { data: myComplaints } = useQuery({
    queryKey: ["my-complaints"],
    queryFn: () => complaintApi.getMine().then((r) => r.data.complaints),
    enabled: isAuthenticated && isApiConnected,
    staleTime: 30_000,
    throwOnError: false,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      complaintApi.create({
        title: `${ISSUE_TYPES.find((t) => t.value === form.issueType)?.label} — ${city.name}`,
        description: form.description,
        issueType: form.issueType,
        severity: form.severity,
        cityId: city.id,
        location: { address: form.address },
      }),
    onSuccess: () => {
      setSubmitted(true);
      setForm({ issueType: "air_pollution", severity: "medium", description: "", address: "" });
      qc.invalidateQueries({ queryKey: ["my-complaints"] });
      setTimeout(() => setSubmitted(false), 4000);
    },
  });

  const complaints = myComplaints ?? COMPLAINTS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert("Please sign in to submit a report.");
      return;
    }
    if (!form.description.trim()) {
      alert("Please describe the issue.");
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <header>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Citizen hub
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Report. Track. Improve.</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Help your city respond faster — every report becomes a signal.
        </p>
      </header>

      {!isAuthenticated && (
        <div className="glass rounded-xl p-4 flex items-center justify-between gap-4 border border-primary/30">
          <p className="text-sm text-muted-foreground">
            Sign in to submit reports and track your contributions.
          </p>
          <Link
            to="/login"
            className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium shrink-0"
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Panel eyebrow="New report" title="Report an environmental issue">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <CheckCircle className="size-12 text-[var(--color-success)]" />
                <div className="text-lg font-semibold">Report submitted!</div>
                <div className="text-sm text-muted-foreground">
                  Your report has been logged and will be reviewed shortly.
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Issue type">
                    <select
                      className="input"
                      value={form.issueType}
                      onChange={(e) => setForm((v) => ({ ...v, issueType: e.target.value }))}
                    >
                      {ISSUE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select
                      className="input"
                      value={form.severity}
                      onChange={(e) => setForm((v) => ({ ...v, severity: e.target.value }))}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </Field>
                </div>
                <Field label="Description *">
                  <textarea
                    rows={4}
                    placeholder="Describe what you observed…"
                    className="input resize-none"
                    value={form.description}
                    onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))}
                  />
                </Field>
                <Field label="Location">
                  <div className="input flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                    <input
                      className="bg-transparent outline-none flex-1"
                      placeholder="Enter address or landmark"
                      value={form.address}
                      onChange={(e) => setForm((v) => ({ ...v, address: e.target.value }))}
                    />
                  </div>
                </Field>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Evidence (optional)</div>
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <div className="size-10 rounded-full glass grid place-items-center mx-auto">
                      <Upload className="size-4 text-primary" />
                    </div>
                    <div className="text-sm mt-3">Drop photos or videos here</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Max 25MB · JPG, PNG, MP4
                    </div>
                    <label className="mt-3 glass rounded-md px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer">
                      <Camera className="size-3.5" />
                      Choose files
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setSelectedFiles(files);
                        }}
                      />
                    </label>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                          >
                            <span>{file.name}</span>

                            <button
                              type="button"
                              onClick={() =>
                                setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="glass rounded-lg px-4 py-2 text-sm">
                    Save draft
                  </button>
                  <button
                    type="submit"
                    disabled={submitMutation.isPending || !isAuthenticated}
                    className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {submitMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    Submit report
                  </button>
                </div>
              </form>
            )}
          </Panel>

          <Panel eyebrow="Status" title="Your complaints">
            <div className="space-y-2">
              {(Array.isArray(complaints) ? complaints : COMPLAINTS).map(
                (c: {
                  id?: string;
                  _id?: string;
                  title: string;
                  status: string;
                  priority?: string;
                  severity?: string;
                  date?: string;
                  createdAt?: string;
                }) => (
                  <div
                    key={c.id ?? c._id}
                    className="rounded-xl border border-border p-3 flex flex-wrap items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Filed {c.date ?? new Date(c.createdAt ?? "").toLocaleDateString()} ·
                        priority {c.priority ?? c.severity ?? "medium"}
                      </div>
                    </div>
                    <Pill
                      tone={
                        c.status === "resolved"
                          ? "success"
                          : c.status === "in-progress"
                            ? "info"
                            : "warning"
                      }
                    >
                      {c.status}
                    </Pill>
                  </div>
                ),
              )}
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Panel eyebrow="Impact" title="Your contribution">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                [String(Array.isArray(myComplaints) ? myComplaints.length : 12), "Reports"],
                [
                  String(
                    Array.isArray(myComplaints)
                      ? myComplaints.filter((c: { status: string }) => c.status === "resolved")
                          .length
                      : 9,
                  ),
                  "Resolved",
                ],
                ["340", "Citizens helped"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-muted/40 p-4">
                  <div className="text-2xl font-semibold tabular-nums">{v}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{l}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            eyebrow="Community"
            title={
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Recent activity
              </div>
            }
          >
            <div className="space-y-3">
              {[
                { u: "Priya M.", a: "reported open burning", w: "Ward 8", t: "5m" },
                { u: "Authority", a: "resolved sewage overflow", w: "5th Cross", t: "22m" },
                { u: "Rahul K.", a: "uploaded evidence to #C-1188", w: "Lake Rd", t: "1h" },
                {
                  u: "City Bot",
                  a: "issued advisory for sensitive groups",
                  w: "City-wide",
                  t: "2h",
                },
              ].map((e, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="size-8 rounded-full aurora grid place-items-center text-[11px] text-primary-foreground font-semibold">
                    {e.u[0]}
                  </div>
                  <div className="flex-1">
                    <div>
                      <span className="font-medium">{e.u}</span>{" "}
                      <span className="text-muted-foreground">{e.a}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {e.w} · {e.t} ago
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            eyebrow="Advisory"
            title={
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-[var(--color-warning)]" />
                Active in your area
              </div>
            }
          >
            <div className="text-sm">
              Air quality moderate-to-poor between 14:00 and 18:00. Sensitive groups should limit
              outdoor activity. Hydration recommended.
            </div>
          </Panel>
        </div>
      </div>

      <style>{`.input { width:100%; border-radius:0.5rem; border:1px solid var(--color-input); background:color-mix(in oklab, var(--color-background) 40%, transparent); padding:0.625rem 0.75rem; font-size:0.875rem; outline:none; } .input:focus { border-color:var(--color-primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 20%, transparent); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
