/**
 * citizen-hub-page.tsx — Phase 12
 *
 * Changes vs Phase 8:
 *   - "New Complaint" tab renders full-width (no narrow Panel wrapper) to
 *     accommodate the two-column form + AI + map layout.
 *   - Improved responsive tab bar.
 *   - Minor layout/spacing polish.
 *   - All other tabs unchanged.
 */

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, LogIn, LayoutDashboard, FileText, BarChart3, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { CitizenDashboard } from "./citizen-dashboard";
import { CitizenComplaintList } from "./citizen-complaint-list";
import { CitizenComplaintWorkspace } from "./citizen-complaint-workspace";
import { CitizenSubmitForm } from "./citizen-submit-form";
import { CitizenAnalytics } from "./citizen-analytics";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type TabId = "dashboard" | "new" | "history" | "analytics";

const TABS: Array<{ id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "new", label: "New Complaint", icon: PenLine },
  { id: "history", label: "My Complaints", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

// ─── Unauthenticated banner ───────────────────────────────────────────────────

function UnauthenticatedBanner() {
  return (
    <div className="glass rounded-2xl p-6 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h3 className="font-semibold">Sign in to access the Citizen Hub</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Submit complaints, track your reports, and view your analytics.
        </p>
      </div>
      <Link
        to="/login"
        className="shrink-0 inline-flex items-center gap-2 aurora text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-medium"
      >
        <LogIn className="size-4" />
        Sign In
      </Link>
    </div>
  );
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-muted/50 rounded-2xl border border-border w-fit overflow-x-auto">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
            active === id
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── New Complaint tab header ─────────────────────────────────────────────────

function NewComplaintHeader({ onViewHistory }: { onViewHistory: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Report</div>
        <h2 className="text-xl font-semibold tracking-tight mt-0.5">Submit a New Complaint</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI-powered reporting — describe the issue and let the assistant guide you.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs shrink-0"
        onClick={onViewHistory}
      >
        View My Complaints
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CitizenHubPage() {
  const { user, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [openComplaintId, setOpenComplaintId] = useState<string | null>(null);

  function handleOpenComplaint(id: string) {
    setOpenComplaintId(id);
  }

  function handleNewComplaintFromDashboard() {
    setTab("new");
  }

  function handleViewHistoryFromDashboard() {
    setTab("history");
  }

  // Non-authenticated welcome screen
  if (!isAuthenticated) {
    return (
      <div className="px-4 md:px-8 py-8 space-y-6 max-w-[1400px] mx-auto">
        <header>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Citizen Hub
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Report. Track. Improve.</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Help your city respond faster — every report becomes a signal.
          </p>
        </header>
        <UnauthenticatedBanner />
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              title: "Submit a Complaint",
              desc: "Report environmental issues in your city with AI-assisted evidence and location.",
              icon: "📝",
            },
            {
              title: "Track Progress",
              desc: "Follow your complaint through every stage of the investigation lifecycle.",
              icon: "🔍",
            },
            {
              title: "View Analytics",
              desc: "Understand your impact with personal statistics and trends.",
              icon: "📊",
            },
          ].map((item) => (
            <Panel key={item.title}>
              <div className="text-2xl mb-3">{item.icon}</div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  // Role guard
  if (user && user.role !== "citizen") {
    return (
      <div className="px-4 md:px-8 py-8 max-w-[1400px] mx-auto">
        <div className="glass rounded-2xl p-8 text-center space-y-3">
          <h2 className="text-lg font-semibold">This page is for citizens.</h2>
          <p className="text-sm text-muted-foreground">
            The Citizen Hub is designed for residents reporting environmental complaints.
          </p>
          <Button asChild variant="outline">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 space-y-5 w-full">
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <TabBar active={tab} onChange={setTab} />
        <Button onClick={() => setTab("new")} className="gap-2 shrink-0" size="sm">
          <Plus className="size-3.5" />
          New Complaint
        </Button>
      </div>

      {/* ── Content ── */}
      {tab === "dashboard" && (
        <CitizenDashboard
          userName={user?.name ?? "Citizen"}
          onNewComplaint={handleNewComplaintFromDashboard}
          onViewHistory={handleViewHistoryFromDashboard}
          onOpenComplaint={handleOpenComplaint}
        />
      )}

      {tab === "new" && (
        /* Full-width container — no Panel wrapper to avoid narrow centering */
        <div className="glass rounded-2xl p-5 space-y-5 w-full">
          <NewComplaintHeader onViewHistory={() => setTab("history")} />
          {/* Divider */}
          <div className="border-t border-border/40" />
          <CitizenSubmitForm
            onSuccess={(id) => {
              setTab("history");
              setOpenComplaintId(id);
            }}
          />
        </div>
      )}

      {tab === "history" && (
        <Panel eyebrow="History" title="My Complaints">
          <CitizenComplaintList onOpenComplaint={handleOpenComplaint} />
        </Panel>
      )}

      {tab === "analytics" && (
        <Panel eyebrow="Personal" title="My Analytics">
          <CitizenAnalytics />
        </Panel>
      )}

      {/* ── Complaint Workspace Drawer ── */}
      <CitizenComplaintWorkspace
        complaintId={openComplaintId}
        onClose={() => setOpenComplaintId(null)}
      />
    </div>
  );
}
