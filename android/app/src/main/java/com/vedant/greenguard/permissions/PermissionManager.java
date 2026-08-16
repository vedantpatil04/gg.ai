package com.vedant.greenguard.permissions;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.Map;

/**
 * Centralized, lifecycle-safe permission foundation for GreenGuard.
 *
 * This class is intentionally the single place that knows how to check and
 * request Android runtime permissions for the capabilities GreenGuard will
 * need across upcoming phases (push notifications, current location, camera,
 * and file/image selection). It does not perform any capability-specific
 * work itself (no FCM, no WebView bridge, no camera capture, no file
 * chooser) - later phases are expected to call into this class instead of
 * talking to the Android permission APIs directly or duplicating this logic.
 *
 * Nothing in this class requests a permission automatically. Callers
 * (a future WebView/JS bridge, or native UI) decide when a permission is
 * actually needed and call {@link #requestPermission} at that time.
 */
public final class PermissionManager {

    private static final String PREFS_NAME = "greenguard_permission_prefs";
    private static final String PREF_NOTIFICATIONS_REQUESTED = "requested_notifications";
    private static final String PREF_LOCATION_REQUESTED = "requested_location";
    private static final String PREF_CAMERA_REQUESTED = "requested_camera";

    /** Capability categories GreenGuard's native side may need permission for. */
    public enum AppPermission {
        NOTIFICATIONS,
        LOCATION,
        CAMERA,
        /**
         * Modern gallery/file selection (system photo picker / Storage Access
         * Framework) does not require a runtime permission grant, so this
         * capability always resolves as {@link PermissionStatus#GRANTED}.
         * It exists here so future phases have one consistent API for every
         * capability category instead of special-casing file access.
         */
        FILES
    }

    /** Result of checking a permission's current state. */
    public enum PermissionStatus {
        /** Permission is granted (or not required on this capability/API level). */
        GRANTED,
        /** Permission was denied but the user can still be asked again. */
        DENIED,
        /** Permission has never been requested from the user yet. */
        NOT_REQUESTED,
        /** User denied and selected "don't ask again" (or denied twice on newer Android). */
        PERMANENTLY_DENIED
    }

    /** Callback invoked once a requested permission's result is known. */
    public interface PermissionResultCallback {
        void onPermissionResult(@NonNull AppPermission permission, @NonNull PermissionStatus status);
    }

    private final ComponentActivity activity;
    private final SharedPreferences prefs;
    private final ActivityResultLauncher<String[]> requestPermissionLauncher;

    @Nullable private AppPermission pendingPermission;
    @Nullable private PermissionResultCallback pendingCallback;

