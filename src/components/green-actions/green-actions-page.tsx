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
 * Phase 2 contextual intelligence + full-width web layout.
 *
 * A citizen environmental prevention and awareness page — practical
 * guidance on what to do, what to avoid, and what the better alternative
 * is. Not a complaints module, not a map, not a dashboard, not an AI
 * chatbot: see the Green Actions PRD for the full boundary.
 *
 * ─── Phase 2 architecture ──────────────────────────────────────────────
 * This page is the ONLY place in the module that calls useCity(). AQI
 * banding + tone + the "what's most relevant right now" topic (see
 * resolveFocusTopic in green-actions-data.ts) are all resolved once, here,
 * and passed down as plain props — Sections 1, 2, and 6 used to each call
 * useCity() independently in Phase 1.1; consolidating that avoids the
 * duplicate reads the Phase 2 PRD explicitly asks to avoid, and gives the
 * whole page one auditable source of truth for its contextual behavior.
 *
 * `topic` only ever reflects two real, already-available per-city
 * readings — AQI and Water Quality Index — never a fabricated signal (see
 * the comment on resolveFocusTopic for why rainfall isn't one of them).
 * Section 3's default category follows `topic` once, on mount; manual
 * category selection after that is never overridden by it.
 */
export function GreenActionsPage() {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);
  const tone = bandToneFromLabel(band.label);
  const topic = resolveFocusTopic(tone, city.water);

  const [selectedCategory, setSelectedCategory] = useState<EnvCategoryId>(() =>
    defaultCategoryForTopic(topic),
  );

  // Section 4 only gets a context note when the category currently in view
  // is the one today's conditions actually flagged — otherwise it would be
  // showing a note that doesn't match what's on screen.
  const whyContextNote =
    selectedCategory === defaultCategoryForTopic(topic)
      ? whyThisMattersContextNote(topic)
      : undefined;

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
        <EnvironmentalAreas selected={selectedCategory} onSelect={setSelectedCategory} />
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
