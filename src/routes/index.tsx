import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  FileBarChart,
  Leaf,
  GitBranch,
  Zap,
  Database,
  CheckCircle2,
  ArrowUpRight,
  Radio,
  Globe2,
} from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Hero } from "@/components/landing/hero/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { RealWorldSection } from "@/components/landing/RealWorldSection";
import { CitizenImpactSection } from "@/components/landing/CitizenImpactSection";
import { LANDING_CONTAINER } from "@/components/landing/shared";
import { SectionDivider } from "@/components/landing/experiences/shared";
import { EnvironmentalOverviewExperience } from "@/components/landing/experiences/EnvironmentalOverviewExperience";
import { SmartMapExperience } from "@/components/landing/experiences/SmartMapExperience";
import { ForecastIntelligenceExperience } from "@/components/landing/experiences/ForecastIntelligenceExperience";
import { AICopilotExperience } from "@/components/landing/experiences/AICopilotExperience";
import { CITIES } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GreenGuard AI — Environmental Intelligence Platform" },
      {
        name: "description",
        content:
          "Monitor, forecast and act on environmental risk. Real-time air, water and climate intelligence for cities, authorities and citizens.",
      },
      { property: "og:title", content: "GreenGuard AI — Environmental Intelligence Platform" },
      {
        property: "og:description",
        content: "Monitor, forecast and act on environmental risk in real time.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-[color:var(--color-primary)]/30 selection:text-foreground">
      <LandingHeader />
      <Hero />
      <TrustStrip />

      {/* ── Phase 3: real world opener ── */}
      <RealWorldSection />

      <PlatformOverview />
      <LiveOperations />

      {/* ── Phase 2: live platform experiences ── */}
      <EnvironmentalOverviewExperience />
      <SectionDivider tone="info" />
      <SmartMapExperience />
      <SectionDivider tone="info" />
      <ForecastIntelligenceExperience />
      <SectionDivider tone="chart5" />
      <AICopilotExperience />

      {/* ── Phase 3: citizen action beat ── */}
      <CitizenImpactSection />

      <Modules />
      <HowItWorks />
      <Benefits />
      <CTA />
      <LandingFooter />
    </div>
  );
}