    /**
     * @param activity the hosting activity. Must call this constructor during
     *                 {@code onCreate}, before the activity reaches STARTED,
     *                 per the AndroidX Activity Result contract requirements.
     */
    public PermissionManager(@NonNull ComponentActivity activity) {
        this.activity = activity;
        this.prefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.requestPermissionLauncher = activity.registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                this::onPermissionResult
        );
    }

    /** Returns the current status of the given capability without prompting the user. */
    @NonNull
    public PermissionStatus getStatus(@NonNull AppPermission permission) {
        switch (permission) {
            case NOTIFICATIONS:
                return notificationsStatus();
            case LOCATION:
                return runtimeStatus(locationPermissions(), PREF_LOCATION_REQUESTED);
            case CAMERA:
                return runtimeStatus(cameraPermissions(), PREF_CAMERA_REQUESTED);
            case FILES:
            default:
                return PermissionStatus.GRANTED;
        }
    }

    /** Convenience check for callers that only care about granted vs. not. */
    public boolean isGranted(@NonNull AppPermission permission) {
        return getStatus(permission) == PermissionStatus.GRANTED;
    }

    /**
     * Requests the given capability's permission(s) if needed. Safe to call even when
     * already granted or when the capability requires no runtime permission - the
     * callback is still invoked with the resulting status.
     *
     * Does not show any rationale UI itself; callers should show contextual
     * explanation before calling this when {@link #getStatus} indicates it would help.
     */
    public void requestPermission(@NonNull AppPermission permission, @NonNull PermissionResultCallback callback) {
        String[] perms = manifestPermissionsFor(permission);

        if (perms.length == 0 || isGranted(permission)) {
            callback.onPermissionResult(permission, getStatus(permission));
            return;
        }

        pendingPermission = permission;
        pendingCallback = callback;
        prefs.edit().putBoolean(prefKeyFor(permission), true).apply();
        requestPermissionLauncher.launch(perms);
    }

    /** True if the permission was denied in a way where re-requesting won't show a dialog. */
    public boolean isPermanentlyDenied(@NonNull AppPermission permission) {
        return getStatus(permission) == PermissionStatus.PERMANENTLY_DENIED;
    }

    /** Opens the app's system settings screen, for recovering from a permanent denial. */
    public void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", activity.getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity.startActivity(intent);
    }

    private void onPermissionResult(Map<String, Boolean> result) {
        AppPermission permission = pendingPermission;
        PermissionResultCallback callback = pendingCallback;
        pendingPermission = null;
        pendingCallback = null;

        if (permission == null || callback == null) {
            return;
        }
        callback.onPermissionResult(permission, getStatus(permission));
    }

    private PermissionStatus notificationsStatus() {
        if (Build.VERSION.SDK_INT < 33) {
            // No runtime permission exists before Android 13; fall back to the
            // user-controlled notification toggle instead of assuming granted.
            boolean enabled = NotificationManagerCompat.from(activity).areNotificationsEnabled();
            return enabled ? PermissionStatus.GRANTED : PermissionStatus.DENIED;
        }
        return runtimeStatus(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PREF_NOTIFICATIONS_REQUESTED);
    }

    private PermissionStatus runtimeStatus(String[] perms, String prefKey) {
        if (perms.length == 0) {
            return PermissionStatus.GRANTED;
        }

        for (String perm : perms) {
            if (ContextCompat.checkSelfPermission(activity, perm) == PackageManager.PERMISSION_GRANTED) {
                return PermissionStatus.GRANTED;
            }
        }

        // Capacitor's own WebView chrome client requests LOCATION and CAMERA
        // permissions on its own (for navigator.geolocation and <input
        // type="file"> respectively) without going through this manager, so
        // shouldShowRequestPermissionRationale() - which Android only returns
        // true for after a prior denial - is treated as proof a request
        // already happened even if our own "requested before" flag was never
        // set by a call to requestPermission() here.
        boolean shouldShowRationale = false;
        for (String perm : perms) {
            if (ActivityCompat.shouldShowRequestPermissionRationale(activity, perm)) {
                shouldShowRationale = true;
                break;
            }
        }

        boolean requestedBefore = prefs.getBoolean(prefKey, false) || shouldShowRationale;
        if (!requestedBefore) {
            return PermissionStatus.NOT_REQUESTED;
        }
        return shouldShowRationale ? PermissionStatus.DENIED : PermissionStatus.PERMANENTLY_DENIED;
    }

    private String[] manifestPermissionsFor(AppPermission permission) {
        switch (permission) {
            case NOTIFICATIONS:
                return Build.VERSION.SDK_INT >= 33
                        ? new String[]{Manifest.permission.POST_NOTIFICATIONS}
                        : new String[0];
            case LOCATION:
                return locationPermissions();
            case CAMERA:
                return cameraPermissions();
            case FILES:
            default:
                return new String[0];
        }
    }

    private String[] locationPermissions() {
        return new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION};
    }

    private String[] cameraPermissions() {
        return new String[]{Manifest.permission.CAMERA};
    }

    private String prefKeyFor(AppPermission permission) {
        switch (permission) {
            case NOTIFICATIONS:
                return PREF_NOTIFICATIONS_REQUESTED;
            case LOCATION:
                return PREF_LOCATION_REQUESTED;
            case CAMERA:
                return PREF_CAMERA_REQUESTED;
            case FILES:
            default:
                return "requested_files";
        }
    }
}
