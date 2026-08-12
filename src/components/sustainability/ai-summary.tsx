/**
 * ai-summary.tsx — Phase 2 rule-based AI Executive Summary
 *
 * Generates a structured sustainability brief entirely from existing City
 * fields — no LLM, no external AI, no new backend. Four sections:
 *   1. Environmental Health — overall state
 *   2. Key Improvements   — positive signals
 *   3. Areas of Concern   — weak metrics
 *   4. Recommended Actions — practical next steps
 *
 * An "AI typing" entrance animation renders each section's text character
 * by character (or line by line for long bodies) using a simple interval —
 * no third-party typing library needed.
 *
 * Insight chips at the bottom scroll to the KPI section on click.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, Leaf, Recycle, Sun, Droplets, ChevronRight, CheckCircle2, AlertTriangle, Lightbulb, HeartPulse } from "lucide-react";
import type { City } from "@/lib/mock-data";

// ─── rule engine ─────────────────────────────────────────────────────────────

interface AiSection {
  id: string;
  icon: typeof Brain;
  title: string;
  color: string;
  body: string;
}

function buildSummary(city: City, renewableShare: number, greenCover: number): AiSection[] {
  const aqiGood    = city.aqi < 80;
  const aqiBad     = city.aqi >= 150;
  const waterGood  = city.water >= 75;
  const waterBad   = city.water < 55;
  const ecoHigh    = city.eco >= 75;
  const ecoLow     = city.eco < 50;
  const highCarbon = city.carbon > 7;
  const lowRenew   = renewableShare < 35;
  const lowGreen   = greenCover < 30;

  const health = ecoHigh
    ? `${city.name} is performing strongly across sustainability metrics, with a composite EcoScore of ${city.eco}/100. Air quality is ${aqiGood ? "within healthy limits" : "a recognised pressure point"}, and water sustainability stands at ${city.water}%.`
    : ecoLow
    ? `${city.name}'s current EcoScore of ${city.eco}/100 indicates significant environmental pressure. Key contributors include ${aqiBad ? "elevated particulate pollution" : "sub-optimal water quality"} and carbon intensity at ${city.carbon} tCO₂ per capita.`
    : `${city.name} shows a mixed sustainability profile with an EcoScore of ${city.eco}/100. Strengths in ${waterGood ? "water quality" : "green-cover initiatives"} are partially offset by ${aqiBad ? "air pollution levels" : "carbon-intensity patterns"} that warrant focused intervention.`;

  const improvements: string[] = [];
  if (aqiGood)       improvements.push(`Air quality is trending favourably with AQI at ${city.aqi} — within the "Good" band.`);
  if (waterGood)     improvements.push(`Water sustainability index (${city.water}%) exceeds the regional median, reflecting effective treatment and reuse programmes.`);
  if (!highCarbon)   improvements.push(`Per-capita carbon intensity (${city.carbon} tCO₂) is below the high-risk threshold, suggesting improved industrial efficiency.`);
  if (renewableShare >= 40) improvements.push(`Renewable energy accounts for ${renewableShare}% of the generation mix, ahead of the 40% grid target.`);
  if (greenCover >= 35)     improvements.push(`Urban green cover at ${greenCover}% supports carbon sequestration and urban heat island mitigation.`);
  if (improvements.length === 0) improvements.push(`Waste diversion programmes are showing early gains despite current environmental pressure.`);

  const concerns: string[] = [];
  if (aqiBad)      concerns.push(`AQI of ${city.aqi} places the city in the "${city.aqi < 200 ? "Unhealthy" : "Very Unhealthy"}" band — sensitive groups face measurable health risk.`);
  if (waterBad)    concerns.push(`Water quality index of ${city.water}% is below the 60% sustainability threshold; treatment capacity may need scaling.`);
  if (highCarbon)  concerns.push(`Carbon intensity at ${city.carbon} tCO₂ per capita exceeds the 7.0 t high-risk mark and requires targeted reduction.`);
  if (lowRenew)    concerns.push(`Renewable share of ${renewableShare}% is below the 35% grid target; fossil dependency is holding back the EcoScore.`);
  if (lowGreen)    concerns.push(`Green cover at ${greenCover}% is below the 30% urban canopy target, limiting natural air and heat buffering.`);
  if (city.alerts >= 8) concerns.push(`${city.alerts} active environmental alerts suggest elevated systemic risk across multiple domains.`);
  if (concerns.length === 0) concerns.push(`No critical concerns detected. Continued monitoring of PM2.5 and CO₂ levels is recommended.`);

  const actions: string[] = [];
  if (aqiBad || city.pm25 > 50) actions.push("Restrict heavy-vehicle corridors during peak hours (06:00–10:00) to reduce PM2.5 concentration.");
  if (lowGreen)    actions.push(`Accelerate urban forestry in under-served wards to raise green cover from ${greenCover}% toward the 30% canopy target.`);
  if (lowRenew)    actions.push("Expand solar rooftop incentive programme and fast-track grid-scale wind procurement to close the 35% renewable gap.");
  if (waterBad)    actions.push("Audit water treatment infrastructure and pilot decentralised grey-water reuse in high-density residential zones.");
  if (highCarbon)  actions.push(`Introduce sector-specific carbon budgets; prioritise decarbonisation of the ${city.carbon > 8 ? "transport and industrial" : "energy"} sector.`);
  actions.push("Publish a quarterly public sustainability scorecard to drive civic accountability and behavioural change.");
  if (city.humidity > 75 && city.aqi > 100) actions.push("Deploy misting stations in high-footfall zones during humid, high-AQI periods to reduce perceived heat stress.");

  return [
    { id: "health",       icon: HeartPulse,    title: "Current Environmental Health", color: "var(--color-primary)", body: health },
    { id: "improvements", icon: CheckCircle2,  title: "What's Going Well",    color: "var(--color-success)",     body: improvements.join(" ") },
    { id: "concerns",     icon: AlertTriangle, title: "Needs Attention",       color: "var(--color-warning)",     body: concerns.join(" ") },
    { id: "actions",      icon: Lightbulb,     title: "Recommended Actions",   color: "var(--color-info)",        body: actions.join("\n") },
  ];
}

// ─── typing animation ─────────────────────────────────────────────────────────

function TypingText({ text, active, delay = 0 }: { text: string; active: boolean; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const startId = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startId);
  }, [active, delay]);

  useEffect(() => {
    if (!started) return;
    indexRef.current = 0;
    setDisplayed("");
    // Type ~3 chars per tick at 18 ms → feels fast but not instant
    const id = setInterval(() => {
      indexRef.current = Math.min(text.length, indexRef.current + 3);
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [started, text]);

  if (!active) return null;
  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-0.5 h-3.5 bg-current ml-px animate-pulse align-middle" aria-hidden="true" />
      )}
    </span>
  );
}

// ─── insight chips ────────────────────────────────────────────────────────────

const CHIPS = [
  { icon: Leaf,     label: "Improve Green Cover",     section: "environmental-overview" },
  { icon: Recycle,  label: "Increase Recycling",       section: "environmental-overview" },
  { icon: Sun,      label: "Expand Solar Adoption",    section: "environmental-overview" },
  { icon: Droplets, label: "Reduce Water Consumption", section: "environmental-overview" },
];

function InsightChip({ icon: Icon, label, section }: { icon: typeof Leaf; label: string; section: string }) {
  const handleClick = () => {
    const el = document.getElementById(section);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      onClick={handleClick}
      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border
        bg-muted/30 hover:border-primary/50 hover:bg-primary/8 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${label} — scroll to KPIs`}
    >
      <Icon className="size-3.5 text-primary shrink-0" aria-hidden="true" />
      {label}
      <ChevronRight className="size-3 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
    </button>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────

export function AiExecutiveSummary({
  city, renewableShare, greenCover,
}: {
  city: City;
  renewableShare: number;
  greenCover: number;
}) {
  const sections = useMemo(
    () => buildSummary(city, renewableShare, greenCover),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city.id, city.eco, city.aqi, city.water, city.carbon, renewableShare, greenCover],
  );

  // Reveal sections one at a time after the panel mounts
  const [revealCount, setRevealCount] = useState(0);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Reset when city changes
    setRevealCount(0);
    setProcessing(true);
    const t0 = setTimeout(() => setProcessing(false), 700);
    return () => clearTimeout(t0);
  }, [city.id]);

  useEffect(() => {
    if (processing) return;
    if (revealCount >= sections.length) return;
    // Each section gets ~1.4 s to type before the next starts
    const id = setTimeout(() => setRevealCount((n) => n + 1), 1400);
    return () => clearTimeout(id);
  }, [processing, revealCount, sections.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="glass rounded-3xl p-6 relative overflow-hidden"
      aria-label="AI Executive Summary"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-xl grid place-items-center shrink-0 bg-primary/15">
          <motion.div
            animate={processing ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ repeat: processing ? Infinity : 0, duration: 0.9 }}
          >
            <Brain className="size-5 text-primary" aria-hidden="true" />
          </motion.div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">GreenGuard AI</div>
          <h2 className="text-base font-semibold tracking-tight flex items-center gap-1.5">
            Sustainability Brief
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          </h2>
        </div>
        <AnimatePresence>
          {processing && (
            <motion.div
              key="proc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground"
            >
              <span className="size-1.5 rounded-full bg-primary animate-pulse inline-block" />
              Analysing {city.name}…
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sections */}
      <div className="grid md:grid-cols-2 gap-5">
        {sections.map((s, idx) => {
          const isActive = !processing && idx < revealCount;
          return (
            <AnimatePresence key={s.id}>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors duration-200"
                  style={{ background: `color-mix(in oklab, ${s.color} 5%, var(--color-card))` }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div
                      className="size-6 rounded-md grid place-items-center shrink-0"
                      style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}
                    >
                      <s.icon className="size-3.5" aria-hidden="true" />
                    </div>
                    <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: s.color }}>
                      {s.title}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    <TypingText text={s.body} active={isActive} delay={50} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>

      {/* Insight chips */}
      <AnimatePresence>
        {revealCount >= sections.length && !processing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="mt-6 pt-5 flex flex-wrap gap-2"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground self-center mr-1">Quick actions</span>
            {CHIPS.map((c) => <InsightChip key={c.label} {...c} />)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
