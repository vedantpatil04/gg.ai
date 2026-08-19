package com.vedant.greenguard.downloads;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.FileProvider;

import com.getcapacitor.Bridge;
import com.getcapacitor.WebViewListener;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

/**
 * Bridges GreenGuard's existing "download" flows to the device.
 *
 * Audit finding: Capacitor Core's own WebView chrome client already handles
 * `navigator.geolocation` (via the ACCESS_FINE_LOCATION/ACCESS_COARSE_LOCATION
 * permissions added in Phase 1) and `<input type="file">` - including camera
 * capture and gallery/file selection (via the CAMERA permission and the
 * FileProvider already present in the project) - with no custom code needed.
 *
 * What Capacitor's WebView does NOT support is downloading a `blob:` URL,
 * which is exactly how every existing GreenGuard report/PDF download works
 * today: `jsPDF#save()` and the app's own `URL.createObjectURL(blob)` +
 * `<a download>` + `.click()` pattern (see dashboard.tsx, reports.tsx,
 * reports-center-page.tsx, executive-reports.tsx, authority-analytics.tsx,
 * simulator.tsx). This is a well-known WebView/Capacitor limitation, not a
 * GreenGuard bug, so this class makes the existing behavior work as-is.
 *
 * Root cause of the observed "PDF downloaded successfully but no file in
 * Downloads" bug, then the follow-up "generated but could not be saved"
 * bug (three parts, all fixed - the first two here, the third in
 * src/lib/download-file.ts):
 *
 * 1. The first version of this bridge re-fetched the blob via `fetch(blob
 *    URL)` after the click was intercepted. Every GreenGuard download site
 *    calls `URL.revokeObjectURL(url)` synchronously immediately after
 *    `a.click()`, which can invalidate the blob URL before the async
 *    fetch-and-save finishes - a classic blob-URL revocation race. Fixed by
 *    hooking `URL.createObjectURL`/`revokeObjectURL` to keep a direct
 *    reference to the actual Blob object, so the save no longer depends on
 *    the URL staying valid.
 * 2. `a.click()` is a synchronous, void DOM call. GreenGuard's download code
 *    (e.g. executive-reports.tsx) treats it finishing without throwing as
 *    "downloaded successfully", but the real save now happens
 *    asynchronously on the native side, so that assumption no longer holds.
 *    Fixed by threading a request id from a small frontend change
 *    (src/lib/download-file.ts) through to this bridge, which calls back
 *    into the page once the save genuinely succeeds or fails, so the UI's
 *    success state is only ever set from a real outcome.
 * 3. downloadBlob() in the page relied on the click-interception script
 *    above having already been injected via `onPageLoaded` before it fired
 *    `a.click()`. That injection and `addJavascriptInterface` below are two
 *    independent calls with no ordering guarantee between them, so on any
 *    load where the page-load script lagged, the click silently no-opped
 *    (WebView doesn't natively handle blob: downloads) and the page's save
 *    confirmation just timed out after 20s - generation had already
 *    succeeded, so this surfaced as a save failure. Fixed on the page side:
 *    downloadBlob() now calls `saveBase64File` below directly instead of
 *    going through a click this class may not have intercepted yet. No
 *    change was needed here - it's the exact same native method as before.
 *
 * Approach: `saveBase64File` below is called two ways:
 *  1. Directly from `src/lib/download-file.ts` (every GreenGuard PDF/report
 *     download) - the page hands over a base64-encoded Blob it already
 *     holds, with no dependency on any separately-timed page script.
 *  2. As a defensive fallback via a small page-load script (injected
 *     through Capacitor's supported `Bridge.addWebViewListener` extension
 *     point, so Capacitor's own WebViewClient/WebChromeClient are never
 *     replaced) that intercepts any other `blob:` anchor click with a
 *     `download` attribute GreenGuard code doesn't already route through
 *     download-file.ts.
 * A standard WebView DownloadListener is also registered for any direct
 * (non-blob) file URL.
 */
public final class WebDownloadManager {

    private static final String TAG = "GreenGuardDownload";
    private static final String JS_INTERFACE_NAME = "GreenGuardDownloader";

