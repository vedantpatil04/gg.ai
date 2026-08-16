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
 * GreenGuard bug, so no frontend changes were made or are required - this
 * class makes the existing behavior work as-is.
 *
 * Approach: a small page-load script (injected via Capacitor's supported
 * `Bridge.addWebViewListener` extension point, so Capacitor's own
 * WebViewClient/WebChromeClient are never replaced) intercepts anchor clicks
 * on `blob:` URLs with a `download` attribute, reads the blob as base64, and
 * hands it to a narrowly-scoped JavaScript interface that saves it natively.
 * A standard WebView DownloadListener is also registered as a defensive
 * fallback for any direct (non-blob) file URL.
 */
public final class WebDownloadManager {

    private static final String TAG = "GreenGuardDownload";
    private static final String JS_INTERFACE_NAME = "GreenGuardDownloader";

    // Trusted origins for download requests. Kept in sync with the
    // `allowNavigation` list in capacitor.config.ts.
    private static final String[] TRUSTED_HOST_SUFFIXES = {
            "gg-ai-woad.vercel.app",
            ".vercel.app",
            "gg-ai-11ja.onrender.com",
            ".onrender.com"
    };

    // Intercepts anchor clicks on blob: URLs with a `download` attribute -
    // exactly how jsPDF#save() and GreenGuard's own blob-download helpers
    // trigger a save - converts the blob to base64, and forwards it to the
    // JS interface below. Falls back to the original click on any failure
    // so existing behavior is never made worse.
    private static final String BLOB_DOWNLOAD_HOOK_JS =
            "(function(){" +
                    "if(window.__greenguardDownloadHookInstalled){return;}" +
                    "window.__greenguardDownloadHookInstalled=true;" +
                    "function toBase64(blob,filename){" +
                    "var reader=new FileReader();" +
                    "reader.onloadend=function(){" +
                    "var result=String(reader.result||'');" +
                    "var idx=result.indexOf(',');" +
                    "var base64=idx>=0?result.substring(idx+1):'';" +
                    "if(window." + JS_INTERFACE_NAME + "){" +
                    "window." + JS_INTERFACE_NAME + ".saveBase64File(base64,filename||'download',blob.type||'application/octet-stream');" +
                    "}};" +
                    "reader.onerror=function(){" +
                    "if(window." + JS_INTERFACE_NAME + "){window." + JS_INTERFACE_NAME + ".onDownloadError('read failed');}" +
                    "};" +
                    "reader.readAsDataURL(blob);" +
                    "}" +
                    "var originalClick=HTMLAnchorElement.prototype.click;" +
                    "HTMLAnchorElement.prototype.click=function(){" +
                    "try{" +
                    "if(this.href&&this.href.indexOf('blob:')===0&&this.download){" +
                    "var anchor=this;" +
                    "fetch(this.href).then(function(res){return res.blob();}).then(function(blob){" +
                    "toBase64(blob,anchor.download);" +
                    "}).catch(function(){" +
                    "if(window." + JS_INTERFACE_NAME + "){window." + JS_INTERFACE_NAME + ".onDownloadError('fetch failed');}" +
                    "});" +
                    "return;" +
                    "}" +
                    "}catch(e){}" +
                    "return originalClick.apply(this,arguments);" +
                    "};" +
                    "})();";

    private final ComponentActivity activity;
    private final Bridge bridge;
    @Nullable private final WebView webView;

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
            public void onPageLoaded(WebView view) {
                view.evaluateJavascript(BLOB_DOWNLOAD_HOOK_JS, null);
            }
        });
    }

    // ── Blob downloads: jsPDF#save() / fetch-blob + anchor click ───────────────

    /** Called from the injected page script with the file's base64 contents. */
    @JavascriptInterface
    public void saveBase64File(String base64Data, String filename, String mimeType) {
        if (webView == null || !isTrustedOrigin(webView.getUrl())) {
            Log.w(TAG, "Ignoring saveBase64File from an untrusted or unknown origin.");
            return;
        }
        try {
            byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
            String safeName = sanitizeFilename(filename);
            String type = (mimeType == null || mimeType.isEmpty()) ? "application/octet-stream" : mimeType;
            Uri savedUri = writeToDownloads(activity, data, safeName, type);
            activity.runOnUiThread(() -> openOrNotify(savedUri, safeName, type));
        } catch (Exception e) {
            Log.w(TAG, "Failed to save downloaded file", e);
            notifyFailure();
        }
    }

    /** Called from the injected page script when it could not read/fetch the blob. */
    @JavascriptInterface
    public void onDownloadError(String reason) {
        Log.w(TAG, "Blob download failed in page script: " + reason);
        notifyFailure();
    }

    private void notifyFailure() {
        activity.runOnUiThread(() ->
                Toast.makeText(activity, "Download failed. Please try again.", Toast.LENGTH_LONG).show());
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
            activity.startActivity(Intent.createChooser(viewIntent, "Open " + filename));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(activity, "Saved: " + filename, Toast.LENGTH_LONG).show();
        }
    }

    // ── Security / sanitization ────────────────────────────────────────────────

    /**
     * Only trust download requests that originate from GreenGuard's own
     * frontend/backend origins, so this bridge can't be reached from an
     * arbitrary page the WebView might navigate to.
     */
    private boolean isTrustedOrigin(@Nullable String urlString) {
        if (urlString == null) {
            return false;
        }
        Uri uri = Uri.parse(urlString);
        String host = uri.getHost();
        if (host == null || !"https".equalsIgnoreCase(uri.getScheme())) {
            return false;
        }
        for (String suffix : TRUSTED_HOST_SUFFIXES) {
            if (suffix.startsWith(".") ? host.endsWith(suffix) : host.equalsIgnoreCase(suffix)) {
                return true;
            }
        }
        return false;
    }

    private String sanitizeFilename(@Nullable String filename) {
        if (filename == null || filename.trim().isEmpty()) {
            return "download_" + System.currentTimeMillis();
        }
        String cleaned = filename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        return cleaned.isEmpty() ? "download_" + System.currentTimeMillis() : cleaned;
    }
}
