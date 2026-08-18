/**
 * citizen-hub-page.tsx
 *
 * Citizen Hub Information Architecture:
 * - Desktop & Mobile Navigation:
 *   1. Home (Citizen Dashboard: Welcome, Status Cards, Quick Actions, My Complaints, City Environment Snapshot, Recent Activity)
 *   2. Complaints (My Complaints list with search, filters, unread badges)
 *   3. + Report (Practical civic-service complaint form)
 *
 * - Profile accessible via global avatar menu & Quick Actions.
 * - Messaging is complaint-scoped inside Complaint Workspace.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  LogIn,
  Home as HomeIcon,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";
import { CitizenDashboard } from "./citizen-dashboard";
import { CitizenComplaintList } from "./citizen-complaint-list";
import { CitizenComplaintWorkspace } from "./citizen-complaint-workspace";
import { CitizenSubmitForm } from "./citizen-submit-form";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = "home" | "complaints" | "new";

// ─── Unauthenticated banner ───────────────────────────────────────────────────

function UnauthenticatedBanner() {
  return (
    <div className="rounded-2xl p-6 border border-border/80 bg-card/60 backdrop-blur flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
      <div>
        <h3 className="font-semibold text-foreground">Sign in to access the Citizen Hub</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submit environmental reports, track progress with authorities, and download official case records.
        </p>
      </div>
      <Link
        to="/login"
        className="shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-primary/90 transition-colors"
      >
        <LogIn className="size-4" />
        Sign In
      </Link>
    </div>
  );
}

// ─── Tab navigation (Home | Complaints | + Report) ─────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "complaints", label: "Complaints", icon: FileText },
    { id: "new", label: "+ Report", icon: Plus },
  ];

  return (
    <nav
      aria-label="Citizen Hub Navigation"
      className="flex items-center gap-1 p-1 bg-muted/60 rounded-2xl border border-border/80 w-fit overflow-x-auto"
    >
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap",
            active === id
              ? "bg-card shadow-sm text-foreground border border-border/60"
              : "text-muted-foreground hover:text-foreground",
            id === "new" && active !== "new" && "text-primary hover:text-primary font-bold",
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── New Complaint tab header ─────────────────────────────────────────────────

function NewComplaintHeader({ onViewComplaints }: { onViewComplaints: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
          Report Issue
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
          New Environmental Complaint
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Report an environmental concern in your area. Your submission will be routed to the appropriate civic authority.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-8 shrink-0"
        onClick={onViewComplaints}
      >
        <FileText className="size-3.5 mr-1" />
        My Complaints
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CitizenHubPage() {
  const { t } = useTranslation("citizen");
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<TabId>("home");
  const [openComplaintId, setOpenComplaintId] = useState<string | null>(null);
  const [statusFilterPreset, setStatusFilterPreset] = useState<string | null>(null);

  function handleOpenComplaint(id: string) {
    setOpenComplaintId(id);
  }

  function handleNewComplaintFromDashboard() {
    setTab("new");
  }

  function handleViewComplaintsFromDashboard(statusFilter?: string) {
    setStatusFilterPreset(statusFilter ?? "");
    setTab("complaints");
  }

  // Non-authenticated welcome screen
  if (!isAuthenticated) {
    return (
      <div className="px-4 md:px-8 py-8 space-y-6 max-w-[1200px] mx-auto">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            {t("title") || "Citizen Hub"}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1">
            Citizen Environmental Protection Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Report environmental violations, track investigation milestones, and collaborate with municipal authorities.
          </p>
        </header>
        <UnauthenticatedBanner />
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              title: "Report an Issue",
              desc: "File complaints with photographic camera evidence, GPS location, and link support.",
              icon: "📝",
            },
            {
              title: "Track Case Milestones",
              desc: "Follow your report through assignment, on-site investigation, and resolution.",
              icon: "🔍",
            },
            {
              title: "Official Verification Records",
              desc: "Direct communication with assigned authorities and official downloadable PDF reports.",
              icon: "📄",
            },
          ].map((item) => (
            <Panel key={item.title}>
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-sm text-foreground">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  // Role guard
  if (user && user.role !== "citizen") {
    return (
      <div className="px-4 md:px-8 py-8 w-full max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-3 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Citizen Hub Access</h2>
          <p className="text-sm text-muted-foreground">
            The Citizen Hub is designed for residents to file and track environmental complaints.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Go to Operations Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-6 w-full max-w-[1400px] mx-auto">
      {/* ── Top Navigation Bar: ONLY Home | Complaints | + Report ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* ── Content Panes ── */}
      {tab === "home" && (
        <CitizenDashboard
          userName={user?.name ?? "Citizen"}
          onNewComplaint={handleNewComplaintFromDashboard}
          onViewHistory={handleViewComplaintsFromDashboard}
          onOpenComplaint={handleOpenComplaint}
        />
      )}

      {tab === "complaints" && (
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-5 space-y-4 shadow-sm">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
              Complaint History
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground mt-0.5">
              My Environmental Complaints
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All complaints filed by you with real-time status and authority updates.
            </p>
          </div>
          <div className="border-t border-border/50 pt-2" />
          <CitizenComplaintList
            initialStatusFilter={statusFilterPreset}
            onOpenComplaint={handleOpenComplaint}
          />
        </div>
      )}

      {tab === "new" && (
        <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur p-5 sm:p-6 space-y-5 w-full shadow-sm">
          <NewComplaintHeader onViewComplaints={() => setTab("complaints")} />
          <div className="border-t border-border/50" />
          <CitizenSubmitForm
            onSuccess={(id) => {
              setTab("complaints");
              setOpenComplaintId(id);
            }}
          />
        </div>
      )}

      {/* ── Single Source of Truth: Complaint Detail & Workspace Drawer ── */}
      <CitizenComplaintWorkspace
        complaintId={openComplaintId}
        onClose={() => setOpenComplaintId(null)}
      />
    </div>
  );
}
