import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HeadphonesIcon,
  Search,
  TicketIcon,
  Phone,
  Mail,
  Calendar,
  X,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Shield,
  Users,
  ExternalLink,
  MapPin,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, DUR_SM, EASE_OUT, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import {
  StatusBadge,
  PriorityBadge,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
} from "./support-ui";
import {
  SUPPORT_CATEGORIES,
  DEPARTMENTS,
  ENVIRONMENTS,
  TICKET_STATUS_STYLE,
  AUTHORITY_DIRECTORY,
  type AuthorityCard,
} from "./support-data";
import type { TicketStatus } from "./support-data";
import { useTickets, useTicketStats } from "./support-store";
import type { SupportTicketDTO } from "@/lib/api/support.api";
import { TicketDetailSheet } from "./ticket-detail-sheet";

// ─── 1. Emergency Helpline Strip ──────────────────────────────────────────────

function EmergencyStrip() {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start sm:items-center gap-3">
        <div className="size-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <AlertTriangle className="size-4" />
        </div>
        <div>
          <div className="text-xs font-semibold text-destructive uppercase tracking-wide">
            Environmental Emergency
          </div>
          <p className="text-xs text-muted-foreground">
            Need to report an active environmental disaster, chemical spill, or hazardous condition?
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto flex-wrap">
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Phone className="size-3" />
          Call Emergency Line (112)
        </a>
        <a
          href="tel:1800114000"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 bg-background text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
        >
          CPCB Helpline (1800-11-4000)
        </a>
      </div>
    </div>
  );
}

// ─── 2. Support Hero ──────────────────────────────────────────────────────────

