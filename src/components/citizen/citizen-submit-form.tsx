/**
 * citizen-submit-form.tsx
 *
 * Citizen-first Environmental Complaint Form for GreenGuard AI.
 *
 * Flow:
 * 1. What happened? (Issue Type, Title, Priority, Description)
 * 2. Where did it happen? (ComplaintLocationMap with concise copy)
 * 3. Add Evidence (Take Photo / Gallery)
 * 4. Optional AI Assistance
 * 5. Review Complaint (ComplaintPreview)
 * 6. Submit & Track
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Save,
  Clock,
  Eye,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { useSubmitComplaint, useUploadComplaintImages } from "./citizen-queries";
import { humanizeIssueType } from "./citizen-status-utils";
import { ComplaintAIAssistant, type AIComplaintAnalysis } from "./complaint-ai-assistant";
import { ComplaintLocationMap, type LocationSelection } from "./complaint-location-map";
import { EvidenceCameraCapture } from "./evidence-camera-capture";
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
  { value: "high", label: "High", description: "Significant risk to community", color: "warning" },
  { value: "critical", label: "Critical", description: "Immediate health or safety hazard", color: "destructive" },
] as const;

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

export function CitizenSubmitForm({ onSuccess, initialDraftId }: CitizenSubmitFormProps) {
  const { city } = useCity();

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
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [pendingResumeDraft, setPendingResumeDraft] = useState<
    ReturnType<typeof useComplaintDraft>["drafts"][0] | null
  >(null);

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

  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // ── Apply AI suggestions ──────────────────────────────────────────────────
  const applyAITitle = (title: string) => set("title")(title);
  const applyAICategory = (categoryKey: string) => set("issueType")(categoryKey);
  const applyAIPriority = (priority: string) => set("severity")(priority);

  // ── Submit logic ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.description.trim()) return;

    const title =
      form.title.trim() || `${humanizeIssueType(form.issueType)} — ${city.name || "City"}`;

    const effectiveAddress = location?.address ?? form.address.trim() ?? undefined;

    submitMutation.mutate(
      {
        title,
        description: form.description.trim(),
        issueType: form.issueType,
        severity: form.severity,
        cityId: city.id,
        address: effectiveAddress,
        ...(location
          ? {
              location: {
                address: location.address,
                lat: location.lat,
                lng: location.lng,
              },
            }
          : effectiveAddress
            ? { location: { address: effectiveAddress } }
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

  function handlePreviewStep(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim() || form.description.trim().length < 10) return;
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
          className="size-14 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="size-7" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-1"
        >
          <h3 className="text-lg font-bold text-foreground">Complaint Submitted Successfully</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
            Your environmental report has been registered. You can track investigation milestones,
            message the authority, and download an official report when completed.
          </p>
        </motion.div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => setSubmittedId(null)}>
            Submit Another Report
          </Button>
          {onSuccess && (
            <Button size="sm" onClick={() => onSuccess(submittedId)}>
              View Complaint Details
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
          title: form.title || `${humanizeIssueType(form.issueType)} — ${city.name || "City"}`,
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

  // ── Main Form ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Draft Resume Banner */}
      <AnimatePresence>
        {showDraftBanner && pendingResumeDraft && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4 border border-info/30 bg-info/5 flex items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <FileText className="size-4 text-info shrink-0" />
              <div>
                <div className="text-sm font-semibold text-foreground">Resume Unsaved Draft</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Saved at {new Date(pendingResumeDraft.savedAt).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={resumeDraft}>
                Resume
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground"
                onClick={discardDraft}
              >
                Discard
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handlePreviewStep} className="space-y-6">
        {/* ── STEP 1: WHAT HAPPENED? ── */}
        <div className="space-y-4">
          <div className="border-b border-border/50 pb-2">
            <h3 className="text-sm font-semibold text-foreground">1. What happened?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select the issue category and describe what you observed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Issue Type */}
            <div className="space-y-1.5">
              <label htmlFor="citizen-issue-category" className="text-xs font-medium text-foreground/80">
                Issue Category
              </label>
              <Select
                value={form.issueType}
                onValueChange={(val) => set("issueType")(val)}
              >
                <SelectTrigger
                  id="citizen-issue-category"
                  aria-label="Issue Category"
                  className="w-full h-10 rounded-xl border border-input bg-background/40 px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <SelectValue placeholder="Select an issue category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-border/80 bg-popover/95 dark:bg-[#121822] backdrop-blur-md shadow-lg dark:border-border/60 p-1.5">
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem
                      key={t}
                      value={t}
                      className="rounded-lg py-2 pl-3 pr-8 text-sm font-medium cursor-pointer transition-colors focus:bg-primary/10 focus:text-primary dark:focus:bg-primary/15 dark:focus:text-primary data-[state=checked]:font-semibold"
                    >
                      {humanizeIssueType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/80">
                Title <span className="text-muted-foreground/60 font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. Waste accumulation near municipal market"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Priority Level</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEVERITY_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("severity")(s.value)}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-all",
                    form.severity === s.value
                      ? "border-primary bg-primary/10 shadow-2xs"
                      : "border-border bg-muted/20 hover:border-foreground/20",
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
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground/80">
                Description <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAIAssistant((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                <Sparkles className="size-3.5" />
                <span>Need help? Ask GreenGuard AI</span>
              </button>
            </div>
            <textarea
              rows={4}
              placeholder="Tell us what you observed, where it happened, and how often you noticed it."
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              required
              minLength={10}
            />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>Minimum 10 characters</span>
              <span className="tabular-nums">{form.description.length}/2000</span>
            </div>
          </div>

          {/* AI Assistant expandable panel */}
          <AnimatePresence>
            {showAIAssistant && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1"
              >
                <ComplaintAIAssistant
                  description={form.description}
                  currentCategory={form.issueType}
                  onApplyTitle={applyAITitle}
                  onApplyCategory={applyAICategory}
                  onApplyPriority={applyAIPriority}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── STEP 2: WHERE DID IT HAPPEN? ── */}
        <div className="space-y-3">
          <div className="border-b border-border/50 pb-2">
            <h3 className="text-sm font-semibold text-foreground">2. Where did it happen?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add the location where you noticed the issue.
            </p>
          </div>

          <ComplaintLocationMap
            value={location}
            onChange={setLocation}
            defaultCenter={[77.5946, 12.9716]}
            defaultZoom={13}
          />

          {/* Duplicate detector */}
          <ComplaintDuplicateDetector
            location={location}
            issueType={form.issueType}
            onJoinExisting={(id) => {
              if (onSuccess) onSuccess(id);
            }}
            onContinueNew={() => {}}
          />
        </div>

        {/* ── STEP 3: ADD EVIDENCE ── */}
        <div className="space-y-3">
          <div className="border-b border-border/50 pb-2">
            <h3 className="text-sm font-semibold text-foreground">3. Add Evidence</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attach photographs to help authorities evaluate and resolve the issue.
            </p>
          </div>

          <EvidenceCameraCapture
            files={files}
            onChange={setFiles}
            maxFiles={5}
            maxSizeMB={10}
          />
        </div>

        {/* ── ACTION FOOTER ── */}
        <div className="border-t border-border/60 pt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
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
            className="gap-2 px-5 h-10 font-semibold shadow-sm"
          >
            <Eye className="size-4" />
            Review Complaint
          </Button>
        </div>

        {submitMutation.isError && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            Something went wrong submitting your report. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}
