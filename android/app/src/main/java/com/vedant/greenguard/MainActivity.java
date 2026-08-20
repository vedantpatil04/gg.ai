package com.vedant.greenguard;

import android.os.Bundle;
import android.util.Log;

import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.vedant.greenguard.downloads.WebDownloadManager;
import com.vedant.greenguard.notifications.NotificationPermissionPlugin;
import com.vedant.greenguard.permissions.PermissionManager;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "GreenGuard";
    private PermissionManager permissionManager;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        ensureFirebaseApp();

        // Phase 3: local plugins must be registered before super.onCreate()
        // runs (that's what actually starts the Capacitor bridge). This is
        // the JS bridge onto PermissionManager's NOTIFICATIONS category —
        // see NotificationPermissionPlugin's class doc for why it exists
        // instead of using @capacitor/push-notifications' own permission
        // flow. FCM token retrieval/message handling itself is that
        // official plugin, auto-registered via capacitor.plugins.json.
        registerPlugin(NotificationPermissionPlugin.class);

        super.onCreate(savedInstanceState);

        // Registered here (before the activity reaches STARTED) so it stays
        // lifecycle-safe. Nothing is requested yet - this only makes the
        // permission foundation available for later phases (e.g. a future
        // WebView bridge) to use when a feature actually needs it.
        permissionManager = new PermissionManager(this);

        // Current location and camera/gallery/file selection already work
        // through Capacitor's built-in WebView handling (see audit notes in
        // WebDownloadManager) once the Phase 1 manifest permissions are in
        // place, so no bridge is needed for those. The one gap is blob-based
        // PDF/report downloads, which this wires up.
        new WebDownloadManager(this, getBridge()).attach();
    }

    private void ensureFirebaseApp() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
                Log.i(TAG, "FirebaseApp successfully initialized from resources");
            }
        } catch (Exception e) {
            Log.w(TAG, "FirebaseApp initialization check: " + e.getMessage());
        }
    }

    /**
     * Centralized permission foundation for notifications, location, camera,
     * and file/media access. Later phases should request permissions through
     * this instead of talking to the Android permission APIs directly.
     */
    public PermissionManager getPermissionManager() {
        return permissionManager;
    }
}
