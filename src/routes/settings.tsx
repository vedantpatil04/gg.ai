import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { useTheme, type Theme } from "@/lib/theme";
import { appearanceApi } from "@/lib/api/appearance.api";
import { healthApi } from "@/lib/api/health.api";
import { NotificationPreferencesPanel } from "@/components/settings/notification-preferences";
import { LanguageRegionPanel } from "@/components/settings/language-region-preferences";
import { AccessibilityPreferencesPanel } from "@/components/settings/accessibility-preferences";
import { PrivacyPreferencesPanel } from "@/components/settings/privacy-preferences";
import {
  Sun,
  Moon,
  Monitor,
  Loader2,
  CheckCircle,
  Bell,
  Globe,
  Accessibility as AccessibilityIcon,
  Lock,
  Info,
  Palette,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    </AppLayout>
  ),
});

// ─── Section identifiers ──────────────────────────────────────────────────────
// Dashboard and Maps were removed: neither ever controlled the real Dashboard
// or Map modules — both preferences were only ever read back by this Settings
// page itself. Dashboard/Map behavior stays owned by those modules directly.
type Section =
  | "appearance"
  | "notifications"
  | "language"
  | "accessibility"
  | "privacy"
  | "about";

const NAV_ITEMS: {
  id: Section;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "appearance", icon: Palette },
  { id: "notifications", icon: Bell },
  { id: "language", icon: Globe },
  { id: "accessibility", icon: AccessibilityIcon },
  { id: "privacy", icon: Lock },
  { id: "about", icon: Info },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
