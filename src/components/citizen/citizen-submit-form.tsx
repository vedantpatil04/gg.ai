/**
 * citizen-submit-form.tsx — Phase 12
 *
 * Enterprise-grade AI-powered complaint reporting form.
 *
 * New features vs Phase 1:
 *   1. AI Complaint Assistant (real-time analysis panel)
 *   2. Interactive MapLibre location picker (GPS + search + drag pin)
 *   3. Duplicate complaint detection
 *   4. Complaint Preview / review screen
 *   5. Draft system (auto-save + manual save + resume)
 *
 * Architecture:
 *  - Reuses existing complaintApi, useSubmitComplaint, useUploadComplaintImages
 *  - Reuses existing humanizeIssueType, getSeverityMeta
 *  - New sub-components kept in sibling files to this one
 *  - No backend changes required
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Camera,
  X,
  CheckCircle2,
  Loader2,
  MapPin,
  ChevronDown,
  Sparkles,
  Save,
  FileText,
  Clock,
  Eye,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { useSubmitComplaint, useUploadComplaintImages } from "./citizen-queries";
import { humanizeIssueType } from "./citizen-status-utils";
import { ComplaintAIAssistant, type AIComplaintAnalysis } from "./complaint-ai-assistant";
import { ComplaintLocationMap, type LocationSelection } from "./complaint-location-map";
import { ComplaintDuplicateDetector } from "./complaint-duplicate-detector";
import { ComplaintPreview } from "./complaint-preview";
import { useComplaintDraft } from "./use-complaint-draft";

// ─── Constants ────────────────────────────────────────────────────────────────

const ISSUE_TYPES = [
  "air_pollution",
  "water_contamination",
  "open_burning",
  "noise",
  "waste_dumping",
  "chemical_spill",
  "other",
] as const;

const SEVERITY_OPTIONS = [
  { value: "low", label: "Low", description: "Minor nuisance, not urgent", color: "muted-foreground" },
  { value: "medium", label: "Medium", description: "Noticeable impact", color: "info" },
  { value: "high", label: "High", description: "Significant risk", color: "warning" },
  { value: "critical", label: "Critical", description: "Immediate hazard", color: "destructive" },
] as const;

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  issueType: string;
  severity: string;
  description: string;
  address: string;
}

interface CitizenSubmitFormProps {
  onSuccess?: (complaintId: string) => void;
  initialDraftId?: string;
}

// ─── Draft resume banner ──────────────────────────────────────────────────────

function DraftResumeBanner({
  savedAt,
  onResume,
  onDiscard,
}: {
  savedAt: Date;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 border"
      style={{
        borderColor: "color-mix(in oklab, var(--color-info) 40%, transparent)",
        background: "color-mix(in oklab, var(--color-info) 5%, transparent)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <FileText className="size-4 text-info shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold">Resume Draft</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              You have an unsaved draft from {savedAt.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}.
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={onResume}>
            Resume
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-muted-foreground gap-1"
            onClick={onDiscard}
          >
            <Trash2 className="size-3" />
            Discard
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CitizenSubmitForm({ onSuccess, initialDraftId }: CitizenSubmitFormProps) {
  const { city } = useCity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    title: "",
    issueType: "air_pollution",
    severity: "medium",
    description: "",
    address: "",
  });
  const [location, setLocation] = useState<LocationSelection | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIComplaintAnalysis | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [pendingResumeDraft, setPendingResumeDraft] = useState<ReturnType<typeof useComplaintDraft>["drafts"][0] | null>(null);
  const [showDraftsList, setShowDraftsList] = useState(false);

  const submitMutation = useSubmitComplaint();
  const uploadMutation = useUploadComplaintImages();

  const draft = useComplaintDraft({ autoSaveIntervalMs: 15_000 });

  // ── Auto-save on form change ──────────────────────────────────────────────
  useEffect(() => {
    if (form.description.trim().length < 5 && !form.title.trim()) return;
    draft.saveDraft({
      title: form.title,
      issueType: form.issueType,
      severity: form.severity,
      description: form.description,
      address: form.address,
      location,
      fileNames: files.map((f) => f.name),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, location]);

  // ── Check for existing draft on mount ────────────────────────────────────
  useEffect(() => {
    if (initialDraftId) {
      const saved = draft.loadDraft(initialDraftId);
      if (saved) setPendingResumeDraft(saved);
    } else if (draft.drafts.length > 0) {
      const latest = draft.drafts[draft.drafts.length - 1];
      const ageMs = Date.now() - new Date(latest.savedAt).getTime();
      if (ageMs < 24 * 60 * 60 * 1000) {
        // Less than 24 hours old
        setPendingResumeDraft(latest);
        setShowDraftBanner(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeDraft = useCallback(() => {
    if (!pendingResumeDraft) return;
    setForm({
      title: pendingResumeDraft.title,
      issueType: pendingResumeDraft.issueType,
      severity: pendingResumeDraft.severity,
      description: pendingResumeDraft.description,
      address: pendingResumeDraft.address,
    });
    if (pendingResumeDraft.location) {
      setLocation(pendingResumeDraft.location);
    }
    setShowDraftBanner(false);
    setPendingResumeDraft(null);
  }, [pendingResumeDraft]);

  const discardDraft = useCallback(() => {
    if (pendingResumeDraft) {
      draft.deleteDraft(pendingResumeDraft.id);
    }
    setShowDraftBanner(false);
    setPendingResumeDraft(null);
  }, [pendingResumeDraft, draft]);

  // ── Field setters ─────────────────────────────────────────────────────────
  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Apply AI suggestions ──────────────────────────────────────────────────
  const applyAITitle = (title: string) => set("title")(title);
  const applyAICategory = (categoryKey: string) => set("issueType")(categoryKey);
  const applyAIPriority = (priority: string) => set("severity")(priority);

  // ── Submit logic ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.description.trim()) return;

    const title =
      form.title.trim() || `${humanizeIssueType(form.issueType)} — ${city.name}`;

    submitMutation.mutate(
      {
        title,
        description: form.description.trim(),
        issueType: form.issueType,
        severity: form.severity,
        cityId: city.id,
        address: (location?.address ?? form.address.trim()) || undefined,
        ...(location
          ? {
              location: {
                address: location.address,
                lat: location.lat,
                lng: location.lng,
              },
            }
          : form.address.trim()
            ? { location: { address: form.address.trim() } }
            : {}),
      },
      {
        onSuccess: async (res: unknown) => {
          const data = res as { data?: { complaint?: { _id?: string } } };
          const id = data?.data?.complaint?._id ?? "";
          if (files.length > 0 && id) {
            await uploadMutation.mutateAsync({ id, files }).catch(() => {});
          }
          draft.clearCurrentDraft();
          setSubmittedId(id);
          setForm({ title: "", issueType: "air_pollution", severity: "medium", description: "", address: "" });
          setFiles([]);
          setLocation(null);
          setShowPreview(false);
          if (onSuccess && id) onSuccess(id);
        },
      },
    );
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setShowPreview(true);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submittedId !== null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="size-14 rounded-full flex items-center justify-center"
          style={{ background: "color-mix(in oklab, var(--color-success) 15%, transparent)" }}
        >
          <CheckCircle2 className="size-7" style={{ color: "var(--color-success)" }} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-lg font-semibold">Complaint Submitted</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Your report has been logged and will be reviewed shortly. Track its
            progress in your complaint history.
          </p>
        </motion.div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setSubmittedId(null)}>
            Submit Another
          </Button>
          {onSuccess && (
            <Button size="sm" onClick={() => onSuccess(submittedId)}>
              View Complaint
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Preview screen ────────────────────────────────────────────────────────
  if (showPreview) {
    return (
      <ComplaintPreview
        data={{
          title: form.title || `${humanizeIssueType(form.issueType)} — ${city.name}`,
          issueType: form.issueType,
          severity: form.severity,
          description: form.description,
          location,
          files,
          aiAnalysis,
          hasDraftSaved: draft.hasDraftSaved,
        }}
        onEdit={() => setShowPreview(false)}
        onSubmit={() => void handleSubmit()}
        isSubmitting={submitMutation.isPending || uploadMutation.isPending}
      />
    );
  }

  // ── Main form layout ──────────────────────────────────────────────────────
  return (
    <div className="space-y-0">
      {/* Draft resume banner */}
      <AnimatePresence>
        {showDraftBanner && pendingResumeDraft && (
          <div className="mb-5">
            <DraftResumeBanner
              savedAt={new Date(pendingResumeDraft.savedAt)}
              onResume={resumeDraft}
              onDiscard={discardDraft}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Two-column desktop layout, single col mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Left column: Form ── */}
        <div className="space-y-4">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Optional title */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Title{" "}
                <span className="text-muted-foreground/60 font-normal">(optional — AI will suggest one)</span>
              </label>
              <Input
                placeholder="e.g. Industrial smoke near East Bridge"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Issue type */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Issue Type</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm pr-8 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  value={form.issueType}
                  onChange={(e) => set("issueType")(e.target.value)}
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {humanizeIssueType(t)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {/* Severity */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Priority</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SEVERITY_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("severity")(s.value)}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-all",
                      form.severity === s.value
                        ? "border-primary bg-primary/8 shadow-sm"
                        : "border-border bg-muted/30 hover:border-foreground/20",
                    )}
                  >
                    <span
                      className="text-xs font-semibold"
                      style={
                        form.severity === s.value
                          ? { color: `var(--color-${s.color})` }
                          : undefined
                      }
                    >
                      {s.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {s.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Describe what you observed — include time, frequency, and any visible impact. The more detail, the better."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                required
                minLength={10}
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground">Minimum 10 characters</span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    form.description.length > 1800
                      ? "text-warning"
                      : "text-muted-foreground",
                  )}
                >
                  {form.description.length}/2000
                </span>
              </div>
            </div>

            {/* Fallback manual address (shown when no map pin selected) */}
            {!location && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">
                  Address{" "}
                  <span className="text-muted-foreground/60 font-normal">(or use the map below)</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 text-sm"
                    placeholder="Street address or landmark (optional)"
                    value={form.address}
                    onChange={(e) => set("address")(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Evidence upload */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Evidence (optional)</label>
              <div
                className={cn(
                  "rounded-xl border border-dashed p-5 text-center space-y-2 transition-colors cursor-pointer",
                  "border-border hover:border-primary/40 hover:bg-primary/3",
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith("image/"),
                  );
                  setFiles((prev) => [...prev, ...dropped].slice(0, 5));
                }}
              >
                <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto">
                  <Upload className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-foreground/70">Drop photos here or</p>
                  <label className="inline-flex items-center gap-1.5 mt-1 text-xs font-medium text-primary cursor-pointer hover:underline">
                    <Camera className="size-3.5" />
                    Choose files
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const selected = Array.from(e.target.files ?? []);
                        setFiles((prev) => [...prev, ...selected].slice(0, 5));
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  JPG, PNG, WebP · Max 5 files · 10 MB each
                </p>
              </div>

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-1.5 mt-1"
                  >
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Camera className="size-3.5 text-primary" />
                          </div>
                          <span className="text-xs truncate">{f.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {(f.size / 1024).toFixed(0)}KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-muted-foreground hover:text-destructive ml-2 shrink-0 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action row */}
            <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
              <div className="flex items-center gap-3">
                {/* Manual save draft */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                  onClick={() =>
                    draft.saveDraft(
                      {
                        title: form.title,
                        issueType: form.issueType,
                        severity: form.severity,
                        description: form.description,
                        address: form.address,
                        location,
                        fileNames: files.map((f) => f.name),
                      },
                      true,
                    )
                  }
                >
                  <Save className="size-3.5" />
                  Save Draft
                </Button>

                {draft.hasDraftSaved && draft.lastSavedAt && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    Saved {draft.lastSavedAt.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                disabled={!form.description.trim() || form.description.length < 10}
                className="gap-2"
              >
                <Eye className="size-3.5" />
                Preview & Submit
              </Button>
            </div>

            {submitMutation.isError && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                Something went wrong. Please try again.
              </div>
            )}
          </form>

          {/* Drafts list (collapsible) */}
          {draft.drafts.filter((d) => !d.isAutoSave).length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDraftsList((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    Saved Drafts ({draft.drafts.filter((d) => !d.isAutoSave).length})
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
                    showDraftsList && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {showDraftsList && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border/40"
                  >
                    <div className="px-3 pb-3 pt-2 space-y-1.5">
                      {draft.drafts
                        .filter((d) => !d.isAutoSave)
                        .slice()
                        .reverse()
                        .map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2 bg-muted/20"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium truncate">
                                {d.title || humanizeIssueType(d.issueType)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(d.savedAt).toLocaleDateString("en", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            <div className="flex gap-1.5 ml-2 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => {
                                  setForm({
                                    title: d.title,
                                    issueType: d.issueType,
                                    severity: d.severity,
                                    description: d.description,
                                    address: d.address,
                                  });
                                  if (d.location) setLocation(d.location);
                                  setShowDraftsList(false);
                                }}
                              >
                                Resume
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 px-2 text-muted-foreground hover:text-destructive"
                                onClick={() => draft.deleteDraft(d.id)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ── Right column: AI + Map ── */}
        <div className="space-y-4">
          {/* AI Assistant */}
          <ComplaintAIAssistant
            description={form.description}
            currentCategory={form.issueType}
            onApplyTitle={applyAITitle}
            onApplyCategory={applyAICategory}
            onApplyPriority={applyAIPriority}
          />

          {/* Interactive Map */}
          <ComplaintLocationMap
            value={location}
            onChange={setLocation}
            defaultCenter={[77.5946, 12.9716]} // Bangalore fallback
            defaultZoom={5}
          />

          {/* Duplicate detection */}
          <ComplaintDuplicateDetector
            location={location}
            issueType={form.issueType}
            onJoinExisting={(id) => {
              // Navigate to the existing complaint's detail
              if (onSuccess) onSuccess(id);
            }}
            onContinueNew={() => {
              /* user confirmed they want to create new — no-op */
            }}
          />

          {/* AI assistant notice on small screens (shows it's active) */}
          {form.description.trim().length > 5 && (
            <div
              className="lg:hidden flex items-center gap-2 text-xs text-muted-foreground px-1"
            >
              <Sparkles className="size-3 shrink-0" style={{ color: "var(--color-primary)" }} />
              AI analysis is running — see the assistant panel above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