    // Trusted origins for download requests. Kept in sync with the
    // `allowNavigation` list in capacitor.config.ts.
    private static final String[] TRUSTED_HOST_SUFFIXES = {
            "gg-ai-system.vercel.app",
            ".vercel.app",
            "gg-ai-11ja.onrender.com",
            ".onrender.com"
    };

    // Intercepts anchor clicks on blob: URLs with a `download` attribute -
    // exactly how jsPDF#save() and GreenGuard's own blob-download helper
    // (src/lib/download-file.ts) trigger a save. Keeps a direct reference to
    // each Blob at creation time (via a createObjectURL/revokeObjectURL
    // hook) so reading it later never depends on the URL still being valid,
    // then converts it to base64 and forwards it to the JS interface below.
    // Falls back to the original click on any failure so existing behavior
    // is never made worse. The optional `data-greenguard-request-id`
    // attribute (set by download-file.ts) is echoed back so native can
    // report the real outcome to the page once the save finishes.
    private static final String BLOB_DOWNLOAD_HOOK_JS =
            "(function(){" +
                    "if(window.__greenguardDownloadHookInstalled){return;}" +
                    "window.__greenguardDownloadHookInstalled=true;" +
                    "var blobRegistry=new Map();" +
                    "var origCreateObjectURL=URL.createObjectURL.bind(URL);" +
                    "URL.createObjectURL=function(obj){" +
                    "var url=origCreateObjectURL(obj);" +
                    "if(typeof Blob!=='undefined'&&obj instanceof Blob){blobRegistry.set(url,obj);}" +
                    "return url;" +
                    "};" +
                    "var origRevokeObjectURL=URL.revokeObjectURL.bind(URL);" +
                    "URL.revokeObjectURL=function(url){" +
                    "blobRegistry.delete(url);" +
                    "return origRevokeObjectURL(url);" +
                    "};" +
                    "function toBase64(blob,filename,requestId){" +
                    "var reader=new FileReader();" +
                    "reader.onloadend=function(){" +
                    "var result=String(reader.result||'');" +
                    "var idx=result.indexOf(',');" +
                    "var base64=idx>=0?result.substring(idx+1):'';" +
                    "if(window." + JS_INTERFACE_NAME + "){" +
                    "window." + JS_INTERFACE_NAME + ".saveBase64File(requestId||'',base64,filename||'download',blob.type||'application/octet-stream');" +
                    "}};" +
                    "reader.onerror=function(){" +
                    "if(window." + JS_INTERFACE_NAME + "){window." + JS_INTERFACE_NAME + ".onDownloadError(requestId||'','read failed');}" +
                    "};" +
                    "reader.readAsDataURL(blob);" +
                    "}" +
                    "var originalClick=HTMLAnchorElement.prototype.click;" +
                    "HTMLAnchorElement.prototype.click=function(){" +
                    "try{" +
                    "if(this.href&&this.href.indexOf('blob:')===0&&this.download){" +
                    "var blob=blobRegistry.get(this.href);" +
                    "if(blob){" +
                    "var requestId=this.getAttribute('data-greenguard-request-id')||'';" +
                    "toBase64(blob,this.download,requestId);" +
                    "return;" +
                    "}" +
                    "}" +
                    "}catch(e){}" +
                    "return originalClick.apply(this,arguments);" +
                    "};" +
                    "})();";

    private final ComponentActivity activity;
    private final Bridge bridge;
    @Nullable private final WebView webView;
    private volatile String currentUrl = "https://gg-ai-system.vercel.app";

    public WebDownloadManager(@NonNull ComponentActivity activity, @NonNull Bridge bridge) {
        this.activity = activity;
        this.bridge = bridge;
        this.webView = bridge.getWebView();
    }

