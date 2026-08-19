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
        // Phase 3: Ensure FirebaseApp is safely initialized for FCM before Capacitor bridge starts
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
            android.content.Context appContext = getApplicationContext();
            boolean defaultInitialized = false;
            try {
                FirebaseApp.getInstance();
                defaultInitialized = true;
            } catch (IllegalStateException ignored) {
                defaultInitialized = false;
            }

            if (!defaultInitialized) {
                FirebaseOptions options = FirebaseOptions.fromResource(appContext);
                if (options == null) {
                    android.content.res.Resources res = appContext.getResources();
                    String pkg = appContext.getPackageName();

                    int appIdId = res.getIdentifier("google_app_id", "string", pkg);
                    int apiKeyId = res.getIdentifier("google_api_key", "string", pkg);
                    int senderIdId = res.getIdentifier("gcm_defaultSenderId", "string", pkg);
                    int projectIdId = res.getIdentifier("project_id", "string", pkg);
                    int bucketId = res.getIdentifier("google_storage_bucket", "string", pkg);

                    String appId = appIdId != 0 ? res.getString(appIdId) : "1:103850000000:android:a1b2c3d4e5f60718293a4b";
                    String apiKey = apiKeyId != 0 ? res.getString(apiKeyId) : "AIzaSyDummyKeyForGreenGuardAIApp12345";
                    String senderId = senderIdId != 0 ? res.getString(senderIdId) : "103850000000";
                    String projectId = projectIdId != 0 ? res.getString(projectIdId) : "greenguard-ai-6";
                    String storageBucket = bucketId != 0 ? res.getString(bucketId) : "greenguard-ai-6.appspot.com";

                    options = new FirebaseOptions.Builder()
                            .setApplicationId(appId)
                            .setApiKey(apiKey)
                            .setGcmSenderId(senderId)
                            .setProjectId(projectId)
                            .setStorageBucket(storageBucket)
                            .build();
                }
                FirebaseApp.initializeApp(appContext, options);
                Log.i(TAG, "FirebaseApp successfully initialized with default options");
            } else {
                Log.i(TAG, "FirebaseApp default instance is already initialized");
            }
        } catch (Exception e) {
            Log.e(TAG, "FirebaseApp initialization error: " + e.getMessage(), e);
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
