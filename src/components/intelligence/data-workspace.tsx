/**
 * DataWorkspace — CSV upload, safe preview table, and AI-powered analysis.
 * CSV text is sent to copilotApi.chat — no separate backend endpoint required.
 * All cell values are escaped before rendering to prevent formula injection / XSS.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceDropzone, type DropzoneValidation } from "./workspace-dropzone";
import { WorkspaceEmpty } from "./workspace-empty";
import { WorkspaceLoader } from "./workspace-loader";
import { WorkspacePreview } from "./workspace-preview";
import { copilotApi } from "@/lib/api/services.api";

const ACCENT = "var(--color-success)";

const VALIDATION: DropzoneValidation = {
  maxBytes: 200 * 1024, // 200 KB
  accept: ["text/csv", "application/csv", "text/comma-separated-values"],
  extensions: ["CSV"],
};

const MODES = [
  { id: "trends",     label: "Trend Analysis",       prompt: (cols: string, sample: string) => `Identify trends in this environmental CSV dataset.\n\nColumns: ${cols}\n\nData sample:\n${sample}\n\nDescribe patterns using 'appears to show', 'may indicate'. Do not fabricate statistics.` },
  { id: "anomalies",  label: "Anomaly Detection",    prompt: (cols: string, sample: string) => `Identify anomalies or unusual values in this environmental CSV dataset.\n\nColumns: ${cols}\n\nData:\n${sample}\n\nList values that appear unusual. Use cautious language.` },
  { id: "prediction", label: "Prediction Summary",   prompt: (cols: string, sample: string) => `Based on this environmental dataset, provide a cautious qualitative prediction summary.\n\nColumns: ${cols}\n\nData:\n${sample}\n\nDo not claim precise numerical predictions. State data limitations.` },
  { id: "insights",   label: "Pollution Insights",   prompt: (cols: string, sample: string) => `Generate pollution insights from this environmental CSV dataset.\n\nColumns: ${cols}\n\nData:\n${sample}\n\nHighlight pollution-related patterns. Distinguish observations from interpretations.` },
] as const;

type ModeId = typeof MODES[number]["id"];
type Stage  = "idle" | "ready" | "processing" | "done" | "error";

interface ParsedCsv {
  columns: string[];
  rows: string[][];
  totalRows: number;
  raw: string;
}

/** Safe CSV escape — treats all cell content as plain text */
function esc(val: string): string {
  return val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseCsv(text: string): ParsedCsv {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (!lines.length) return { columns: [], rows: [], totalRows: 0, raw: text };

  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === "," && !inQ) { out.push(cur.trim()); cur = ""; continue; }
      cur += line[i];
    }
    out.push(cur.trim());
    return out;
  };

  const columns   = split(lines[0]);
  const rows      = lines.slice(1, 6).map(split); // max 5 preview rows
  const totalRows = lines.length - 1;
  return { columns, rows, totalRows, raw: text };
}

interface DataWorkspaceProps {
  cityId: string;
  onAskAI: (prompt: string) => void;
}

export function DataWorkspace({ cityId, onAskAI }: DataWorkspaceProps) {
  const [file, setFile]       = useState<File | null>(null);
  const [fileError, setErr]   = useState<string | null>(null);
  const [parsed, setParsed]   = useState<ParsedCsv | null>(null);
  const [mode, setMode]       = useState<ModeId>("trends");
  const [stage, setStage]     = useState<Stage>("idle");
  const [result, setResult]   = useState<string>("");

  const validate = useCallback((f: File): string | null => {
    if (!f.name.toLowerCase().endsWith(".csv") && !VALIDATION.accept.includes(f.type)) {
      return "Only CSV files are supported.";
    }
    if (f.size === 0) return "File is empty.";
    if (f.size > VALIDATION.maxBytes) return `File exceeds the 200 KB limit (${(f.size / 1024).toFixed(0)} KB).`;
    return null;
  }, []);

  const handleFile = useCallback(async (f: File) => {
    const err = validate(f);
    if (err) { setErr(err); return; }
    setErr(null);
    try {
      const text = await f.text();
      const p = parseCsv(text);
      if (!p.columns.length) { setErr("Could not parse CSV headers. Ensure the file uses comma-separated values."); return; }
      setFile(f);
      setParsed(p);
      setStage("ready");
      setResult("");
    } catch {
      setErr("Could not read the file. Ensure it is UTF-8 encoded.");
    }
  }, [validate]);

  const handleClear = useCallback(() => {
    setFile(null); setParsed(null); setErr(null); setStage("idle"); setResult("");
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!parsed || stage === "processing") return;
    setStage("processing");
    try {
      const selectedMode = MODES.find(m => m.id === mode)!;
      const colStr    = parsed.columns.join(", ");
      const sampleStr = parsed.raw.slice(0, 6_000); // safe token budget
      const prompt    = selectedMode.prompt(colStr, sampleStr);
      const data = await copilotApi.chat(prompt, cityId, undefined).then(r => r.data);
      setResult(data.answer || "No response received.");
      setStage("done");
    } catch {
      setResult("");
      setStage("error");
    }
  }, [parsed, mode, cityId, stage]);

  return (
    <div className="space-y-4 p-4">
      {stage === "idle" && (
        <WorkspaceEmpty
          icon="📊"
          title="Data Analysis"
          subtitle="Upload a CSV dataset for AI-powered trend analysis, anomaly detection, and pollution insights."
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
      >
        {/* CSV preview table */}
        {parsed && parsed.columns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Table2 className="size-3.5" />
              {parsed.totalRows} rows · {parsed.columns.length} columns
            </div>
            <div
              className="overflow-x-auto rounded-xl border border-border"
              role="region"
              aria-label="CSV preview table"
            >
              <table className="w-full text-xs min-w-max" aria-label="Dataset preview">
                <thead className="bg-muted/40">
                  <tr>
                    {parsed.columns.map(col => (
                      <th
                        key={col}
                        scope="col"
                        className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap max-w-[160px] truncate"
                        title={col}
                      >
                        {esc(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/10"}>
                      {parsed.columns.map((col, ci) => (
                        <td
                          key={col}
                          className="px-3 py-1.5 max-w-[160px] truncate text-muted-foreground"
                          title={esc(row[ci] ?? "")}
                        >
                          {esc(row[ci] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.totalRows > 5 && (
              <p className="text-[10px] text-muted-foreground">Showing 5 of {parsed.totalRows} rows.</p>
            )}
          </div>
        )}
      </WorkspaceDropzone>

      <AnimatePresence mode="wait">
        {stage === "ready" && (
          <motion.div key="controls" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
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
                        ? "text-primary-foreground border-transparent"
                        : "glass text-muted-foreground hover:text-foreground border-border/60",
                    )}
                    style={mode === m.id ? { background: ACCENT } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg bg-[var(--color-info)]/8 border border-[var(--color-info)]/20 px-3 py-2 text-[10px] text-muted-foreground">
              AI analysis is interpretive. Results describe patterns in the data sample — not verified statistical calculations.
            </div>
            <button
              onClick={handleAnalyze}
              className="text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ background: ACCENT }}
            >
              <Sparkles className="size-3.5" /> Analyse Data
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
