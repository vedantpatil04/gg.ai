package com.vedant.greenguard.notifications;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.vedant.greenguard.MainActivity;
import com.vedant.greenguard.permissions.PermissionManager;

/**
 * Phase 3 — JS bridge onto the Phase 1 {@link PermissionManager}.
 *
 * GreenGuard already has a single, centralized native permission
 * foundation (PermissionManager) covering notifications, location, and
 * camera. @capacitor/push-notifications ships its own permission-request
 * flow (`PushNotifications.requestPermissions()`), but using it here would
 * mean two separate things independently deciding whether/when to prompt
 * for POST_NOTIFICATIONS — exactly the "second notification permission
 * system" Phase 3 says not to build.
 *
 * So this plugin is deliberately thin: it does nothing but expose
 * PermissionManager's existing NOTIFICATIONS category to JS. Once
 * permission is granted through here, the JS push bridge calls the
 * official plugin's `register()` (token retrieval only — it does not
 * itself prompt for permission, see its docs) to obtain the FCM token.
 */
@CapacitorPlugin(name = "GreenGuardNotificationPermission")
public class NotificationPermissionPlugin extends Plugin {

    @PluginMethod
    public void getStatus(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            PermissionManager manager = permissionManager();
            if (manager == null) {
                call.reject("Permission foundation unavailable");
                return;
            }
            call.resolve(statusResult(manager.getStatus(PermissionManager.AppPermission.NOTIFICATIONS)));
        });
    }

    /**
     * Requests POST_NOTIFICATIONS through the existing PermissionManager.
     * Safe to call even when already granted, already permanently denied,
     * or on API levels below 33 where no runtime permission exists — the
     * promise always resolves with the resulting status rather than
     * rejecting, mirroring PermissionManager's own contract.
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            PermissionManager manager = permissionManager();
            if (manager == null) {
                call.reject("Permission foundation unavailable");
                return;
            }
            manager.requestPermission(
                PermissionManager.AppPermission.NOTIFICATIONS,
                (permission, status) -> call.resolve(statusResult(status))
            );
        });
    }

    /**
     * Checks if the Default FirebaseApp is initialized before JS calls PushNotifications.register().
     * This prevents native uncaught IllegalStateException from crashing the app process.
     */
    @PluginMethod
    public void isFirebaseReady(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            boolean ready = checkFirebaseReady();
            JSObject result = new JSObject();
            result.put("ready", ready);
            call.resolve(result);
        });
    }

    /** Opens the app's system settings screen — used by the JS side to
     *  recover from a permanent denial, same as every other capability. */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            PermissionManager manager = permissionManager();
            if (manager != null) {
                manager.openAppSettings();
            }
            call.resolve();
        });
    }

    private boolean checkFirebaseReady() {
        try {
            return !FirebaseApp.getApps(getContext()).isEmpty();
        } catch (Throwable ignored) {
            return false;
        }
    }

    private PermissionManager permissionManager() {
        if (getActivity() instanceof MainActivity) {
            return ((MainActivity) getActivity()).getPermissionManager();
        }
        return null;
    }

    private JSObject statusResult(PermissionManager.PermissionStatus status) {
        JSObject result = new JSObject();
        result.put("status", status.name());
        result.put("granted", status == PermissionManager.PermissionStatus.GRANTED);
        result.put("firebaseReady", checkFirebaseReady());
        return result;
    }
}
