import { useState } from "react";
import {
  CalendarDays,
  ArrowRightLeft,
  Compass,
  HelpCircle,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { GreenActionsSectionHeading } from "./section-heading";
import { TodaysEnvironmentalFocus } from "./today-focus";
import { DoThisInstead } from "./do-this-instead";
import { EnvironmentalAreas } from "./environmental-areas";
import { WhyThisMatters } from "./why-this-matters";
import { EverydayActions } from "./everyday-actions";
import { GreenGuardTipsToday } from "./tips-today";
import {
  bandToneFromLabel,
  resolveFocusTopic,
  defaultCategoryForTopic,
  whyThisMattersContextNote,
  type EnvCategoryId,
} from "./green-actions-data";

/**
 * GreenActionsPage — Phase 1 content model, Phase 1.1 visual refinement,
 * Phase 2 contextual intelligence, Phase 3 personalization + habit layer.
 *
 * A citizen environmental prevention and awareness page — practical
 * guidance on what to do, what to avoid, and what the better alternative
 * is. Not a complaints module, not a map, not a dashboard, not an AI
 * chatbot: see the Green Actions PRD for the full boundary.
 *
 * ─── Phase 2 architecture (kept in Phase 3) ────────────────────────────
 * This page is the ONLY place in the module that calls useCity(). AQI
 * banding + tone + the "what's most relevant right now" topic (see
 * resolveFocusTopic in green-actions-data.ts) are all resolved once, here,
 * and passed down as plain props — avoiding the duplicate reads the
 * Phase 2 PRD explicitly asked to avoid, and giving the whole page one
 * auditable source of truth for its contextual behavior.
 *
 * `topic` only ever reflects two real, already-available per-city
 * readings — AQI and Water Quality Index — never a fabricated signal (see
 * the comment on resolveFocusTopic for why rainfall isn't one of them).
 * Section 3's default category follows `topic` once, on mount; manual
 * category selection after that is never overridden by it.
 *
 * ─── Phase 3 additions ──────────────────────────────────────────────────
 * No new top-level sections and no new persistence: Phase 3's "most
 * relevant for you" callout lives inside Section 1 (see today-focus.tsx),
 * its "I am..." situation shortcuts and "recommended" tab indicator live
 * inside Section 3 (see environmental-areas.tsx, driven by
 * `highlightedCategory` below), and its single rotating "habit to build"
 * lives inside Section 5 (see everyday-actions.tsx). All three reuse
 * state and content that already exist in this module.
 */
export function GreenActionsPage() {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);
  const tone = bandToneFromLabel(band.label);
  const topic = resolveFocusTopic(tone, city.water);

  const [selectedCategory, setSelectedCategory] = useState<EnvCategoryId>(() =>
    defaultCategoryForTopic(topic),
  );

  // The category today's conditions actually flagged, if any — used both
  // to badge Section 3's matching tab and to gate Section 4's context note
  // so it never references a category the citizen isn't currently viewing.
  const highlightedCategory = topic !== "general" ? defaultCategoryForTopic(topic) : undefined;
  const whyContextNote =
    selectedCategory === highlightedCategory ? whyThisMattersContextNote(topic) : undefined;

  return (
    <div className="px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 space-y-12 md:space-y-14 w-full">
      {/* ── Page identity ── */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Green Actions</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Small everyday choices can help prevent unnecessary pollution and environmental impact.
        </p>
      </header>

      {/* ═══ SECTION 1 — TODAY'S ENVIRONMENTAL FOCUS ══════════════════════ */}
      <section aria-labelledby="todays-focus-heading">
        <GreenActionsSectionHeading
          headingId="todays-focus-heading"
          icon={CalendarDays}
          title="Today's Environmental Focus"
          description="What's most relevant right now, based on current conditions."
        />
        <TodaysEnvironmentalFocus city={city} band={band} tone={tone} topic={topic} />
      </section>

      {/* ═══ SECTION 2 — DO THIS INSTEAD ══════════════════════════════════ */}
      <section aria-labelledby="do-this-instead-heading">
        <GreenActionsSectionHeading
          headingId="do-this-instead-heading"
          icon={ArrowRightLeft}
          title="Do This Instead"
          description="Common habits to avoid, and the practical alternative."
          accent="var(--color-info)"
        />
        <DoThisInstead topic={topic} />
      </section>

      {/* ═══ SECTION 3 — ENVIRONMENTAL AREAS ══════════════════════════════ */}
      <section aria-labelledby="environmental-areas-heading">
        <GreenActionsSectionHeading
          headingId="environmental-areas-heading"
          icon={Compass}
          title="Environmental Areas"
          description="Pick an area for focused do's, don'ts, and better choices."
        />
        <EnvironmentalAreas
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          highlightedCategory={highlightedCategory}
        />
      </section>

      {/* ═══ SECTION 4 — WHY THIS MATTERS ═════════════════════════════════ */}
      <section aria-labelledby="why-this-matters-heading">
        <GreenActionsSectionHeading
          headingId="why-this-matters-heading"
          icon={HelpCircle}
          title="Why This Matters"
          description="The reasoning behind the recommendations for this area."
          accent="var(--color-info)"
        />
        <WhyThisMatters category={selectedCategory} contextNote={whyContextNote} />
      </section>

      {/* ═══ SECTION 5 — EVERYDAY ACTIONS ═════════════════════════════════ */}
      <section aria-labelledby="everyday-actions-heading">
        <GreenActionsSectionHeading
          headingId="everyday-actions-heading"
          icon={ListChecks}
          title="Everyday Actions"
          description="Practical guidance for real, everyday situations."
        />
        <EverydayActions />
      </section>

      {/* ═══ SECTION 6 — GREENGUARD TIPS TODAY ════════════════════════════ */}
      <section aria-labelledby="tips-today-heading">
        <GreenActionsSectionHeading
          headingId="tips-today-heading"
          icon={Sparkles}
          title="GreenGuard Tips Today"
          accent="var(--color-primary)"
        />
        <GreenGuardTipsToday topic={topic} tone={tone} />
      </section>

      <div className="h-8" aria-hidden="true" />
    </div>
  );
}
