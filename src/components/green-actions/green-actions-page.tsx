import { useState } from "react";
import {
  CalendarDays,
  ArrowRightLeft,
  Compass,
  HelpCircle,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { GreenActionsSectionHeading } from "./section-heading";
import { TodaysEnvironmentalFocus } from "./today-focus";
import { DoThisInstead } from "./do-this-instead";
import { EnvironmentalAreas } from "./environmental-areas";
import { WhyThisMatters } from "./why-this-matters";
import { EverydayActions } from "./everyday-actions";
import { GreenGuardTipsToday } from "./tips-today";
import type { EnvCategoryId } from "./green-actions-data";

/**
 * GreenActionsPage — Phase 1.1: UI/UX Refinement & Real-World Presentation.
 *
 * A citizen environmental prevention and awareness page — practical
 * guidance on what to do, what to avoid, and what the better alternative
 * is. Not a complaints module, not a map, not a dashboard, not an AI
 * chatbot: see the Green Actions PRD for the full boundary.
 *
 * Phase 1.1 keeps the exact six-section content model from Phase 1 and
 * refines presentation only: less card-repetition, more breathing room,
 * a lighter section heading scoped to this page (see ./section-heading),
 * and stronger visual hierarchy inside each section.
 *
 * Section 3 (Environmental Areas) and Section 4 (Why This Matters) share
 * the selected category so switching categories updates both at once.
 */
export function GreenActionsPage() {
  const [selectedCategory, setSelectedCategory] = useState<EnvCategoryId>("air");

  return (
    <div className="px-4 md:px-8 py-6 sm:py-8 space-y-12 md:space-y-14 max-w-[1400px] mx-auto w-full">
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
        <TodaysEnvironmentalFocus />
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
        <DoThisInstead />
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
        <WhyThisMatters category={selectedCategory} />
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
        <GreenGuardTipsToday />
      </section>

      <div className="h-8" aria-hidden="true" />
    </div>
  );
}
