package com.vedant.greenguard.downloads;

import android.app.DownloadManager;
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
 * Capacitor's WebView does not natively support downloading `blob:` URLs,
 * which is how jsPDF#save() and GreenGuard's Blob downloads operate.
 * This manager provides:
 * 1. Direct JavaScript Interface (GreenGuardDownloader#saveBase64File) called by
 *    src/lib/download-file.ts with Base64 payload and request correlation ID.
 * 2. Fallback DOM hook for any unmigrated blob: anchor clicks.
 * 3. Modern Scoped Storage (MediaStore.Downloads) on Android 10+ (API 29+) with zero
 *    broad/legacy storage permissions, placing genuine files into Files > Downloads.
 * 4. Asynchronous confirmation callback back to JavaScript (__greenguardResolveDownload).
 */
public final class WebDownloadManager {

    private static final String TAG = "GreenGuardDownload";
    private static final String JS_INTERFACE_NAME = "GreenGuardDownloader";

    // Trusted origins for download requests. Kept in sync with allowNavigation.
    private static final String[] TRUSTED_HOST_SUFFIXES = {
            "gg-ai-woad.vercel.app",
            ".vercel.app",
            "gg-ai-11ja.onrender.com",
            ".onrender.com",
            "localhost",
            "127.0.0.1",
            "10.0.2.2"
    };

    // Intercepts anchor clicks on blob: URLs with a download attribute as a defensive fallback.
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
                    "try{" +
                    "window." + JS_INTERFACE_NAME + ".saveBase64File(requestId||'',base64,filename||'download',blob.type||'application/octet-stream');" +
                    "}catch(err){" +
                    "if(window." + JS_INTERFACE_NAME + ".onDownloadError){" +
                    "window." + JS_INTERFACE_NAME + ".onDownloadError(requestId||'',err&&err.message?err.message:'saveBase64File invocation error');" +
                    "}" +
                    "}" +
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
    private volatile String currentUrl = null;

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

        // Cache initial URL safely on UI thread
        activity.runOnUiThread(() -> {
            try {
                if (webView != null) {
                    currentUrl = webView.getUrl();
                }
            } catch (Exception e) {
                Log.w(TAG, "Could not obtain initial WebView URL", e);
            }
        });

        webView.addJavascriptInterface(this, JS_INTERFACE_NAME);

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
                handleDirectDownload(url, userAgent, contentDisposition, mimeType));

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                try {
                    currentUrl = view.getUrl();
                    view.evaluateJavascript(BLOB_DOWNLOAD_HOOK_JS, null);
                } catch (Exception e) {
                    Log.w(TAG, "Error in onPageLoaded hook", e);
                }
            }
        });
    }

    // ── Blob downloads: jsPDF#save() / GreenGuard's downloadBlob() helper ──────

    /**
     * Called from the injected page script or download-file.ts with the file's base64 contents.
     * Runs on the JavaBridge background thread.
     */
    @JavascriptInterface
    public void saveBase64File(String requestId, String base64Data, String filename, String mimeType) {
        try {
            if (!isOriginAllowed()) {
                Log.w(TAG, "Ignoring saveBase64File from an untrusted or unknown origin.");
                resolveJs(requestId, false, "Untrusted origin");
                return;
            }

            if (base64Data == null || base64Data.trim().isEmpty()) {
                Log.w(TAG, "saveBase64File received empty base64 data");
                resolveJs(requestId, false, "Download file data is empty");
                return;
            }

            byte[] data;
            try {
                data = Base64.decode(base64Data, Base64.DEFAULT);
            } catch (IllegalArgumentException ex) {
                Log.e(TAG, "Failed to decode base64 data", ex);
                resolveJs(requestId, false, "Corrupted or invalid file data");
                return;
            }

            if (data == null || data.length == 0) {
                Log.w(TAG, "Decoded file data is empty");
                resolveJs(requestId, false, "Decoded file data is empty");
                return;
            }

            String safeName = sanitizeFilename(filename, mimeType);
            String type = (mimeType == null || mimeType.trim().isEmpty()) ? "application/pdf" : mimeType.trim();

            Uri savedUri = writeToDownloads(activity, data, safeName, type);
            activity.runOnUiThread(() -> openOrNotify(savedUri, safeName, type));
            resolveJs(requestId, true, null);
        } catch (Throwable t) {
            String reason = t.getMessage();
            Log.e(TAG, "Failed to save downloaded file: " + reason, t);
            notifyFailure();
            resolveJs(requestId, false, (reason != null && !reason.trim().isEmpty()) ? reason : "Could not save the file to device storage");
        }
    }

    /** Called from the injected page script when it could not read the blob. */
    @JavascriptInterface
    public void onDownloadError(String requestId, String reason) {
        try {
            Log.w(TAG, "Blob download failed in page script: " + reason);
            notifyFailure();
            resolveJs(requestId, false, (reason != null && !reason.trim().isEmpty()) ? reason : "Could not read the file for download");
        } catch (Throwable t) {
            Log.e(TAG, "Error in onDownloadError: " + t.getMessage(), t);
        }
    }

    private void notifyFailure() {
        activity.runOnUiThread(() -> {
            try {
                Toast.makeText(activity, "Download failed. Please try again.", Toast.LENGTH_LONG).show();
            } catch (Exception ignored) {
            }
        });
    }

    /**
     * Reports the real outcome of a download back to the page, so
     * GreenGuard's UI (see src/lib/download-file.ts) only ever shows a
     * success state once the file has genuinely been saved.
     */
    private void resolveJs(@Nullable String requestId, boolean success, @Nullable String message) {
        if (requestId == null || requestId.isEmpty() || webView == null) {
            return;
        }
        String js = "window.__greenguardResolveDownload && window.__greenguardResolveDownload(" +
                JSONObject.quote(requestId) + "," + success + "," +
                (message != null ? JSONObject.quote(message) : "null") + ");";
        activity.runOnUiThread(() -> {
            try {
                if (webView != null) {
                    webView.evaluateJavascript(js, null);
                }
            } catch (Exception e) {
                Log.w(TAG, "Error evaluating JS resolve callback: " + e.getMessage());
            }
        });
    }

    // ── Direct (non-blob) downloads ───────────────────────────────────────────

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
            // Public Downloads collection - visible in Android Files > Downloads.
            // Modern Scoped Storage on API 29+ (no READ/WRITE_EXTERNAL_STORAGE needed).
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
            values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri itemUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (itemUri == null) {
                throw new IOException("Unable to create download entry in device storage");
            }
            try {
                try (OutputStream out = resolver.openOutputStream(itemUri, "w")) {
                    if (out == null) {
                        throw new IOException("Unable to open output stream for download entry");
                    }
                    out.write(data);
                    out.flush();
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(itemUri, values, null, null);
                return itemUri;
            } catch (Exception e) {
                try {
                    resolver.delete(itemUri, null, null);
                } catch (Exception ignored) {
                }
                throw e;
            }
        }

        // Pre-Android 10 fallback (API < 29)
        File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) {
            dir = context.getCacheDir();
        }
        if (!dir.exists() && !dir.mkdirs()) {
            throw new IOException("Unable to create downloads directory");
        }
        File file = uniqueFile(dir, filename);
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(data);
            out.flush();
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
        } catch (Exception e) {
            Log.i(TAG, "Viewer intent not handled, notifying via toast: " + e.getMessage());
            Toast.makeText(activity, "Saved to Downloads: " + filename, Toast.LENGTH_LONG).show();
        }
    }

    // ── Security / origin sanitization ────────────────────────────────────────

    private boolean isOriginAllowed() {
        String url = currentUrl;
        if (url == null) {
            url = bridge.getServerUrl();
        }
        if (url == null) {
            // Invoked from inside the app's WebView context before URL is resolved
            return true;
        }
        return isTrustedOrigin(url);
    }

    private boolean isTrustedOrigin(@Nullable String urlString) {
        if (urlString == null) {
            return true;
        }
        try {
            Uri uri = Uri.parse(urlString);
            String scheme = uri.getScheme();
            if (scheme == null) {
                return true;
            }
            if ("capacitor".equalsIgnoreCase(scheme) || "file".equalsIgnoreCase(scheme)) {
                return true;
            }
            String host = uri.getHost();
            if (host == null) {
                return true;
            }
            for (String suffix : TRUSTED_HOST_SUFFIXES) {
                if (suffix.startsWith(".") ? host.endsWith(suffix) : host.equalsIgnoreCase(suffix)) {
                    return true;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error checking origin: " + e.getMessage());
        }
        return false;
    }

    private String sanitizeFilename(@Nullable String filename, @Nullable String mimeType) {
        String defaultExt = ".pdf";
        if (mimeType != null && mimeType.contains("json")) {
            defaultExt = ".json";
        } else if (mimeType != null && (mimeType.contains("csv") || mimeType.contains("text/plain"))) {
            defaultExt = ".csv";
        } else if (mimeType != null && mimeType.contains("image/png")) {
            defaultExt = ".png";
        } else if (mimeType != null && mimeType.contains("image/jpeg")) {
            defaultExt = ".jpg";
        }

        if (filename == null || filename.trim().isEmpty()) {
            return "greenguard_download_" + System.currentTimeMillis() + defaultExt;
        }
        String cleaned = filename.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (cleaned.isEmpty()) {
            return "greenguard_download_" + System.currentTimeMillis() + defaultExt;
        }
        if (!cleaned.contains(".")) {
            cleaned = cleaned + defaultExt;
        }
        return cleaned;
    }
}