function SupportHero({
  onViewTickets,
  onBrowseDirectory,
}: {
  onViewTickets: () => void;
  onBrowseDirectory: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card/80 p-6 sm:p-8 md:p-10 space-y-6">
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <HeadphonesIcon className="size-3 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
            Support Center
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          How can we help you?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          Choose a support option below or contact the right GreenGuard team for assistance.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="tel:+918001234567"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Phone className="size-4" />
            Call Support
          </a>
          <button
            onClick={onBrowseDirectory}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold text-foreground transition-colors"
          >
            <Users className="size-4 text-primary" />
            Authority Directory
          </button>
          <button
            onClick={onViewTickets}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="size-4" />
            View Support Requests
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Contact Support Channels (Direct Contact) ─────────────────────────────

interface ContactChannel {
  id: string;
  title: string;
  description: string;
  icon: typeof Phone;
  actionText: string;
  actionHref?: string;
  onClick?: () => void;
  availability: string;
  highlight?: boolean;
}

function ContactChannelsSection({
  onScheduleCallback,
  onBrowseDirectory,
}: {
  onScheduleCallback: () => void;
  onBrowseDirectory: () => void;
}) {
  const channels: ContactChannel[] = [
    {
      id: "email",
      title: "Email Support",
      description: "Send a detailed message to the support team for written assistance.",
      icon: Mail,
      actionText: "Send Email",
      actionHref: "mailto:greengaurd.ai.in@gmail.com",
      availability: "greengaurd.ai.in@gmail.com",
      highlight: true,
    },
    {
      id: "phone",
      title: "Phone Support",
      description: "Speak directly with a support representative during operational hours.",
      icon: Phone,
      actionText: "Call Support",
      actionHref: "tel:+918001234567",
      availability: "Mon–Fri, 9:00 AM – 6:00 PM IST",
    },
    {
      id: "callback",
      title: "Schedule a Callback",
      description: "Choose a convenient time for a support specialist to contact you.",
      icon: Calendar,
      actionText: "Schedule Callback",
      onClick: onScheduleCallback,
      availability: "Within 1 business day",
    },
    {
      id: "authority",
      title: "Authority Directory",
      description:
        "Find the correct environmental authority, department, or responsible contact.",
      icon: Users,
      actionText: "Browse Directory",
      onClick: onBrowseDirectory,
      availability: "National & Regional Directory",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Contact Support</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose the channel that works best for you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((channel) => {
          const Icon = channel.icon;
          const content = (
            <div
              className={cn(
                "group flex flex-col justify-between p-5 rounded-xl border bg-card/70 h-full",
                channel.highlight
                  ? "border-primary/40 shadow-sm"
                  : "border-border/80 hover:border-border",
                "transition-all duration-200",
              )}
            >
              <div className="space-y-3">
                <div
                  className={cn(
                    "size-10 rounded-xl flex items-center justify-center",
                    channel.highlight
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{channel.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {channel.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/40 space-y-2">
                <span className="text-[11px] text-muted-foreground/70 block truncate">
                  {channel.availability}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-semibold",
                    channel.highlight
                      ? "text-primary group-hover:underline"
                      : "text-foreground group-hover:text-primary",
                    "transition-colors",
                  )}
                >
                  {channel.actionText}
                  <ChevronRight className="size-3.5" />
                </span>
              </div>
            </div>
          );

          if (channel.actionHref) {
            return (
              <a
                key={channel.id}
                href={channel.actionHref}
                className="block outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
              >
                {content}
              </a>
            );
          }

          return (
            <button
              key={channel.id}
              type="button"
              onClick={channel.onClick}
              className="text-left block w-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── 4. Authority Directory Section ───────────────────────────────────────────

function AuthorityDirectorySection() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "national" | "state" | "district">("all");

  const filtered = useMemo(() => {
    return AUTHORITY_DIRECTORY.filter((a) => {
      const matchesLevel = levelFilter === "all" || a.level === levelFilter;
      if (!matchesLevel) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.department.toLowerCase().includes(q) ||
        a.serviceArea.toLowerCase().includes(q) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.jurisdiction && a.jurisdiction.toLowerCase().includes(q)) ||
        (a.services && a.services.some((s) => s.toLowerCase().includes(q)))
      );
    });
  }, [search, levelFilter]);

  const LEVEL_STYLE: Record<string, { label: string; color: string }> = {
    national: { label: "National", color: "var(--color-destructive)" },
    state: { label: "State", color: "var(--color-warning)" },
    district: { label: "District", color: "var(--color-info)" },
  };

  return (
    <section className="space-y-4" id="authority-directory-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Authority Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Find the right environmental authority or support contact for your issue.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary/50 transition-all">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search authority, department, area, or service…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 shrink-0 overflow-x-auto">
          {(["all", "national", "state", "district"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150",
                levelFilter === l
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l === "all" ? "All Levels" : l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Users className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-foreground">No matching authorities found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your search query or level filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((auth: AuthorityCard) => {
            const level = LEVEL_STYLE[auth.level] ?? {
              label: auth.level,
              color: "var(--color-primary)",
            };
            return (
              <div
                key={auth.id}
                className="rounded-xl border border-border/80 bg-card p-5 space-y-3 hover:border-primary/30 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        color: level.color,
                        background: `color-mix(in oklab, ${level.color} 10%, transparent)`,
                      }}
                    >
                      {level.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {auth.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground leading-snug">{auth.name}</h3>
                    <p className="text-xs text-muted-foreground">{auth.department}</p>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed">{auth.role}</p>

                  <div className="space-y-1 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{auth.serviceArea}</span>
                    </div>
                    {auth.officeHours && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{auth.officeHours}</span>
                      </div>
                    )}
                  </div>

                  {auth.services && auth.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {auth.services.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/60"
                        >
                          {s}
                        </span>
                      ))}
                      {auth.services.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{auth.services.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Row */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {auth.phone && (
                      <a
                        href={`tel:${auth.phone.replace(/[^0-9+]/g, "")}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <Phone className="size-3 text-primary" />
                        <span>{auth.phone}</span>
                      </a>
                    )}
                    {auth.email && (
                      <a
                        href={`mailto:${auth.email}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title={auth.email}
                      >
                        <Mail className="size-3" />
                        <span className="hidden sm:inline">Email</span>
                      </a>
                    )}
                  </div>
                  {auth.website && (
                    <a
                      href={auth.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium ml-auto"
                    >
                      <span>Website</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ─── 5. Support Availability ──────────────────────────────────────────────────

function SupportAvailabilitySection() {
  const items = [
    {
      title: "Email Support Desk",
      desc: "Mon–Fri, 9:00 AM – 6:00 PM IST. Typical response within 1 business day.",
      icon: Mail,
    },
    {
      title: "Phone Assistance",
      desc: "Mon–Fri, 9:00 AM – 6:00 PM IST for active platform inquiries and verification.",
      icon: Phone,
    },
    {
      title: "Tracked Ticket Portal",
      desc: "Available 24/7 for filing issues, reviewing audit trails, and tracking resolutions.",
      icon: TicketIcon,
    },
    {
      title: "Emergency Response",
      desc: "24/7 coordination for critical environmental and hazardous compliance alerts.",
      icon: Shield,
    },
  ];

  return (
    <section className="rounded-xl border border-border/70 bg-card/40 p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase tracking-wider text-[11px] text-muted-foreground">
          Support Availability
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="size-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-xs font-semibold text-foreground">{item.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── 6. Create Ticket Form ────────────────────────────────────────────────────

function CreateTicketForm({
  initialCategory,
  onBack,
  onSuccess,
}: {
  initialCategory?: string;
  onBack: () => void;
  onSuccess: (id: string) => void;
}) {
  const { createTicket, isCreating } = useTickets();
  const [subject, setSubject] = useState(
    initialCategory === "Callback Request" ? "Callback Request: Platform Assistance" : "",
  );
  const [category, setCategory] = useState(
    initialCategory && SUPPORT_CATEGORIES.includes(initialCategory)
      ? initialCategory
      : SUPPORT_CATEGORIES[0] || "General Support",
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [environment, setEnvironment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = "Subject is required";
    if (!category) e.category = "Category is required";
    if (!description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createTicket({ subject, category, priority, description, department, environment })
      .then((result) => onSuccess(result.ticket._id))
      .catch(() => {});
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Support Center
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Create Support Request</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Describe the assistance or technical issue you require help with.
          </p>
        </div>

        <div className="space-y-4">
          <FormField label="Subject" required>
            <FormInput
              value={subject}
              onChange={setSubject}
              placeholder="Brief summary of your request"
            />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category" required>
              <FormSelect
                value={category}
                onChange={setCategory}
                options={SUPPORT_CATEGORIES}
                placeholder="Select category"
              />
              {errors.category && (
                <p className="text-xs text-destructive mt-1">{errors.category}</p>
              )}
            </FormField>
            <FormField label="Priority">
              <FormSelect
                value={priority}
                onChange={(v) => setPriority(v as typeof priority)}
                options={["low", "medium", "high", "critical"]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Department (optional)">
              <FormSelect
                value={department}
                onChange={setDepartment}
                options={DEPARTMENTS}
                placeholder="Select department"
              />
            </FormField>
            <FormField label="Environment (optional)">
              <FormSelect
                value={environment}
                onChange={setEnvironment}
                options={ENVIRONMENTS}
                placeholder="Select environment"
              />
            </FormField>
          </div>

          <FormField label="Description" required>
            <FormTextarea
              value={description}
              onChange={setDescription}
              placeholder="Provide full details regarding what you need assistance with, including error messages or specific steps."
              rows={5}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </FormField>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isCreating}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <TicketIcon className="size-4" />
              )}
              {isCreating ? "Submitting…" : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Support Requests Dashboard ────────────────────────────────────────────

function TicketsSection({
  onCreateTicket,
  initialSelectedId,
}: {
  onCreateTicket: () => void;
  initialSelectedId?: string | null;
}) {
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { tickets, isLoading, isError, refetch } = useTickets(
    filter !== "all" ? { status: filter } : undefined,
  );

  const counts = {
    all: stats?.total ?? 0,
    open: stats?.open ?? 0,
    in_progress: stats?.in_progress ?? 0,
    waiting: stats?.waiting ?? 0,
    resolved: stats?.resolved ?? 0,
    closed: stats?.closed ?? 0,
  };

  return (
    <section className="space-y-4" id="tickets-section">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Your Support Requests
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track conversations and requests you've already submitted to our support team.
          </p>
        </div>
        <button
          onClick={onCreateTicket}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="size-3.5 text-primary" />
          Create a Support Request
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto gap-1 p-1 rounded-xl border border-border/80 bg-muted/30">
        {(["all", "open", "in_progress", "waiting", "resolved", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0",
              filter === s
                ? "bg-background text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "all"
              ? `All (${counts.all})`
              : `${TICKET_STATUS_STYLE[s]?.label ?? s} (${counts[s] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading requests…</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Failed to load support requests.</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No support requests yet"
          description={
            filter === "all"
              ? "You can create a ticket whenever you need help from our team."
              : `No ${TICKET_STATUS_STYLE[filter as TicketStatus]?.label ?? filter} requests found.`
          }
          action={
            filter === "all" ? (
              <button
                onClick={onCreateTicket}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Create a Support Request
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: SupportTicketDTO) => (
            <div
              key={ticket._id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTicketId(ticket._id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSelectedTicketId(ticket._id);
              }}
              className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 cursor-pointer hover:border-primary/40 hover:bg-card transition-colors duration-150 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      #{ticket._id.slice(-6).toUpperCase()}
                    </span>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug truncate">
                    {ticket.subject}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{ticket.category}</span>
                    {ticket.department && <span>· {ticket.department}</span>}
                    <span>· Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                    {ticket.comments.length > 0 && (
                      <span>
                        · {ticket.comments.length}{" "}
                        {ticket.comments.length === 1 ? "reply" : "replies"}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      <TicketDetailSheet
        ticketId={selectedTicketId}
        onOpenChange={(open) => {
          if (!open) setSelectedTicketId(null);
        }}
      />
    </section>
  );
}

// ─── Root Support Center Page ─────────────────────────────────────────────────

export function SupportCenterPage() {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const deepLinkId = initialParams.get("id");

  const [creatingTicket, setCreatingTicket] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [prefilledCategory, setPrefilledCategory] = useState<string | undefined>(undefined);

  const handleTicketSuccess = (id: string) => {
    setCreatedId(id);
    setCreatingTicket(false);
    setPrefilledCategory(undefined);
  };

  const handleOpenTicketForm = (cat?: string) => {
    setPrefilledCategory(cat);
    setCreatingTicket(true);
  };

  const scrollToTickets = () => {
    setCreatingTicket(false);
    const el = document.getElementById("tickets-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToDirectory = () => {
    setCreatingTicket(false);
    const el = document.getElementById("authority-directory-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        {/* 1. Environmental Emergency Helpline */}
        <EmergencyStrip />

        {/* 2. Support Introduction / Hero */}
        <SupportHero
          onViewTickets={scrollToTickets}
          onBrowseDirectory={scrollToDirectory}
        />

        {/* Creation or Main Sections */}
        <AnimatePresence mode="wait">
          {creatingTicket ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <CreateTicketForm
                initialCategory={prefilledCategory}
                onBack={() => {
                  setCreatingTicket(false);
                  setPrefilledCategory(undefined);
                }}
                onSuccess={handleTicketSuccess}
              />
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 sm:space-y-12"
            >
              {/* Success Banner */}
              {createdId && (
                <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-success/30 bg-success/5">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-5 text-success shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-success">Request submitted: </span>
                      <span className="text-sm font-mono text-foreground font-semibold">
                        #{createdId.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCreatedId(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* 3. Direct Contact Channels */}
              <ContactChannelsSection
                onScheduleCallback={() => handleOpenTicketForm("Callback Request")}
                onBrowseDirectory={scrollToDirectory}
              />

              {/* 4. Authority Directory */}
              <AuthorityDirectorySection />

              {/* 5. Support Availability */}
              <SupportAvailabilitySection />

              {/* 6. Your Support Requests */}
              <TicketsSection
                onCreateTicket={() => handleOpenTicketForm()}
                initialSelectedId={deepLinkId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
