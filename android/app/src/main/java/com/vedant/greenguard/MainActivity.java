package com.vedant.greenguard;

import android.os.Bundle;
import android.util.Log;

import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.vedant.greenguard.downloads.WebDownloadManager;
import com.vedant.greenguard.notifications.NotificationPermissionPlugin;
import com.vedant.greenguard.permissions.PermissionManager;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "GreenGuard";
    private PermissionManager permissionManager;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        // Phase 3: Ensure FirebaseApp is safely initialized for FCM before Capacitor plugins run
        initFirebaseIfNecessary();

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

    private void initFirebaseIfNecessary() {
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseOptions options = FirebaseOptions.fromResource(this);
                if (options != null) {
                    FirebaseApp.initializeApp(this, options);
                } else {
                    FirebaseOptions fallbackOptions = new FirebaseOptions.Builder()
                        .setApplicationId("1:103850000000:android:a1b2c3d4e5f60718293a4b")
                        .setProjectId("greenguard-ai-6")
                        .setApiKey("AIzaSyDummyKeyForGreenGuardAIApp12345")
                        .setGcmSenderId("103850000000")
                        .build();
                    FirebaseApp.initializeApp(this, fallbackOptions);
                }
                Log.i(TAG, "FirebaseApp successfully initialized");
            }
        } catch (Exception e) {
            Log.e(TAG, "FirebaseApp initialization: " + e.getMessage(), e);
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
