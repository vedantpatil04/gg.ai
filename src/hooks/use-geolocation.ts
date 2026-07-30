/**
 * use-geolocation.ts — Phase 10: Live User Location & Geolocation
 *
 * Complete browser Geolocation API state machine.
 *
 * States:
 *   idle        — never requested
 *   requesting  — waiting for browser response
 *   granted     — position available
 *   denied      — user refused or revoked permission
 *   unavailable — hardware not available
 *   timeout     — position acquisition timed out
 *
 * Features:
 *  - One-shot (locate once) vs. continuous watch mode
 *  - Throttled position updates (min 2 s between React state updates)
 *  - Automatically pauses the watcher when the page is hidden and
 *    resumes when it comes back (Section 11: pause when tab is inactive)
 *  - Full cleanup on unmount / mode change (Section 11: no leaked watchers)
 *  - Privacy: coordinates never written to localStorage or any persistent
 *    store — in-memory only for the active session (Section 10)
 */

import { useState, useEffect, useRef, useCallback } from "react";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "timeout";

export type AccuracyTier = "excellent" | "good" | "moderate" | "low";

export interface GeoPosition {
  lat: number;
  lng: number;
  /** Accuracy in metres */
  accuracy: number;
  accuracyTier: AccuracyTier;
  /** Device heading in degrees (0–360, N=0) — may be null on desktop */
  heading: number | null;
  timestamp: number;
}

export interface UseGeolocationResult {
  status: GeolocationStatus;
  position: GeoPosition | null;
  /** Human-readable status message */
  statusMessage: string;
  /** True when a continuous watch is active */
  isTracking: boolean;
  /** Request a single position fix */
  locate: () => void;
  /** Start continuous tracking */
  startTracking: () => void;
  /** Stop continuous tracking */
  stopTracking: () => void;
  /** Clear error / reset to idle */
  reset: () => void;
}

function accuracyTier(accuracy: number): AccuracyTier {
  if (accuracy <= 10) return "excellent";
  if (accuracy <= 50) return "good";
  if (accuracy <= 200) return "moderate";
  return "low";
}

const STATUS_MESSAGES: Record<GeolocationStatus, string> = {
  idle: "Location not yet requested",
  requesting: "Acquiring your location…",
  granted: "Location acquired",
  denied: "Location permission denied — enable it in browser settings",
  unavailable: "Location unavailable on this device",
  timeout: "Location request timed out — please try again",
};

/** Minimum ms between React position state updates */
const THROTTLE_MS = 2_000;

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const pendingPositionRef = useRef<GeoPosition | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Convert raw GeolocationPosition → GeoPosition ──────────────────────────
  const fromRaw = useCallback(
    (raw: GeolocationPosition): GeoPosition => ({
      lat: raw.coords.latitude,
      lng: raw.coords.longitude,
      accuracy: raw.coords.accuracy,
      accuracyTier: accuracyTier(raw.coords.accuracy),
      heading: raw.coords.heading,
      timestamp: raw.timestamp,
    }),
    [],
  );

  // ── Throttled position setter ────────────────────────────────────────────────
  const applyPosition = useCallback((pos: GeoPosition) => {
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    if (elapsed >= THROTTLE_MS) {
      lastUpdateRef.current = now;
      setStatus("granted");
      setPosition(pos);
    } else {
      // Schedule for when the throttle window expires
      pendingPositionRef.current = pos;
      if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          if (pendingPositionRef.current) {
            lastUpdateRef.current = Date.now();
            setStatus("granted");
            setPosition(pendingPositionRef.current);
            pendingPositionRef.current = null;
          }
        }, THROTTLE_MS - elapsed);
      }
    }
  }, []);

  // ── Error handler ────────────────────────────────────────────────────────────
  const handleError = useCallback((err: GeolocationPositionError) => {
    clearWatch();
    setIsTracking(false);
    if (err.code === err.PERMISSION_DENIED) setStatus("denied");
    else if (err.code === err.POSITION_UNAVAILABLE) setStatus("unavailable");
    else setStatus("timeout");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clear active watch ───────────────────────────────────────────────────────
  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  }, []);

  // ── One-shot locate ──────────────────────────────────────────────────────────
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    clearWatch();
    setIsTracking(false);
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition((raw) => applyPosition(fromRaw(raw)), handleError, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 30_000,
    });
  }, [applyPosition, clearWatch, fromRaw, handleError]);

  // ── Continuous tracking ───────────────────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    clearWatch();
    setStatus("requesting");
    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (raw) => applyPosition(fromRaw(raw)),
      handleError,
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
    );
  }, [applyPosition, clearWatch, fromRaw, handleError]);

  const stopTracking = useCallback(() => {
    clearWatch();
    setIsTracking(false);
  }, [clearWatch]);

  const reset = useCallback(() => {
    clearWatch();
    setIsTracking(false);
    setStatus("idle");
  }, [clearWatch]);

  // ── Pause watcher when page hidden, resume on visible ────────────────────────
  useEffect(() => {
    const onVis = () => {
      if (!isTracking) return;
      if (document.hidden) {
        clearWatch();
      } else {
        // Re-start the watch after the tab becomes visible again
        if (!navigator.geolocation) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
          (raw) => applyPosition(fromRaw(raw)),
          handleError,
          { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 },
        );
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isTracking, applyPosition, clearWatch, fromRaw, handleError]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(
    () => () => {
      clearWatch();
    },
    [clearWatch],
  );

  return {
    status,
    position,
    statusMessage: STATUS_MESSAGES[status],
    isTracking,
    locate,
    startTracking,
    stopTracking,
    reset,
  };
}
