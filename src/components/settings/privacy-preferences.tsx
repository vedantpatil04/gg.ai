import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Lock, Trash2 } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Only what's genuinely safe to wipe client-side: locally cached UI
// preferences, never auth tokens (gg_access_token / gg_refresh_token) —
// clearing those would log the user out, which this action must not do.
const LOCAL_CACHE_KEYS = ["gg-theme", "gg-city", "gg-accessibility"];
const LOCAL_CACHE_PREFIXES = ["greenguard.map.recentSearches."];

function clearLocalCache() {
  for (const key of LOCAL_CACHE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable — non-fatal */
    }
  }
  try {
    for (const key of Object.keys(localStorage)) {
      if (LOCAL_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// ─── Panel ────────────────────────────────────────────────────────────────────
// Privacy previously also offered "Share Anonymous Usage Analytics" and
// "Personalized Recommendations" toggles. Neither was backed by anything —
// no analytics pipeline or recommendation engine in the app ever read either
// preference — so, per the audit, they've been removed rather than left as
// switches that silently did nothing. Clear Local Cache is the one control
// here that has always been genuinely functional, and it remains so.
export function PrivacyPreferencesPanel() {
  const { t } = useTranslation("settings");

  const handleClearCache = () => {
    clearLocalCache();
    toast.success(t("privacy.cacheCleared"));
  };

  return (
    <Panel
      eyebrow={t("sections.privacy")}
      title={
        <span className="inline-flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          {t("privacy.title")}
        </span>
      }
    >
      <p className="text-sm text-muted-foreground -mt-2 mb-5">
        {t("privacy.description")}
      </p>

      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {t("privacy.localStorage")}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input px-3.5 py-2.5 min-h-10 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {t("privacy.clearCache")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("privacy.clearCacheTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("privacy.clearCacheDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel", { ns: "common" })}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCache}>
                {t("privacy.clearCache")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Panel>
  );
}
