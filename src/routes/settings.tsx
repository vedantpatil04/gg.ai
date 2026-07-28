import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Panel } from "@/components/ui-bits";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  User,
  Globe,
  Loader2,
  CheckCircle,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState<"preferences">("preferences");
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    organization: user?.organization ?? "",
    phone: user?.phone ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await updateProfile(profileForm);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1100px] mx-auto">
      {tab === "preferences" && (
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Settings
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Preferences</h1>
        </header>
      )}

      {/* Settings navigation */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 border-primary text-foreground font-medium">
          <SlidersHorizontal className="size-4" />
          Preferences
        </div>
      </div>

      {tab === "preferences" && (
        <PreferencesTab
          theme={theme}
          setTheme={setTheme}
          user={user}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          profileSaving={profileSaving}
          profileSaved={profileSaved}
          saveProfile={saveProfile}
        />
      )}
    </div>
  );
}

function PreferencesTab({
  theme,
  setTheme,
  user,
  profileForm,
  setProfileForm,
  profileSaving,
  profileSaved,
  saveProfile,
}: {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  user: ReturnType<typeof useAuth>["user"];
  profileForm: { name: string; organization: string; phone: string };
  setProfileForm: React.Dispatch<
    React.SetStateAction<{ name: string; organization: string; phone: string }>
  >;
  profileSaving: boolean;
  profileSaved: boolean;
  saveProfile: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Panel
        eyebrow="Appearance"
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="size-4 text-primary" />
            Theme
          </span>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { id: "dark", label: "Dark", icon: Moon, desc: "Mission control · default" },
            { id: "light", label: "Light", icon: Sun, desc: "Daylight console" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as "dark" | "light")}
              className={cn(
                "text-left rounded-xl border p-4 transition-all",
                theme === t.id
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="size-9 rounded-lg glass grid place-items-center">
                <t.icon className="size-4 text-primary" />
              </div>
              <div className="font-medium mt-3">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
            </button>
          ))}
        </div>
      </Panel>

      {/* Notifications */}
      <Panel
        eyebrow="Notifications"
        title={
          <span className="inline-flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            Alert channels
          </span>
        }
      >
        <div className="space-y-3">
          {[
            { l: "Critical air quality alerts", d: "Push + SMS · always-on", on: true },
            { l: "Water non-compliance", d: "Email · daily digest", on: true },
            { l: "Weekly sustainability digest", d: "Every Monday 09:00", on: true },
            { l: "Forecast advisories", d: "When AQI > 150 expected", on: false },
            { l: "Citizen report updates", d: "When status changes", on: true },
          ].map((n, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-border p-3"
            >
              <div>
                <div className="text-sm font-medium">{n.l}</div>
                <div className="text-xs text-muted-foreground">{n.d}</div>
              </div>
              <Toggle defaultOn={n.on} />
            </div>
          ))}
        </div>
      </Panel>

      {/* Profile */}
      <Panel
        eyebrow="Account"
        title={
          <span className="inline-flex items-center gap-2">
            <User className="size-4 text-primary" />
            Profile
          </span>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Display name"
            value={profileForm.name}
            onChange={(e) => setProfileForm((v) => ({ ...v, name: e.target.value }))}
          />
          <Field
            label="Email"
            value={user?.email ?? ""}
            readOnly
            className="opacity-60 cursor-not-allowed"
          />
          <Field
            label="Organization"
            value={profileForm.organization}
            onChange={(e) => setProfileForm((v) => ({ ...v, organization: e.target.value }))}
          />
          <Field
            label="Phone"
            value={profileForm.phone}
            onChange={(e) => setProfileForm((v) => ({ ...v, phone: e.target.value }))}
          />
        </div>
        <div className="flex justify-end items-center gap-2 mt-4">
          {profileSaved && (
            <span className="text-sm text-[var(--color-success)] inline-flex items-center gap-1.5">
              <CheckCircle className="size-4" /> Saved!
            </span>
          )}
          <button
            className="glass rounded-lg px-4 py-2 text-sm"
            onClick={() =>
              setProfileForm({
                name: user?.name ?? "",
                organization: user?.organization ?? "",
                phone: user?.phone ?? "",
              })
            }
          >
            Cancel
          </button>
          <button
            onClick={saveProfile}
            disabled={profileSaving}
            className="aurora text-primary-foreground rounded-lg px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            {profileSaving && <Loader2 className="size-3.5 animate-spin" />} Save changes
          </button>
        </div>
      </Panel>

      {/* Localization */}
      <Panel
        eyebrow="Localization"
        title={
          <span className="inline-flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            Region & units
          </span>
        }
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Language" defaultValue="English (India)" />
          <Field label="Units" defaultValue="Metric (°C, µg/m³)" />
        </div>
      </Panel>
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 bg-background rounded-full transition-transform",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}

function Field({
  label,
  className,
  ...rest
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        {...rest}
        className={cn(
          "mt-1.5 w-full rounded-lg border border-input bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
          className,
        )}
      />
    </label>
  );
}
