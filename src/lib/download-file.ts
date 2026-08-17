/**
 * Shared blob-download helper.
 *
 * Every GreenGuard report/PDF download already worked the same way: create
 * an object URL for a Blob, click a hidden `<a download>`, then revoke the
 * URL. That's preserved here exactly, so browser behavior is unchanged.
 *
 * Inside the Android app, that pattern alone isn't enough to know whether
 * the file actually reached the device: Capacitor's WebView doesn't support
 * downloading `blob:` URLs, so the native layer intercepts the click and
 * saves the file itself, asynchronously. `a.click()` has always been a
 * synchronous, void DOM call, so calling code that just runs `a.click()` and
 * assumes it worked has no way to know if the async native save actually
 * succeeded - it can only know that a click was dispatched. That's exactly
 * why "PDF downloaded successfully" could show up even when no file reached
 * Downloads.
 *
 * `downloadBlob` fixes that: when the native download bridge is present, it
 * waits for an explicit native confirmation before resolving (and rejects on
 * native failure or timeout). In a normal browser, where no such bridge
 * exists, it resolves right after the download is triggered - identical to
 * today's behavior.
 */

interface PendingDownload {
  resolve: () => void;
  reject: (err: Error) => void;
}

declare global {
  interface Window {
    /**
     * Present only inside the GreenGuard Android app. Exposed via
     * WebView#addJavascriptInterface in WebDownloadManager.java as soon as
     * the app starts - available immediately, independent of page load
     * timing (see downloadBlob below for why that distinction matters).
     */
    GreenGuardDownloader?: {
      saveBase64File: (requestId: string, base64Data: string, filename: string, mimeType: string) => void;
    };
    /** Installed by this module; called by native code with the outcome. */
    __greenguardResolveDownload?: (requestId: string, success: boolean, message?: string | null) => void;
  }
}

const pendingDownloads = new Map<string, PendingDownload>();
const NATIVE_CONFIRMATION_TIMEOUT_MS = 20_000;

if (typeof window !== "undefined" && !window.__greenguardResolveDownload) {
  window.__greenguardResolveDownload = (requestId, success, message) => {
    const entry = pendingDownloads.get(requestId);
    if (!entry) return;
    pendingDownloads.delete(requestId);
    if (success) {
      entry.resolve();
    } else {
      entry.reject(new Error(message || "Download failed"));
    }
  };
}

function createRequestId(): string {
  return `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Distinguishes *why* a PDF export failed, so the UI can show an accurate
 * message instead of a single generic "PDF generation failed" for every
 * failure mode:
 *
 * - "generate": the PDF itself could not be produced (Gemini/API/network
 *   error, or a fetch of an already-generated report failed).
 * - "save": the PDF was produced successfully, but `downloadBlob` could not
 *   get it onto the device (native save failed, or timed out on Android).
 */
export type ReportDownloadPhase = "generate" | "save";

export class ReportDownloadError extends Error {
  readonly phase: ReportDownloadPhase;
  readonly cause?: unknown;

  constructor(phase: ReportDownloadPhase, message: string, cause?: unknown) {
    super(message);
    this.name = "ReportDownloadError";
    this.phase = phase;
    this.cause = cause;
  }
}

/**
 * The single, shared "generate → save" pipeline every GreenGuard PDF export
 * should go through. Keeping generation and saving as two separately-caught
 * steps (rather than one big try/catch) is what lets every call site report
 * an accurate failure reason instead of a blanket "PDF generation failed" -
 * see ReportDownloadError.
 */
export async function generateAndDownloadPdf(
  generate: () => Promise<Blob> | Blob,
  filename: string,
  messages?: { generateFailed?: string; saveFailed?: string },
): Promise<void> {
  let blob: Blob;
  try {
    blob = await generate();
  } catch (err) {
    throw new ReportDownloadError(
      "generate",
      messages?.generateFailed ?? "The PDF could not be generated. Please try again.",
      err,
    );
  }

  try {
    await downloadBlob(blob, filename);
  } catch (err) {
    const reason = err instanceof Error && err.message ? err.message : undefined;
    const base =
      messages?.saveFailed ??
      "The PDF was generated but could not be saved to your device. Please try again.";
    // Keep the reason in the message (not just in `cause`) - every call site
    // renders `error.message` directly, so this is what actually makes a
    // save failure diagnosable instead of always showing the same string
    // regardless of whether it was a timeout, a permission/origin check, or
    // a native write error.
    throw new ReportDownloadError(
      "save",
      reason ? `${base} (${reason})` : base,
      err,
    );
  }
}

/**
 * Saves `blob` to the user's device as `filename` and triggers the normal
 * download UI. Resolves once the file is actually saved; rejects if the
 * save fails (or times out waiting for native confirmation on Android).
 *
 * Root-cause note (Android): the previous implementation always went
 * through a hidden `<a href="blob:...">` element and `.click()`, relying on
 * a *separate* page-load-injected script (installed asynchronously by
 * WebDownloadManager once Capacitor's WebView reports the page finished) to
 * intercept that click and hand the Blob to the native bridge. This
 * function only ever checked that the native JS interface object
 * (`window.GreenGuardDownloader`) existed - not that the click-interception
 * script had actually finished installing. Those two things are injected
 * independently and have no ordering guarantee relative to each other, so
 * on any load where the page-load hook lagged (or never fired for this
 * WebView instance), `a.click()` silently no-opped - Capacitor's WebView
 * doesn't natively handle blob: downloads - nothing ever called into
 * `saveBase64File`, and the promise below just sat until the 20s timeout,
 * surfacing as "could not be saved" with generation having already worked.
 *
 * Fix: when the native bridge is present, call `saveBase64File` on it
 * directly (converting the Blob ourselves via FileReader) instead of
 * indirecting through a click the page-load hook may or may not have
 * patched yet. This is the exact same native method
 * (WebDownloadManager#saveBase64File) the old click-interception path
 * called - nothing new was added on the native side. The page-load hook
 * itself is left in place in WebDownloadManager.java as a defensive
 * fallback for any other blob-URL anchor click GreenGuard code might still
 * trigger; this function just no longer depends on it for its own calls.
 */
export function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const hasNativeDownloader = typeof window !== "undefined" && !!window.GreenGuardDownloader;

  if (hasNativeDownloader) {
    return saveViaNativeDownloader(blob, filename);
  }

  // Browser: unchanged from the original implementation.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return Promise.resolve();
}

function saveViaNativeDownloader(blob: Blob, filename: string): Promise<void> {
  const requestId = createRequestId();
  const mimeType = blob.type || "application/octet-stream";

  const confirmation = new Promise<void>((resolve, reject) => {
    pendingDownloads.set(requestId, { resolve, reject });
    setTimeout(() => {
      if (pendingDownloads.delete(requestId)) {
        reject(new Error("Download timed out"));
      }
    }, NATIVE_CONFIRMATION_TIMEOUT_MS);
  });

  const fail = (message: string) => {
    const entry = pendingDownloads.get(requestId);
    if (entry) {
      pendingDownloads.delete(requestId);
      entry.reject(new Error(message));
    }
  };

  const reader = new FileReader();
  reader.onloadend = () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    const commaIdx = result.indexOf(",");
    const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : "";
    if (!base64) {
      fail("Could not read the file for download");
      return;
    }
    try {
      window.GreenGuardDownloader?.saveBase64File(requestId, base64, filename, mimeType);
    } catch (err) {
      fail(err instanceof Error ? err.message : "Could not hand the file to the native downloader");
    }
  };
  reader.onerror = () => fail("Could not read the file for download");
  reader.readAsDataURL(blob);

  return confirmation;
}
