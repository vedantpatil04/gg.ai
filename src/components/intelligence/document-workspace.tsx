/**
 * DocumentWorkspace — TXT file upload + AI analysis.
 * PDF and DOCX display an "unsupported" notice — no parser is installed.
 * All analysis routes through the existing copilotApi.chat endpoint.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceDropzone, type DropzoneValidation } from "./workspace-dropzone";
import { WorkspaceEmpty } from "./workspace-empty";
import { WorkspaceLoader, type LoaderStage } from "./workspace-loader";
import { WorkspacePreview } from "./workspace-preview";
import { copilotApi } from "@/lib/api/services.api";

const ACCENT = "var(--color-primary)";

const VALIDATION: DropzoneValidation = {
  maxBytes: 500 * 1024, // 500 KB — safe for text-based content
  accept: ["text/plain"],
  extensions: ["TXT"],
};

const MODES = [
  { id: "summarize",    label: "Summarize",       prompt: (text: string) => `Summarize this environmental document concisely:\n\n${text}` },
  { id: "key-points",  label: "Key Points",       prompt: (text: string) => `Extract the key findings from this environmental document as bullet points:\n\n${text}` },
  { id: "risk",        label: "Risk Analysis",    prompt: (text: string) => `Identify environmental risks and concerns in this document:\n\n${text}` },
  { id: "report",      label: "Generate Report",  prompt: (text: string) => `Write a concise environmental intelligence report based on this document:\n\n${text}` },
] as const;

type ModeId = typeof MODES[number]["id"];
type Stage  = "idle" | "ready" | "processing" | "done" | "error";

interface DocumentWorkspaceProps {
  cityId: string;
  onAskAI: (prompt: string) => void;
}

export function DocumentWorkspace({ cityId, onAskAI }: DocumentWorkspaceProps) {
  const [file, setFile]       = useState<File | null>(null);
  const [fileError, setError] = useState<string | null>(null);
  const [mode, setMode]       = useState<ModeId>("summarize");
  const [stage, setStage]     = useState<Stage>("idle");
  const [result, setResult]   = useState<string>("");

  const validate = useCallback((f: File): string | null => {
    if (!["text/plain"].includes(f.type) && !f.name.toLowerCase().endsWith(".txt")) {
      return "Only TXT files are supported. PDF and DOCX require additional backend libraries not yet installed.";
    }
    if (f.size === 0) return "File is empty.";
    if (f.size > VALIDATION.maxBytes) return `File exceeds the 500 KB limit (${(f.size / 1024).toFixed(0)} KB).`;
    return null;
  }, []);

  const handleFile = useCallback((f: File) => {
    const err = validate(f);
    if (err) { setError(err); setFile(null); return; }
    setError(null);
    setFile(f);
    setStage("ready");
    setResult("");
  }, [validate]);

  const handleClear = useCallback(() => {
    setFile(null); setError(null); setStage("idle"); setResult("");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file || stage === "processing") return;
    setStage("processing");
    try {
      const text = await file.text();
      const selectedMode = MODES.find(m => m.id === mode)!;
      const prompt = selectedMode.prompt(text.slice(0, 12_000)); // safe token budget
      const data = await copilotApi.chat(prompt, cityId, undefined).then(r => r.data);
      setResult(data.answer || "No response received.");
      setStage("done");
    } catch {
      setResult("");
      setStage("error");
    }
  }, [file, mode, cityId, stage]);

  return (
    <div className="space-y-4 p-4">
      {stage === "idle" && (
        <WorkspaceEmpty
          icon="📄"
          title="Document Analysis"
          subtitle="Upload a TXT environmental document to summarize, extract key points, or generate a report."
          accent={ACCENT}
        />
      )}

      <WorkspaceDropzone
        validation={VALIDATION}
        file={file}
        error={fileError}
        accent={ACCENT}
        onFile={handleFile}
        onClear={handleClear}
      />

      <AnimatePresence mode="wait">
        {stage === "ready" && (
          <motion.div key="controls" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Mode selector */}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">Analysis mode</div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Analysis mode">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    aria-pressed={mode === m.id}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border transition-all duration-150",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                      mode === m.id
                        ? "aurora text-primary-foreground border-transparent"
                        : "glass text-muted-foreground hover:text-foreground border-border/60",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              className="aurora text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 shadow-[var(--shadow-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Sparkles className="size-3.5" /> Analyse Document
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
    </div>
  );
}