function SettingsPage() {
  const [section, setSection] = useState<Section>("appearance");
  const { theme, setTheme } = useTheme();
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const { t } = useTranslation("settings");
  const { t: tErrors } = useTranslation("errors");

  // Reconcile with the server-persisted preference once on mount — covers
  // the case where this is a new device/browser whose localStorage doesn't
  // yet know this user's saved theme.
  useEffect(() => {
    let cancelled = false;
    appearanceApi
      .get()
      .then(({ data }) => {
        if (!cancelled && data.appearance.theme) setTheme(data.appearance.theme);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTheme = async (next: Theme) => {
    setTheme(next); // live preview
    setAppearanceSaving(true);
    try {
      await appearanceApi.update(next);
      toast.success(t("appearance.updated"));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? tErrors("saveFailed");
      toast.error(message);
    } finally {
      setAppearanceSaving(false);
    }
  };

  return (
    <div className="min-h-full w-full">
      {/* ── Page header ── */}
      <div className="border-b border-border px-4 sm:px-6 md:px-8 pt-6 pb-4">
        <div className="w-full">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            GreenGuard AI
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-0.5 break-words">
            {t("title")}
          </h1>
        </div>
      </div>

      {/* ── Mobile tab strip ── */}
      <div className="md:hidden border-b border-border overflow-x-auto">
        <div
          className="flex gap-0.5 px-4 py-2 min-w-max"
          role="tablist"
          aria-label={t("ariaSections")}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={section === item.id}
              onClick={() => setSection(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                section === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <item.icon className="size-3.5 shrink-0" />
              {t(`sections.${item.id}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="w-full flex items-start gap-6 lg:gap-8 px-4 sm:px-6 md:px-8 py-6 md:py-8">
        {/* Sidebar — desktop only */}
        <nav
          className="hidden md:flex flex-col gap-0.5 w-44 lg:w-52 shrink-0 sticky top-8"
          aria-label={t("ariaNav")}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 px-3">
            {t("title")}
          </div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                section === item.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
              )}
            >
              <item.icon
                className={cn(
                  "size-4 shrink-0",
                  section === item.id
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <span className="truncate">{t(`sections.${item.id}`)}</span>
            </button>
          ))}
        </nav>

        {/* Content panel */}
        <div
          className="flex-1 min-w-0"
          role="tabpanel"
          aria-label={t(`sections.${section}`, { defaultValue: t("title") })}
        >
          {section === "appearance" && (
            <AppearanceSection
              theme={theme}
              selectTheme={selectTheme}
              appearanceSaving={appearanceSaving}
            />
          )}
          {section === "notifications" && <NotificationPreferencesPanel />}
          {section === "language" && <LanguageRegionPanel />}
          {section === "accessibility" && <AccessibilityPreferencesPanel />}
          {section === "privacy" && <PrivacyPreferencesPanel />}
          {section === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

// ─── Appearance section (inline — no sub-component file needed) ───────────────
const THEME_OPTIONS = [
  { id: "light" as const, icon: Sun },
  { id: "dark" as const, icon: Moon },
  { id: "system" as const, icon: Monitor },
];

function AppearanceSection({
  theme,
  selectTheme,
  appearanceSaving,
}: {
  theme: Theme;
  selectTheme: (next: Theme) => void;
  appearanceSaving: boolean;
}) {
  const { t } = useTranslation("settings");

  return (
    <div className="glass rounded-2xl p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {t("sections.appearance")}
      </div>
      <div className="text-base font-semibold tracking-tight mt-0.5 inline-flex items-center gap-2 mb-1">
        <Monitor className="size-4 text-primary" />
        {t("appearance.title")}
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        {t("appearance.description")}
      </p>

      <div
        className="grid sm:grid-cols-3 gap-3"
        role="radiogroup"
        aria-label={t("appearance.title")}
      >
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            role="radio"
            aria-checked={theme === opt.id}
            onClick={() => selectTheme(opt.id)}
            className={cn(
              "text-left rounded-xl border p-4 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              theme === opt.id
                ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                : "border-border hover:border-primary/40",
            )}
          >
            <div className="flex items-start justify-between">
              <div className="size-9 rounded-lg glass grid place-items-center">
                <opt.icon className="size-4 text-primary" />
              </div>
              {theme === opt.id && (
                <CheckCircle
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="font-medium mt-3">{t(`appearance.${opt.id}`)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {t(`appearance.${opt.id}Desc`)}
            </div>
          </button>
        ))}
      </div>

      <div className="h-5 mt-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
        {appearanceSaving && (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            {t("saving", { ns: "common" })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── About section ────────────────────────────────────────────────────────────
// Version and Environment now come from the platform's own /health endpoint
// instead of being hardcoded, so this reflects whatever's actually deployed
// rather than a string baked in at some point in the past. "Build Number" and
// "API Version" were dropped — nothing in the app tracks either as a real,
// distinct value, so showing them would just be inventing data.
function AboutSection() {
  const { t } = useTranslation("settings");

  const { data: health } = useQuery({
    queryKey: ["platform-health"],
    queryFn: () => healthApi.get(),
    staleTime: 60_000,
    retry: 1,
    throwOnError: false,
  });

  const infoItems = [
    { label: t("about.version"), value: health?.version },
    {
      label: t("about.environment"),
      value: health?.environment
        ? health.environment.charAt(0).toUpperCase() + health.environment.slice(1)
        : undefined,
    },
  ];

  return (
    <div className="space-y-4">
      {/* App identity */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="size-14 rounded-2xl aurora grid place-items-center text-2xl shrink-0"
            aria-hidden="true"
          >
            🌿
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("about.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("about.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {infoItems.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border p-3"
            >
              <div className="text-xs text-muted-foreground">
                {item.label}
              </div>
              <div className="text-sm font-medium font-mono mt-0.5">
                {item.value ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legal & support */}
      <div className="glass rounded-2xl p-5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          {t("about.legal")}
        </div>
        <div className="space-y-0.5">
          <Link
            to="/terms"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span>{t("about.terms")}</span>
            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            to="/privacy"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span>{t("about.privacyPolicy")}</span>
            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <a
            href="mailto:greengaurd.ai.in@gmail.com"
            className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span>{t("about.support")}</span>
            <ExternalLink className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        </div>
      </div>
    </div>
  );
}