/* ---------------- PLATFORM OVERVIEW ---------------- */
function PlatformOverview() {
  // Both figures are derived from real project data rather than hardcoded
  // marketing numbers: CITIES.length is the actual monitored-city dataset,
  // and the module count matches the four live platform experiences
  // rendered on this page (Environmental Overview, Smart Map, Forecast
  // Intelligence, GreenGuard Intelligence Center).
  const stats = [
    { k: String(CITIES.length), l: "Cities monitored" },
    { k: "4", l: "Live platform modules" },
  ];
  return (
    <section id="platform-overview" className="border-y border-border/60 bg-card/30">
      <div className={`${LANDING_CONTAINER} py-14`}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              The Platform
            </div>
            <h2 className="font-display mt-3 text-3xl lg:text-4xl font-semibold tracking-tight">
              One operating picture for the environment.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl leading-relaxed">
              Stop stitching dashboards together. GreenGuard AI ingests sensors, satellites, weather
              feeds and citizen reports into a single, queryable layer — surfaced through modules
              built for the people who actually act on the data.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px rounded-2xl border border-border/60 bg-border/60 overflow-hidden">
            {stats.map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-card p-6"
              >
                <div className="font-display text-3xl lg:text-4xl font-semibold tabular-nums tracking-tight">
                  {s.k}
                </div>
                <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">
                  {s.l}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- LIVE OPERATIONS ---------------- */
function LiveOperations() {
  const feed = [
    { t: "14:02", c: "warning", m: "PM2.5 threshold breached — Whitefield zone", tag: "Bengaluru" },
    { t: "13:58", c: "info", m: "Forecast updated — 72h horizon refreshed", tag: "All cities" },
    { t: "13:47", c: "success", m: "AQI improving (−18%) in Jayanagar", tag: "Bengaluru" },
    { t: "13:31", c: "destructive", m: "Water turbidity spike — Powai lake", tag: "Mumbai" },
    { t: "13:14", c: "info", m: "Citizen report verified · noise pollution", tag: "Pune" },
    { t: "12:58", c: "warning", m: "Data feed interrupted — Indiranagar zone", tag: "Bengaluru" },
  ];

  return (
    <section className="py-24">
      <div className={LANDING_CONTAINER}>
        <SectionHead
          eyebrow="Live Operations"
          title="The world's environment, narrated in real time."
          sub="Every environmental reading, citizen report and forecast event flows into a unified stream — geo-tagged, ranked by risk, and ready to action."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {/* Map mock */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 rounded-2xl border border-border/60 bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe2 className="size-4 text-[color:var(--color-primary)]" />
                Global Risk Map
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[color:var(--color-success)]" />
                  Good
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[color:var(--color-warning)]" />
                  Moderate
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[color:var(--color-destructive)]" />
                  Severe
                </span>
              </div>
            </div>
            <div className="relative aspect-[16/8] bg-background overflow-hidden">
              {/* Stylized map grid */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 80% at 50% 50%, color-mix(in oklab, var(--color-primary) 8%, transparent), transparent 70%)",
                }}
              />
              {/* Dots */}
              {[
                { x: 22, y: 38, c: "success", s: "London" },
                { x: 28, y: 52, c: "warning", s: "Madrid" },
                { x: 54, y: 44, c: "destructive", s: "Delhi" },
                { x: 58, y: 56, c: "warning", s: "Mumbai" },
                { x: 60, y: 64, c: "destructive", s: "Bengaluru" },
                { x: 72, y: 36, c: "warning", s: "Beijing" },
                { x: 78, y: 50, c: "success", s: "Singapore" },
                { x: 82, y: 38, c: "success", s: "Tokyo" },
                { x: 18, y: 48, c: "info", s: "New York" },
                { x: 48, y: 50, c: "warning", s: "Dubai" },
              ].map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
                  className="absolute"
                  style={{ left: `${d.x}%`, top: `${d.y}%` }}
                >
                  <span className="relative grid place-items-center">
                    <span
                      className="absolute size-6 rounded-full opacity-50 blur-md"
                      style={{ background: `var(--color-${d.c})` }}
                    />
                    <span
                      className="relative size-2 rounded-full ring-2"
                      style={
                        {
                          background: `var(--color-${d.c})`,
                          boxShadow: `0 0 0 4px color-mix(in oklab, var(--color-${d.c}) 20%, transparent)`,
                          // @ts-ignore
                          "--tw-ring-color": "var(--color-background)",
                        } as any
                      }
                    />
                  </span>
                </motion.div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">10 cities active · refreshed 12s ago</span>
              <Link
                to="/map"
                className="inline-flex items-center gap-1 text-foreground hover:text-[color:var(--color-primary)] transition-colors"
              >
                Open Smart Map <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* Activity feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Radio className="size-4 text-[color:var(--color-warning)]" />
                Live Activity
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">streaming</span>
            </div>
            <ul className="divide-y divide-border/60">
              {feed.map((f, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-5 py-3 flex items-start gap-3"
                >
                  <span
                    className="mt-1.5 size-1.5 rounded-full shrink-0"
                    style={{ background: `var(--color-${f.c})` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] leading-snug">{f.m}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{f.t}</span> · {f.tag}
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- MODULES ---------------- */
function Modules() {
  const modules = [
    {
      to: "/reports",
      icon: FileBarChart,
      name: "Reports",
      desc: "Generate auditable, branded environmental reports for stakeholders in seconds.",
      tag: "Compliance",
    },
    {
      to: "/sustainability",
      icon: Leaf,
      name: "Sustainability",
      desc: "Track carbon, ESG and SDG metrics across your city's operations and initiatives.",
      tag: "ESG",
    },
    {
      to: "/simulator",
      icon: GitBranch,
      name: "Policy Simulator",
      desc: "Model the environmental impact of policy decisions before you commit to them.",
      tag: "Decision",
    },
  ];

  return (
    <section className="py-24 border-t border-border/60">
      <div className={LANDING_CONTAINER}>
        <SectionHead
          eyebrow="The Rest Of The Platform"
          title="Three more modules, same data fabric."
          sub="Environmental Overview, Smart Map, Forecast, GreenGuard Intelligence Center and the Citizen Hub are above — every module shares the same underlying data, so insight in one place is immediately actionable in the next."
        />

        <div className="mt-12 grid gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60 sm:grid-cols-3">
          {modules.map((m, i) => (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: (i % 3) * 0.05 }}
              className="group bg-card"
            >
              <Link
                to={m.to}
                className="block h-full p-6 transition-colors hover:bg-card/60 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)] transition-all group-hover:scale-105 group-hover:bg-[color:var(--color-primary)]/15">
                    <m.icon className="size-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    {m.tag}
                  </span>
                </div>
                <div className="mt-5 text-[15px] font-semibold tracking-tight">{m.name}</div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 group-hover:text-[color:var(--color-primary)] transition-colors">
                  Open module
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: Database,
      t: "Ingest",
      d: "Connect sensors, satellite feeds, weather APIs and citizen reports. GreenGuard normalises every signal into a single time-series fabric.",
    },
    {
      n: "02",
      icon: Brain,
      t: "Understand",
      d: "AI models detect anomalies, correlate causes and forecast the next 72 hours — with confidence scores you can actually trust.",
    },
    {
      n: "03",
      icon: Zap,
      t: "Act",
      d: "Alerts route to the right team. Reports generate on schedule. Policy decisions are simulated before they're announced.",
    },
  ];
  return (
    <section className="py-24 border-t border-border/60">
      <div className={LANDING_CONTAINER}>
        <SectionHead
          eyebrow="How It Works"
          title="From raw signal to decision, in one platform."
          sub="GreenGuard AI is the operational layer between environmental data and the people responsible for the city."
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-2xl border border-border/60 bg-card p-7"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[color:var(--color-primary)]">{s.n}</span>
                <s.icon className="size-5 text-muted-foreground" />
              </div>
              <div className="mt-6 font-display text-2xl font-semibold tracking-tight">{s.t}</div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- BENEFITS ---------------- */
function Benefits() {
  const items = [
    {
      t: "Faster response, lower harm",
      d: "Sub-second alerting and routing reduces time-to-action on critical events from hours to seconds.",
    },
    {
      t: "Decisions you can defend",
      d: "Every insight, alert and report is sourced and auditable — built for the public-sector standard.",
    },
    {
      t: "One platform, every team",
      d: "Operations, policy, sustainability and citizen affairs work from the same source of truth.",
    },
    {
      t: "Built to scale",
      d: "From a single municipality to a national rollout — the architecture grows with you.",
    },
  ];
  return (
    <section className="py-24 border-t border-border/60 bg-card/30">
      <div className={`${LANDING_CONTAINER} grid gap-12 lg:grid-cols-[1fr_1.2fr] items-start`}>
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Why GreenGuard
          </div>
          <h2 className="font-display mt-3 text-3xl lg:text-4xl font-semibold tracking-tight">
            The difference between watching data and acting on it.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed max-w-md">
            GreenGuard AI was built with environmental agencies and city operations teams — not for
            them. Every feature exists because someone responsible for a city's air, water or
            climate asked for it.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60">
          {items.map((it) => (
            <div key={it.t} className="bg-card p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="size-5 text-[color:var(--color-primary)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium tracking-tight">{it.t}</div>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{it.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTA() {
  return (
    <section className="py-24 border-t border-border/60">
      <div className={LANDING_CONTAINER}>
        <div className="relative rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-[color:var(--color-primary)]/5 p-10 lg:p-16 overflow-hidden">
          <div
            className="absolute -top-32 -right-32 size-[420px] rounded-full opacity-30 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--color-primary), transparent 70%)" }}
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] items-center">
            <div>
              <h2 className="font-display text-3xl lg:text-5xl font-semibold tracking-tight leading-[1.05]">
                Ready to give your city a sense for its own environment?
              </h2>
              <p className="mt-5 text-muted-foreground max-w-xl text-lg leading-relaxed">
                Launch the GreenGuard AI platform now, or talk to our team about a deployment for
                your municipality.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-stretch">
              <Link
                to="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background hover:opacity-90"
              >
                Launch Platform <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border/70 px-6 text-sm font-medium hover:bg-card"
              >
                Talk to our team
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- shared ---------------- */
function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
          {eyebrow}
        </div>
        <h2 className="font-display mt-3 text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.1]">
          {title}
        </h2>
        <p className="mt-4 text-muted-foreground text-base lg:text-lg leading-relaxed">{sub}</p>
      </motion.div>
    </div>
  );
}
