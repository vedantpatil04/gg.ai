/**
 * WorkspaceDropzone — reusable drag-and-drop + browse file upload component.
 * Used by document-workspace, image-workspace, and data-workspace.
 * Handles: drag-over, file selection, validation feedback, file display + remove/replace.
 */
import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Upload, X, FileCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropzoneValidation {
  maxBytes: number;
  accept: string[];        // mime types
  extensions: string[];    // display e.g. ["PDF","DOCX","TXT"]
  validate?: (file: File) => string | null; // extra validation, return error string or null
}

interface WorkspaceDropzoneProps {
  validation: DropzoneValidation;
  file: File | null;
  error: string | null;
  accent: string;
  onFile: (f: File) => void;
  onClear: () => void;
  children?: React.ReactNode; // preview slot shown when file is selected
}

export function WorkspaceDropzone({
  validation, file, error, accent, onFile, onClear, children,
}: WorkspaceDropzoneProps) {
  const reduced   = useReducedMotion();
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = useCallback((f: File) => {
    onFile(f);
  }, [onFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  }, [pick]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pick(f);
    e.target.value = "";
  }, [pick]);

  const maxMb = (validation.maxBytes / 1024 / 1024).toFixed(0);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {!file ? (
          /* ── Drop area ── */
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label={`Upload file. Accepted: ${validation.extensions.join(", ")}. Max ${maxMb} MB.`}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center gap-3 py-10 px-6 rounded-2xl border-2 border-dashed cursor-pointer",
              "transition-all duration-200 text-center select-none",
              dragging
                ? "scale-[1.01]"
                : "hover:border-opacity-60",
            )}
            style={{
              borderColor: dragging ? accent : `color-mix(in oklab, ${accent} 30%, var(--border))`,
              background:  dragging
                ? `color-mix(in oklab, ${accent} 6%, var(--background))`
                : `color-mix(in oklab, ${accent} 2%, var(--background))`,
            }}
          >
            {/* Animated upload icon */}
            <motion.div
              className="size-12 rounded-xl grid place-items-center"
              style={{ background: `color-mix(in oklab, ${accent} 14%, transparent)` }}
              animate={reduced ? {} : (dragging ? { y: [-2, 2, -2] } : {})}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <Upload className="size-5" style={{ color: accent }} />
            </motion.div>

            <div>
              <div className="text-sm font-medium">
                {dragging ? "Drop to upload" : "Drag & drop or "}
                {!dragging && (
                  <span className="font-semibold" style={{ color: accent }}>browse</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {validation.extensions.join(" · ")} · Max {maxMb} MB
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept={validation.accept.join(",")}
              className="sr-only"
              aria-label="File upload input"
              onChange={handleChange}
            />
          </motion.div>
        ) : (
          /* ── File selected ── */
          <motion.div
            key="file-card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: `color-mix(in oklab, ${accent} 30%, var(--border))` }}
          >
            {/* File header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ background: `color-mix(in oklab, ${accent} 6%, var(--background))` }}
            >
              <div
                className="size-8 rounded-lg grid place-items-center shrink-0"
                style={{ background: `color-mix(in oklab, ${accent} 16%, transparent)` }}
              >
                <FileCheck className="size-4" style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="text-xs px-2 py-1 rounded-lg glass text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Replace file"
                >
                  Replace
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onClear(); }}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={validation.accept.join(",")}
                className="sr-only"
                onChange={handleChange}
              />
            </div>

            {/* Preview slot */}
            {children && <div className="p-4 border-t border-border/40">{children}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2 rounded-xl border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/8 px-3 py-2.5 text-xs text-[var(--color-destructive)]"
            role="alert" aria-live="assertive"
          >
            <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
