import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Mail,
  CalendarDays,
  Moon,
  Sun,
  Lock,
  Loader2,
  CheckCircle,
  LayoutDashboard,
  UserCog,
  ClipboardCheck,
  MapPinned,
  HeartPulse,
  Camera,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme";
import { Panel, Pill, SectionTitle } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { ProfilePhotoDialog } from "@/components/profile/profile-photo-dialog";
import { decodeJwtPayload, describeBrowserAndOS } from "./session-utils";

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/60 last:border-0 gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-right">
        <div className="text-sm">{value}</div>
        {note && <div className="text-[11px] text-muted-foreground">{note}</div>}
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Dashboard", to: "/admin" as const, icon: LayoutDashboard },
  { label: "Authority Requests", to: "/admin/authority-requests" as const, icon: UserCog },
  { label: "User Directory", to: "/admin/users" as const, icon: UserCog },
  { label: "Complaint Queue", to: "/admin/complaints" as const, icon: ClipboardCheck },
  { label: "City Directory", to: "/admin/cities" as const, icon: MapPinned },
  { label: "Platform Health", to: "/admin/platform-health" as const, icon: HeartPulse },
];

export function AdminProfilePage() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  // ProtectedRoute guarantees an authenticated user by the time this renders.
  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const saveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === user.name) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      setSaved(true);
      setEditingName(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // toast shown by authApi
    } finally {
      setSaving(false);
    }
  };

  // Real session info, decoded from the access token already in localStorage
  // — see session-utils.ts.
  const accessToken =
    typeof window !== "undefined" ? localStorage.getItem("gg_access_token") : null;
  const tokenPayload = accessToken ? decodeJwtPayload(accessToken) : null;
  const browserInfo = typeof window !== "undefined" ? describeBrowserAndOS() : "Unavailable";

  return (
    <div className="px-3.5 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      <SectionTitle eyebrow="Administration" title="Profile & Settings" />

      {/* Profile header */}
      <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 aurora opacity-10" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() => setIsPhotoOpen(true)}
            title="Change photo"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setIsPhotoOpen(true)}
          >
            <ProfileAvatar
              profile={user}
              className="size-14 sm:size-16 rounded-2xl shadow-md ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
              fallbackClassName="text-lg sm:text-xl font-semibold"
            />
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="size-5" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{user.name}</h1>
              <Pill tone="muted">Administrator</Pill>
              {user.isVerified && <Pill tone="success">Verified</Pill>}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5 truncate">
                <Mail className="size-3.5 shrink-0" />
                {user.email}
              </span>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <CalendarDays className="size-3.5 shrink-0" />
                Joined {format(new Date(user.createdAt), "MMMM yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ProfilePhotoDialog open={isPhotoOpen} onOpenChange={setIsPhotoOpen} profile={user} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Account Settings */}
        <Panel title="Account Settings" eyebrow="Profile">
          <div className="space-y-5">
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Display Name</div>
              {editingName ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveName} disabled={saving} className="h-9 flex-1 sm:flex-none">
                      {saving && <Loader2 className="size-3.5 mr-1 animate-spin" />}Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingName(false);
                        setNameValue(user.name);
                      }}
                      className="h-9 flex-1 sm:flex-none"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{user.name}</span>
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="text-xs text-[var(--color-success)] inline-flex items-center gap-1">
                        <CheckCircle className="size-3.5" />
                        Saved
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setEditingName(true)} className="h-8 text-xs">
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">Preferred Theme</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["dark", Moon, "Dark"],
                    ["light", Sun, "Light"],
                  ] as const
                ).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2.5 sm:p-3 text-xs sm:text-sm transition-colors",
                      theme === id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <Icon className="size-4 text-primary shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Profile photo and language preferences aren't available yet — see this phase's Backend
              Gaps notes.
            </p>
          </div>
        </Panel>

        {/* Security */}
        <Panel title="Security" eyebrow="Account">
          <Row label="Email Verification" value={user.isVerified ? "Verified" : "Unverified"} />
          <Row label="Account Status" value={user.isActive ? "Active" : "Inactive"} />
          <Row label="Active Role" value="Administrator" />
          <Row label="Authentication Method" value="Email & password (JWT)" />
          <Link to="/settings">
            <Button variant="outline" className="w-full mt-4 h-9 text-xs sm:text-sm">
              <Lock className="size-3.5 mr-1.5" />
              Change Password
            </Button>
          </Link>
        </Panel>
      </div>

      {/* Active Session */}
      <Panel title="Active Session" eyebrow="This Device">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <div>
            <Row
              label="Last Login"
              value={
                user.lastLogin
                  ? format(new Date(user.lastLogin), "MMM d, yyyy 'at' h:mm a")
                  : "Not recorded"
              }
            />
            <Row
              label="Current Session Started"
              value={
                tokenPayload?.iat
                  ? format(new Date(tokenPayload.iat * 1000), "MMM d, yyyy 'at' h:mm a")
                  : "Unavailable"
              }
            />
          </div>
          <div>
            <Row
              label="Access Token Expires"
              value={
                tokenPayload?.exp
                  ? format(new Date(tokenPayload.exp * 1000), "h:mm:ss a")
                  : "Unavailable"
              }
              note="Refreshes automatically — you won't be signed out"
            />
            <Row label="Browser & Device" value={browserInfo} />
          </div>
        </div>
      </Panel>

      {/* Quick Links */}
      <Panel title="Quick Links" eyebrow="Navigate">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-2 rounded-lg border border-border p-2.5 sm:p-3 text-xs sm:text-sm hover:bg-muted transition-colors"
            >
              <l.icon className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate">{l.label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
