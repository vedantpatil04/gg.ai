import { useState, useRef } from "react";
import {
  Upload,
  Camera,
  X,
  CheckCircle2,
  Loader2,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { useSubmitComplaint, useUploadComplaintImages } from "./citizen-queries";
import { humanizeIssueType } from "./citizen-status-utils";

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
  { value: "low", label: "Low", description: "Minor nuisance, not urgent" },
  { value: "medium", label: "Medium", description: "Noticeable impact on environment" },
  { value: "high", label: "High", description: "Significant environmental risk" },
  { value: "critical", label: "Critical", description: "Immediate hazard or danger" },
] as const;

interface FormState {
  issueType: string;
  severity: string;
  description: string;
  address: string;
}

interface CitizenSubmitFormProps {
  onSuccess?: (complaintId: string) => void;
}

export function CitizenSubmitForm({ onSuccess }: CitizenSubmitFormProps) {
  const { city } = useCity();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    issueType: "air_pollution",
    severity: "medium",
    description: "",
    address: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const submitMutation = useSubmitComplaint();
  const uploadMutation = useUploadComplaintImages();

  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;

    const title = `${humanizeIssueType(form.issueType)} — ${city.name}`;
    submitMutation.mutate(
      {
        title,
        description: form.description.trim(),
        issueType: form.issueType,
        severity: form.severity,
        cityId: city.id,
        address: form.address.trim() || undefined,
      },
      {
        onSuccess: async (res: unknown) => {
          const data = res as { data?: { complaint?: { _id?: string } } };
          const id = data?.data?.complaint?._id ?? "";
          if (files.length > 0 && id) {
            await uploadMutation.mutateAsync({ id, files }).catch(() => {});
          }
          setSubmittedId(id);
          setForm({ issueType: "air_pollution", severity: "medium", description: "", address: "" });
          setFiles([]);
          if (onSuccess && id) onSuccess(id);
        },
      },
    );
  }

  if (submittedId !== null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <div className="size-14 rounded-full bg-success/15 flex items-center justify-center">
          <CheckCircle2 className="size-7 text-success" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Complaint Submitted</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Your report has been logged and will be reviewed shortly. You can track its progress
            in your complaint history.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSubmittedId(null); }}
          >
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

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Issue type */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Issue Type</label>
        <div className="relative">
          <select
            className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm pr-8 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
                  ? "border-primary bg-primary/8"
                  : "border-border bg-muted/30 hover:border-foreground/20",
              )}
            >
              <span className="text-xs font-semibold">{s.label}</span>
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
          rows={4}
          placeholder="Describe what you observed — include time, frequency, and any visible impact…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          value={form.description}
          onChange={(e) => set("description")(e.target.value)}
          required
          minLength={10}
        />
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground">Minimum 10 characters</span>
          <span className="text-[10px] text-muted-foreground">{form.description.length}/2000</span>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Street address or landmark (optional)"
            value={form.address}
            onChange={(e) => set("address")(e.target.value)}
          />
        </div>
      </div>

      {/* Evidence upload */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground font-medium">Evidence (optional)</label>
        <div className="rounded-xl border border-dashed border-border p-5 text-center space-y-3">
          <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto">
            <Upload className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-foreground/70">Drop photos here or</p>
            <label className="inline-flex items-center gap-1.5 mt-1.5 text-xs font-medium text-primary cursor-pointer hover:underline">
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
            JPG, PNG, WebP · Max 5 files · 10MB each
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-1.5 mt-2">
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
                  className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitMutation.isPending || !form.description.trim()}
          className="gap-2"
        >
          {submitMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {submitMutation.isPending ? "Submitting…" : "Submit Complaint"}
        </Button>
      </div>

      {submitMutation.isError && (
        <p className="text-xs text-destructive text-center">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
