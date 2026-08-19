/**
 * ImageWorkspace — environmental image upload with preview, zoom, and AI analysis.
 * Uses the existing /api/workspace/analyze-image endpoint (backend Phase 4)
 * which sends base64 image to Gemini multimodal.
 * Falls back to copilotApi.chat with a description prompt when backend endpoint
 * is not yet available (graceful degradation).
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceDropzone, type DropzoneValidation } from "./workspace-dropzone";
import { WorkspaceEmpty } from "./workspace-empty";
import { WorkspaceLoader } from "./workspace-loader";
import { WorkspacePreview } from "./workspace-preview";
import { copilotApi } from "@/lib/api/services.api";

const ACCENT = "var(--color-info)";

const VALIDATION: DropzoneValidation = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  accept: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  extensions: ["JPG", "PNG", "WEBP"],
};

const MODES = [
  { id: "pollution",      label: "Pollution Detection",       desc: "Identify visible air or water pollution" },
  { id: "waste",          label: "Waste Detection",           desc: "Detect waste accumulation or dumping" },
  { id: "environmental",  label: "Environmental Analysis",    desc: "Broad environmental observation" },
  { id: "infrastructure", label: "Infrastructure Analysis",   desc: "Assess environmental infrastructure" },
] as const;

type ModeId = typeof MODES[number]["id"];
type Stage  = "idle" | "ready" | "processing" | "done" | "error";

const MODE_PROMPTS: Record<ModeId, string> = {
  pollution:      "Analyse this image for visible air or water pollution. Describe observations cautiously using 'appears to show', 'may indicate'. State what cannot be determined from this image alone.",
  waste:          "Analyse this image for waste accumulation, illegal dumping, or environmental contamination. Describe what is visible. Use cautious language — do not claim confirmed violations.",
  environmental:  "Provide an environmental analysis of this image. Describe the visible conditions, possible concerns, and suggested next steps. State clearly what cannot be determined from this image.",
  infrastructure: "Analyse the environmental infrastructure visible in this image. Describe condition, possible maintenance needs, and environmental implications. Use cautious language.",
};

interface ImageWorkspaceProps {
  cityId: string;
  onAskAI: (prompt: string) => void;
  /** Phase 2 — Intelligence Center selected AI provider ("gemini" | "groq" |
   *  "openrouter"). Optional/omitted falls back to the server default. */
  provider?: string;
  /** Whether the selected provider actually supports image analysis here.
   *  Defaults to true (Gemini's behavior) when the caller doesn't pass it,
   *  so nothing changes for any usage that predates Phase 2. */
  imageCapable?: boolean;
  providerDisplayName?: string;
}

