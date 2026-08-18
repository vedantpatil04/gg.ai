/**
 * complaint-duplicate-detector.tsx — Phase 12
 *
 * Detects potentially duplicate complaints near the selected location.
 * Uses the new GET /citizen/nearby-complaints endpoint (Phase 12 backend)
 * which returns active city complaints within the specified radius — not
 * filtered to the current user — enabling genuine duplicate detection.
 */

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  MapPin,
  Clock,
  ChevronRight,
  Merge,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import client from "@/lib/api/client";
import type { LocationSelection } from "./complaint-location-map";
import { humanizeIssueType, getStatusMeta } from "./citizen-status-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbyComplaint {
  _id: string;
  title: string;
  issueType: string;
  severity: string;
  status: string;
  createdAt: string;
  location?: { lat?: number; lng?: number; address?: string };
  distance?: number; // meters, returned by backend
}

interface DuplicateDetectorProps {
  location: LocationSelection | null;
  issueType: string;
  onJoinExisting?: (id: string) => void;
  onContinueNew?: () => void;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / 3600000;
  if (hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComplaintDuplicateDetector({
  location,
  issueType,
  onJoinExisting,
  onContinueNew,
  className,
}: DuplicateDetectorProps) {
  const { city, isApiConnected } = useCity();
  const { isAuthenticated } = useAuth();
  const [nearby, setNearby] = useState<NearbyComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [decision, setDecision] = useState<"join" | "new" | null>(null);

  const fetchNearby = useCallback(async () => {
    if (!location || !isAuthenticated || !isApiConnected) {
      setNearby([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await client.get("/citizen/nearby-complaints", {
        params: {
          cityId: city.id,
          lat: location.lat,
          lng: location.lng,
          radiusMeters: 500,
          issueType: issueType !== "other" ? issueType : undefined,
        },
      });

      const complaints: NearbyComplaint[] =
        (res.data?.data?.complaints ?? res.data?.complaints ?? []) as NearbyComplaint[];
      setNearby(complaints);
      setDecision(null);
    } catch {
      // Endpoint might not exist on older deployments — fail silently
      setNearby([]);
    } finally {
      setIsLoading(false);
    }
  }, [location, issueType, city.id, isAuthenticated, isApiConnected]);

  useEffect(() => {
    if (!location) {
      setNearby([]);
      return;
    }
    const t = setTimeout(() => void fetchNearby(), 800);
    return () => clearTimeout(t);
  }, [location, fetchNearby]);

  const visibleNearby = nearby.filter((c) => !dismissed.has(c._id)).slice(0, 3);

  if (!location || (!isLoading && visibleNearby.length === 0)) return null;
  if (decision === "new") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className={cn("space-y-2", className)}
      >
        {isLoading ? (
          <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur px-4 py-3 flex items-center gap-3 shadow-2xs">
            <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />
            <span className="text-xs text-muted-foreground">
              Checking for similar complaints nearby…
            </span>
          </div>
        ) : (
          visibleNearby.map((c) => {
            const statusMeta = getStatusMeta(c.status);
            const distStr = c.distance != null ? formatDistance(c.distance) : "Nearby";

            return (
              <motion.div
                key={c._id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-warning/30 bg-card/80 backdrop-blur overflow-hidden shadow-2xs"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 border-b border-border/40"
                  style={{
                    background: "color-mix(in oklab, var(--color-warning) 8%, transparent)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className="size-3.5 shrink-0"
                      style={{ color: "var(--color-warning)" }}
                    />
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-warning)" }}
                    >
                      Similar Complaint Found
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDismissed((prev) => new Set([...prev, c._id]))
                    }
                    className="size-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-4 py-3 space-y-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-semibold line-clamp-1">
                      {humanizeIssueType(c.issueType)}
                    </div>
                    {c.title && c.title !== humanizeIssueType(c.issueType) && (
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {c.title}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span>{distStr} away</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3 shrink-0" />
                      <span>Reported {formatRelativeTime(c.createdAt)}</span>
                    </div>
                    <span
                      className="font-medium"
                      style={{
                        color: `var(--color-${
                          statusMeta.tone === "muted"
                            ? "muted-foreground"
                            : statusMeta.tone
                        })`,
                      }}
                    >
                      Status: {statusMeta.label}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {onJoinExisting && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => {
                          setDecision("join");
                          onJoinExisting(c._id);
                        }}
                      >
                        <Merge className="size-3" />
                        Join Existing
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-8 text-muted-foreground"
                      onClick={() => {
                        setDecision("new");
                        onContinueNew?.();
                      }}
                    >
                      <Plus className="size-3" />
                      Create New
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </AnimatePresence>
  );
}