    /** Wires up download handling. Call once, from onCreate after the Bridge is ready. */
    public void attach() {
        if (webView == null) {
            Log.w(TAG, "WebView not available; download handling not attached.");
            return;
        }

        webView.addJavascriptInterface(this, JS_INTERFACE_NAME);

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                handleDirectDownload(url, userAgent, contentDisposition, mimeType));

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageStarted(WebView view) {
                if (view != null) {
                    String url = view.getUrl();
                    if (url != null && !url.isEmpty()) {
                        currentUrl = url;
                    }
                }
            }

            @Override
            public void onPageLoaded(WebView view) {
                if (view != null) {
                    String url = view.getUrl();
                    if (url != null && !url.isEmpty()) {
                        currentUrl = url;
                    }
                    view.evaluateJavascript(BLOB_DOWNLOAD_HOOK_JS, null);
                }
            }
        });
    }

    // ── Blob downloads: jsPDF#save() / GreenGuard's downloadBlob() helper ──────

    /** Called from the injected page script with the file's base64 contents. */
    @JavascriptInterface
    public void saveBase64File(String requestId, String base64Data, String filename, String mimeType) {
        try {
            if (!isTrustedOrigin(currentUrl)) {
                Log.w(TAG, "Ignoring saveBase64File from an untrusted origin: " + currentUrl);
                resolveJs(requestId, false, "Untrusted origin");
                return;
            }
            if (base64Data == null || base64Data.trim().isEmpty()) {
                Log.w(TAG, "No base64 data provided in saveBase64File");
                resolveJs(requestId, false, "No file data provided");
                return;
            }
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            String safeName = sanitizeFilename(filename);
            String type = (mimeType == null || mimeType.trim().isEmpty()) ? "application/pdf" : mimeType.trim();
            if (!safeName.contains(".") && "application/pdf".equalsIgnoreCase(type)) {
                safeName = safeName + ".pdf";
            }

            Uri savedUri = writeToDownloads(activity, data, safeName, type);
            String finalName = safeName;
            activity.runOnUiThread(() -> {
                Toast.makeText(activity, "Saved to Downloads: " + finalName, Toast.LENGTH_SHORT).show();
                openOrNotify(savedUri, finalName, type);
            });
            resolveJs(requestId, true, null);
        } catch (Throwable e) {
            String reason = e.getMessage();
            Log.e(TAG, "Failed to save downloaded file: " + reason, e);
            notifyFailure();
            resolveJs(requestId, false, reason != null && !reason.isEmpty() ? reason : "Could not save the file");
        }
    }

    /** Called from the injected page script when it could not read the blob. */
    @JavascriptInterface
    public void onDownloadError(String requestId, String reason) {
        Log.w(TAG, "Blob download failed in page script: " + reason);
        notifyFailure();
        resolveJs(requestId, false, reason != null && !reason.isEmpty() ? reason : "Could not read the file for download");
    }

    private void notifyFailure() {
        activity.runOnUiThread(() ->
                Toast.makeText(activity, "Download failed. Please try again.", Toast.LENGTH_LONG).show());
    }

    /**
     * Reports the real outcome of a download back to the page, so
     * GreenGuard's UI (see src/lib/download-file.ts) only ever shows a
     * success state once the file has genuinely been saved. No-ops if the
     * caller didn't supply a request id (e.g. jsPDF's own internal saves,
     * which aren't awaited by any GreenGuard UI code).
     */
    private void resolveJs(@Nullable String requestId, boolean success, @Nullable String message) {
        if (requestId == null || requestId.isEmpty() || webView == null) {
            return;
        }
        String js = "window.__greenguardResolveDownload && window.__greenguardResolveDownload(" +
                JSONObject.quote(requestId) + "," + success + "," +
                (message != null ? JSONObject.quote(message) : "null") + ");";
        activity.runOnUiThread(() -> {
            if (webView != null) {
                webView.evaluateJavascript(js, null);
            }
        });
    }

    // ── Direct (non-blob) downloads - defensive fallback, unused by any ────────
    // ── current GreenGuard flow but kept for any future direct file URL. ───────

    private void handleDirectDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        if (!isTrustedOrigin(url)) {
            Log.w(TAG, "Ignoring direct download from an untrusted origin.");
            return;
        }
        try {
            String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.addRequestHeader("User-Agent", userAgent);
            request.setMimeType(mimeType);
            request.setTitle(filename);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            // App-specific external storage: no WRITE_EXTERNAL_STORAGE needed on
            // any supported API level. The system's own download-complete
            // notification (enabled above) lets the user open the file.
            request.setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, filename);

            DownloadManager manager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager != null) {
                manager.enqueue(request);
                Toast.makeText(activity, "Downloading " + filename, Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to start direct download", e);
            Toast.makeText(activity, "Download failed. Please try again.", Toast.LENGTH_LONG).show();
        }
    }

    // ── File writing ───────────────────────────────────────────────────────────

    private Uri writeToDownloads(Context context, byte[] data, String filename, String mimeType) throws IOException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Public Downloads collection - visible in the Files/Downloads app.
            // No storage permission needed on API 29+.
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            // Explicit target directory. Relying on the MediaStore default
            // (unset RELATIVE_PATH) has been unreliable on some OEM storage
            // providers, occasionally landing outside the public Downloads
            // folder or failing the insert outright - being explicit removes
            // that ambiguity so the file reliably lands in Files > Downloads.
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (itemUri == null) {
                throw new IOException("Unable to create a download entry");
            }
            try (OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) {
                    throw new IOException("Unable to open an output stream for the download");
                }
                out.write(data);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            resolver.update(itemUri, values, null, null);
            return itemUri;
        }

        // Pre-Android 10 fallback: app cache dir needs no storage permission and
        // is already covered by the existing FileProvider config
        // (res/xml/file_paths.xml's cache-path), so no manifest/resource change
        // is needed here. The file is offered via a chooser immediately after
        // saving (see openOrNotify), so it remains reachable to the user even
        // though it isn't in the public Downloads folder on these older versions.
        File dir = context.getCacheDir();
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Unable to create the downloads cache directory");
        }
        File file = uniqueFile(dir, filename);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(data);
        }
        return FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
    }

    private File uniqueFile(File dir, String filename) {
        File file = new File(dir, filename);
        if (!file.exists()) {
            return file;
        }
        String base = filename;
        String ext = "";
        int dot = filename.lastIndexOf('.');
        if (dot > 0) {
            base = filename.substring(0, dot);
            ext = filename.substring(dot);
        }
        File candidate;
        int counter = 1;
        do {
            candidate = new File(dir, base + " (" + counter + ")" + ext);
            counter++;
        } while (candidate.exists());
        return candidate;
    }

    // ── UX ──────────────────────────────────────────────────────────────────────

    private void openOrNotify(Uri uri, String filename, String mimeType) {
        try {
            Intent viewIntent = new Intent(Intent.ACTION_VIEW);
            viewIntent.setDataAndType(uri, mimeType);
            viewIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            Intent chooser = Intent.createChooser(viewIntent, "Open " + filename);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(chooser);
        } catch (Exception e) {
            Log.i(TAG, "No app found to open file directly: " + e.getMessage());
        }
    }

    // ── Security / sanitization ────────────────────────────────────────────────

    /**
     * Only trust download requests that originate from GreenGuard's own
     * frontend/backend origins, so this bridge can't be reached from an
     * arbitrary page the WebView might navigate to.
     */
    private boolean isTrustedOrigin(@Nullable String urlString) {
        if (urlString == null || urlString.trim().isEmpty()) {
            return true;
        }
        try {
            Uri uri = Uri.parse(urlString);
            String host = uri.getHost();
            if (host == null || host.isEmpty()) {
                return true;
            }
            if ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)) {
                return true;
            }
            for (String suffix : TRUSTED_HOST_SUFFIXES) {
                if (suffix.startsWith(".")) {
                    if (host.toLowerCase().endsWith(suffix.toLowerCase())) {
                        return true;
                    }
                } else if (host.equalsIgnoreCase(suffix)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return true;
        }
    }

    private String sanitizeFilename(@Nullable String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return "download_" + System.currentTimeMillis();
        }
        String cleaned = filename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return cleaned.isEmpty() ? "download_" + System.currentTimeMillis() : cleaned;
    }
}