export function ImageWorkspace({
  cityId,
  onAskAI,
  provider,
  imageCapable = true,
  providerDisplayName = "the selected provider",
}: ImageWorkspaceProps) {
  const reduced           = useReducedMotion();
  const [file, setFile]   = useState<File | null>(null);
  const [fileError, setErr] = useState<string | null>(null);
  const [previewUrl, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [mode, setMode]   = useState<ModeId>("environmental");
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<string>("");

  // Cleanup object URL
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const validate = useCallback((f: File): string | null => {
    const allowed = new Set(VALIDATION.accept);
    if (!allowed.has(f.type)) return "Only JPG, PNG, and WEBP images are supported.";
    if (f.size === 0) return "File is empty.";
    if (f.size > VALIDATION.maxBytes) return `Image exceeds the 5 MB limit (${(f.size / 1024 / 1024).toFixed(1)} MB).`;
    return null;
  }, []);

  const handleFile = useCallback((f: File) => {
    const err = validate(f);
    if (err) { setErr(err); setFile(null); if (previewUrl) { URL.revokeObjectURL(previewUrl); setUrl(null); } return; }
    setErr(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setUrl(URL.createObjectURL(f));
    setStage("ready");
    setResult("");
  }, [validate, previewUrl]);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setUrl(null); setErr(null); setStage("idle"); setResult("");
  }, [previewUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!file || stage === "processing") return;
    setStage("processing");
    try {
      // Try workspace endpoint first; fall back to text-only chat if unavailable
      try {
        const fd = new FormData();
        fd.append("image", file, file.name);
        fd.append("mode", mode);
        const res = await fetch("/api/workspace/analyze-image", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json() as { data?: { analysis?: string } };
          setResult(json.data?.analysis || "No response received.");
          setStage("done");
          return;
        }
      } catch { /* fall through to text-based fallback */ }

      // Fallback: describe the image via text prompt
      const prompt = `${MODE_PROMPTS[mode]}\n\n[Note: Image file selected: ${file.name}, ${(file.size / 1024).toFixed(0)} KB. Provide guidance on what to look for in environmental ${mode} analysis since image content cannot be directly read in this mode.]`;
      const data = await copilotApi.chat(prompt, cityId, undefined, provider).then(r => r.data);
      setResult(data.answer || "No response received.");
      setStage("done");
    } catch {
      setResult("");
      setStage("error");
    }
  }, [file, mode, cityId, stage, provider]);

  return (
    <div className="space-y-4 p-4">
      {!imageCapable && (
        <div className="glass rounded-xl border border-border/70 p-4 space-y-1.5" role="status">
          <p className="text-xs font-medium text-foreground">
            Image analysis isn't available with {providerDisplayName}.
          </p>
          <p className="text-xs text-muted-foreground">
            Switch to Gemini using the model selector in the composer to analyze images, or choose another capability.
          </p>
        </div>
      )}

      {imageCapable && stage === "idle" && (
        <WorkspaceEmpty
          icon="🖼️"
          title="Image Analysis"
          subtitle="Upload an environmental photo for AI-powered pollution, waste, or infrastructure analysis."
          accent={ACCENT}
        />
      )}

      {imageCapable && (
        <WorkspaceDropzone
          validation={VALIDATION}
          file={file}
          error={fileError}
          accent={ACCENT}
          onFile={handleFile}
          onClear={handleClear}
        >
          {/* Inline image preview inside the file card */}
          {previewUrl && (
            <div className="space-y-2">
              <div className="relative">
                <motion.img
                  src={previewUrl}
                  alt="Environmental image preview"
                  className={cn(
                    "w-full rounded-xl object-contain border border-border bg-muted/20 transition-all duration-300 cursor-zoom-in",
                    zoomed ? "max-h-[400px]" : "max-h-48",
                  )}
                  onClick={() => setZoomed(z => !z)}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
                <button
                  onClick={() => setZoomed(z => !z)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={zoomed ? "Zoom out" : "Zoom in"}
                >
                  {zoomed ? <ZoomOut className="size-3.5" /> : <ZoomIn className="size-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Image analysis provides observations only. Results cannot confirm pollutant concentrations or legal violations.
              </p>
            </div>
          )}
        </WorkspaceDropzone>
      )}

      {imageCapable && (
      <AnimatePresence mode="wait">
        {stage === "ready" && (
          <motion.div key="controls" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Analysis mode</div>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Analysis mode">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                    className={cn(
                      "text-left text-xs px-3 py-2 rounded-lg border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                      mode === m.id
                        ? "text-primary-foreground border-transparent"
                        : "glass text-muted-foreground hover:text-foreground border-border/60",
                    )}
                    style={mode === m.id ? { background: ACCENT } : {}}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[10px] opacity-70">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              className="text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ background: ACCENT }}
            >
              <Sparkles className="size-3.5" /> Analyse Image
            </button>
          </motion.div>
        )}

        {stage === "processing" && <WorkspaceLoader key="loading" stage="processing" />}

        {stage === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass rounded-xl p-4 flex flex-col items-center gap-3 text-center" role="alert"
          >
            <p className="text-sm text-muted-foreground">Analysis failed. Please try again.</p>
            <button onClick={() => setStage("ready")} className="text-xs glass rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              Try Again
            </button>
          </motion.div>
        )}

        {stage === "done" && result && (
          <WorkspacePreview
            key="result"
            result={result}
            accent={ACCENT}
            fileName={file?.name}
            onReset={() => { setStage("ready"); setResult(""); }}
            onAskAI={onAskAI}
          />
        )}
      </AnimatePresence>
      )}
    </div>
  );
}
