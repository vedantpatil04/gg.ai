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
    /** Present only inside the GreenGuard Android app. */
    GreenGuardDownloader?: unknown;
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
 * Saves `blob` to the user's device as `filename` and triggers the normal
 * download UI. Resolves once the file is actually saved; rejects if the
 * save fails (or times out waiting for native confirmation on Android).
 */
export function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  const hasNativeDownloader = typeof window !== "undefined" && !!window.GreenGuardDownloader;
  let confirmation: Promise<void> = Promise.resolve();

  if (hasNativeDownloader) {
    const requestId = createRequestId();
    a.setAttribute("data-greenguard-request-id", requestId);
    confirmation = new Promise<void>((resolve, reject) => {
      pendingDownloads.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (pendingDownloads.delete(requestId)) {
          reject(new Error("Download timed out"));
        }
      }, NATIVE_CONFIRMATION_TIMEOUT_MS);
    });
  }

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return confirmation;
}
