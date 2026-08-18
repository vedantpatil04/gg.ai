/**
 * complaint-preview.tsx
 *
 * Full complaint review screen shown before final submission.
 * Displays all entered data with edit capability.
 */

import { motion } from "framer-motion";
import {
  FileText,
  Tag,
  Zap,
  AlignLeft,
  MapPin,
  Camera,
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { humanizeIssueType, getSeverityMeta } from "./citizen-status-utils";
import type { LocationSelection } from "./complaint-location-map";
import type { AIComplaintAnalysis } from "./complaint-ai-assistant";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComplaintPreviewData {
  title: string;
  issueType: string;
  severity: string;
  description: string;
  location: LocationSelection | null;
  files: File[];
  aiAnalysis: AIComplaintAnalysis | null;
  hasDraftSaved: boolean;
}

interface ComplaintPreviewProps {
  data: ComplaintPreviewData;
  onEdit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  className?: string;
}

// ─── Section card ─────────────────────────────────────────────────────────────

function PreviewSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-4 space-y-2 shadow-2xs">
      <div className="flex items-center gap-2 pb-1 border-b border-border/40">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComplaintPreview({
  data,
  onEdit,
  onSubmit,
  isSubmitting,
  className,
}: ComplaintPreviewProps) {
  const severityMeta = getSeverityMeta(data.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Review Before Submission
          </div>
          <h2 className="text-base font-bold tracking-tight text-foreground mt-0.5">Complaint Preview</h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="gap-1.5 shrink-0 text-xs">
          <ArrowLeft className="size-3.5" />
          Edit
        </Button>
      </div>

      {/* Title */}
      <PreviewSection icon={<FileText className="size-3.5" />} label="Complaint Title">
        <p className="text-sm font-semibold text-foreground">{data.title || "—"}</p>
      </PreviewSection>

      {/* Category + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <PreviewSection icon={<Tag className="size-3.5" />} label="Category">
          <p className="text-sm font-medium text-foreground">{humanizeIssueType(data.issueType)}</p>
        </PreviewSection>
        <PreviewSection icon={<Zap className="size-3.5" />} label="Priority">
          <Pill tone={severityMeta.tone}>{severityMeta.label}</Pill>
        </PreviewSection>
      </div>

      {/* Description */}
      <PreviewSection icon={<AlignLeft className="size-3.5" />} label="Description">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {data.description}
        </p>
        <div className="text-[10px] text-muted-foreground">{data.description.length} characters</div>
      </PreviewSection>

      {/* Location */}
      <PreviewSection icon={<MapPin className="size-3.5" />} label="Location">
        {data.location ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{data.location.address}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {data.location.lat.toFixed(5)}° N, {data.location.lng.toFixed(5)}° E
            </p>
            {data.location.ward && (
              <p className="text-xs text-muted-foreground">Ward: {data.location.ward}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No location selected</p>
        )}
      </PreviewSection>

      {/* Evidence */}
      <PreviewSection icon={<Camera className="size-3.5" />} label="Evidence">
        {data.files.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs rounded-lg border border-border/60 px-2.5 py-1.5 bg-muted/20 text-foreground"
              >
                <Camera className="size-3 text-muted-foreground shrink-0" />
                <span className="max-w-[120px] truncate">{f.name}</span>
                <span className="text-muted-foreground shrink-0 font-mono">{(f.size / 1024).toFixed(0)}KB</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No evidence attached</p>
        )}
      </PreviewSection>

      {/* AI Analysis summary */}
      {data.aiAnalysis && (
        <PreviewSection icon={<Sparkles className="size-3.5" />} label="AI Analysis">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-3 text-xs">
              <span>
                <span className="text-muted-foreground">Category:</span>{" "}
                <span className="font-medium">{data.aiAnalysis.category}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Confidence:</span>{" "}
                <span className="font-medium">{data.aiAnalysis.confidence}%</span>
              </span>
              <span>
                <span className="text-muted-foreground">Quality:</span>{" "}
                <span className="font-medium capitalize">{data.aiAnalysis.qualityLabel}</span>
              </span>
            </div>
            {data.aiAnalysis.missingInfo.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Missing:{" "}
                {data.aiAnalysis.missingInfo.slice(0, 2).join(" · ")}
              </div>
            )}
          </div>
        </PreviewSection>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="text-xs text-muted-foreground">
          {data.hasDraftSaved && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-success" />
              Draft saved
            </span>
          )}
        </div>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="gap-2 min-w-[140px] font-semibold shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              Submit Complaint
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
