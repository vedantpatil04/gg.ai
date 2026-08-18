/**
 * green-actions-data.ts — Green Actions, Phase 1 + Phase 2
 *
 * Curated, static environmental-prevention content for the Green Actions
 * page. Mirrors the pattern already used for curated content elsewhere in
 * the app (e.g. INSIGHTS / RECOMMENDATIONS in lib/mock-data.ts) — plain
 * hardcoded data, no fabricated live statistics, no invented impact
 * numbers. Where a value genuinely comes from live data (AQI, Water
 * Quality Index), it is read from the existing city context in
 * green-actions-page.tsx — once, at the top of the page — and passed down
 * as props, never re-fetched or recomputed per-section.
 *
 * Phase 2 adds a small "what's most relevant right now" layer
 * (FocusTopic / resolveFocusTopic below) on top of this same curated
 * content — it only ever *selects and orders* existing approved guidance
 * based on two already-available real readings (AQI and Water Quality
 * Index). It never generates new copy and never invents a data point that
 * isn't already on the City record — see the comment on resolveFocusTopic
 * for why rainfall/precipitation is deliberately not one of the signals.
 *
 * This file intentionally contains no components and no data fetching —
 * it is pure content + pure selection logic so the six Green Actions
 * sections can stay small and focused on presentation.
 */

import type { LucideIcon } from "lucide-react";
import { Wind, Recycle, Droplets, Zap, Car, Trees, Home, Waves } from "lucide-react";
import type { Tone } from "@/components/map/intelligence-ui";

// ─── Phase 2 — contextual signal ──────────────────────────────────────────────
//
// The single source of truth for "what's most relevant right now" across
// all six sections. Built from two real, already-available per-city
// readings — nothing here is fetched, computed, or invented specifically
// for Green Actions.

export type FocusTopic = "air" | "water" | "general";

/** Water Quality Index threshold below which water-related guidance takes
 *  priority over the general everyday baseline. Set well below the
 *  Sustainability page's 75% target (routes/sustainability.tsx) so this
 *  only fires for cities genuinely in need of attention — air quality
 *  already owns the more common "below target" case via its own tone
 *  scale below. */
const WATER_ATTENTION_THRESHOLD = 60;

/**
 * Resolves which real-data signal is most relevant right now.
 *
 * Air quality takes priority whenever its tone needs care, matching the
 * Phase 2 PRD's leading example ("if AQI is elevated, prioritize air
 * guidance"). Water Quality Index (city.water) is the fallback signal,
 * since it's the next most reliable per-city reading already surfaced
 * elsewhere in the app (Sustainability, Dashboard).
 *
 * Rainfall/precipitation is deliberately NOT a signal here: no such field
 * is reliably populated anywhere in the existing City or forecast data
 * (DailyForecast.precipitationChance is optional and only appears behind
 * the Forecast page's own range-specific queries). Using it would mean
 * fabricating a value that isn't really there, which Phase 2 explicitly
 * rules out — so Green Actions sticks to the two signals it can actually
 * back up.
 */
export function resolveFocusTopic(tone: Tone, waterScore: number): FocusTopic {
  if (tone === "warning" || tone === "critical") return "air";
  if (waterScore < WATER_ATTENTION_THRESHOLD) return "water";
  return "general";
}

/** Intelligent default for Section 3's category selector — applied once,
 *  from whatever conditions are active when the page mounts. Manual
 *  category selection afterward is never overridden by this. */
export function defaultCategoryForTopic(topic: FocusTopic): EnvCategoryId {
  return topic === "water" ? "water" : "air";
}

/** Short, factual framing shown above Section 4 when the category the
 *  citizen is currently viewing is the one today's conditions flagged as
 *  relevant — omitted entirely otherwise, which is the "no strong
 *  condition exists" fallback the PRD asks for. */
export function whyThisMattersContextNote(topic: FocusTopic): string | undefined {
  if (topic === "air") return "Especially relevant with today's air quality.";
  if (topic === "water") return "Especially relevant given today's water quality reading.";
  return undefined;
}

/** Same idea as whyThisMattersContextNote, for Section 6. */
export function tipsTodayContextNote(topic: FocusTopic): string | undefined {
  if (topic === "air") return "Chosen for today's air quality.";
  if (topic === "water") return "Chosen for today's water quality reading.";
  return undefined;
}

// ─── Environmental Areas (Section 3) ──────────────────────────────────────────

export type EnvCategoryId = "air" | "waste" | "water" | "energy" | "transport" | "greenery";

export interface WhyItMatters {
  question: string;
  answer: string;
}

export interface EnvCategory {
  id: EnvCategoryId;
  label: string;
  emoji: string;
  icon: LucideIcon;
  /** One-line framing shown under the category title in Section 3, e.g.
   *  "Keep additional pollution to a minimum." Presentation-only context
   *  for content that already exists below it — not a new data point. */
  summary: string;
  doItems: string[];
  dontItems: string[];
  betterChoice: string[];
  whyItMatters: WhyItMatters[];
}

export const ENV_CATEGORIES: EnvCategory[] = [
  {
    id: "air",
    label: "Air Quality",
    emoji: "🌫️",
    icon: Wind,
    summary: "Keep additional pollution to a minimum.",
    doItems: [
      "Reduce unnecessary vehicle trips",
      "Maintain vehicles properly",
      "Avoid unnecessary dust generation",
      "Keep indoor spaces ventilated on good-AQI days",
    ],
    dontItems: [
      "Burn household waste",
      "Burn plastic or leaves",
      "Leave vehicles idling unnecessarily",
      "Take high-traffic routes when a quieter option is available",
    ],
    betterChoice: [
      "Use cleaner, practical transport alternatives where available",
      "Hand over dry waste for recycling instead of burning it",
    ],
    whyItMatters: [
      {
        question: "Why avoid open waste burning?",
        answer:
          "Open waste burning releases particulate matter and other pollutants directly into the air. Avoiding unnecessary burning helps prevent additional pollution.",
      },
      {
        question: "Why does vehicle idling matter?",
        answer:
          "An idling engine burns fuel without moving, adding avoidable exhaust to the air around you and nearby pedestrians.",
      },
    ],
  },
  {
    id: "waste",
    label: "Waste",
    emoji: "♻️",
    icon: Recycle,
    summary: "Handle what you discard the right way.",
    doItems: [
      "Separate waste into wet, dry, and hazardous categories",
      "Store waste in covered bins",
      "Hand over waste only to authorized collection services",
      "Compost suitable kitchen and garden waste at home",
    ],
    dontItems: [
      "Mix wet and dry waste",
      "Burn household or garden waste",
      "Dump waste in open spaces, drains, or water bodies",
      "Discard batteries, chemicals, or e-waste with regular trash",
    ],
    betterChoice: [
      "Use the appropriate municipal disposal route for each waste type",
      "Reuse containers and materials where practical before discarding them",
    ],
    whyItMatters: [
      {
        question: "Why separate wet and dry waste?",
        answer:
          "Mixed waste is harder to recycle or compost safely, and more often ends up burned or dumped instead of processed properly.",
      },
      {
        question: "Why not dump waste in drains?",
        answer:
          "Waste in drains blocks water flow and can contribute to local flooding and contamination of nearby water sources.",
      },
    ],
  },
  {
    id: "water",
    label: "Water",
    emoji: "💧",
    icon: Droplets,
    summary: "Use only what you need, and keep it clean.",
    doItems: [
      "Fix leaking taps and pipes promptly",
      "Use only the water you need for daily tasks",
      "Collect and reuse water where practical, such as for plants",
      "Report visible water pollution or contamination",
    ],
    dontItems: [
      "Waste water unnecessarily",
      "Pour chemicals, oil, or paint down the drain",
      "Let taps run while not actively using them",
      "Let waste contaminate open drains or water bodies",
    ],
    betterChoice: [
      "Turn taps off between uses instead of letting them run",
      "Store household chemicals for disposal at a designated collection point",
    ],
    whyItMatters: [
      {
        question: "Why avoid pouring chemicals down the drain?",
        answer:
          "Household chemicals can contaminate local water systems and are often not removed by standard treatment processes.",
      },
      {
        question: "Why do small leaks matter?",
        answer:
          "A small ongoing leak adds up to significant water loss over time, and left unresolved it usually gets worse.",
      },
    ],
  },
  {
    id: "energy",
    label: "Energy",
    emoji: "⚡",
    icon: Zap,
    summary: "Use what you need, switch off the rest.",
    doItems: [
      "Switch off lights, fans, and appliances when not in use",
      "Use natural light and ventilation where possible",
      "Maintain appliances so they keep running efficiently",
      "Unplug chargers and devices once they're fully charged",
    ],
    dontItems: [
      "Leave appliances running unnecessarily",
      "Ignore appliances that are visibly inefficient or damaged",
      "Run heavy appliances at peak-demand hours without real need",
    ],
    betterChoice: [
      "Use energy-efficient appliances and lighting where available",
      "Shift flexible tasks like laundry to off-peak hours",
    ],
    whyItMatters: [
      {
        question: "Why does switching off unused appliances matter?",
        answer:
          "Devices left running consume energy without benefit, adding avoidable demand on the local power supply.",
      },
      {
        question: "Why shift usage to off-peak hours?",
        answer:
          "Spreading out demand reduces strain on the grid at the times it's under the most pressure.",
      },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    emoji: "🚗",
    icon: Car,
    summary: "Choose the lower-impact way to get there.",
    doItems: [
      "Combine errands into fewer trips",
      "Maintain your vehicle properly, including regular servicing",
      "Consider walking, cycling, or public transport for short distances",
      "Carpool where practical",
    ],
    dontItems: [
      "Take a private vehicle for very short, walkable trips",
      "Leave the engine idling at long stops",
      "Ignore visible exhaust or maintenance issues",
      "Overload vehicles beyond their intended capacity",
    ],
    betterChoice: [
      "Walk, cycle, or use public transport for short distances",
      "Switch off the engine during extended stops instead of idling",
    ],
    whyItMatters: [
      {
        question: "Why does vehicle idling matter?",
        answer:
          "An idling engine burns fuel and releases exhaust without covering any distance, adding pollution for no benefit.",
      },
      {
        question: "Why does vehicle maintenance matter?",
        answer:
          "A poorly maintained vehicle burns fuel less efficiently and can emit more pollutants than one kept in good condition.",
      },
    ],
  },
  {
    id: "greenery",
    label: "Greenery",
    emoji: "🌳",
    icon: Trees,
    summary: "Protect what's growing, and add to it.",
    doItems: [
      "Care for existing trees and green spaces near you",
      "Plant and maintain native species where space allows",
      "Support local tree-planting or green-space initiatives",
      "Water young plants during dry periods",
    ],
    dontItems: [
      "Damage or remove healthy trees without genuine need",
      "Litter in parks or green spaces",
      "Pave over green cover unnecessarily",
      "Neglect young plantings once they're in the ground",
    ],
    betterChoice: [
      "Choose native, low-maintenance species suited to the local climate",
      "Support community greening efforts alongside individual planting",
    ],
    whyItMatters: [
      {
        question: "Why does existing tree cover matter?",
        answer:
          "Mature trees offer shade and support local air quality, and take years to replace once lost.",
      },
      {
        question: "Why choose native species?",
        answer:
          "Native plants are typically better suited to local rainfall and soil, needing less water and upkeep to thrive.",
      },
    ],
  },
];

export function getEnvCategory(id: EnvCategoryId): EnvCategory {
  return ENV_CATEGORIES.find((c) => c.id === id) ?? ENV_CATEGORIES[0];
}

/**
 * Phase 3 — "Common Situations" (Section 3's "I am..." quick-select).
 *
 * A friendlier, real-life-phrased entry point into the SAME six
 * EnvCategory guidance sheets — not a new content subsystem. Selecting a
 * situation just sets Section 3's existing selected-category state, so the
 * Do / Don't / Better Choice guidance shown is the identical, already-
 * curated content the matching topic tab already shows. "Air Quality"
 * isn't offered as a situation since it's already the category the page
 * highlights automatically when AQI needs attention (see
 * defaultCategoryForTopic above).
 */
export interface Situation {
  id: string;
  label: string;
  emoji: string;
  category: EnvCategoryId;
}

export const COMMON_SITUATIONS: Situation[] = [
  { id: "home", label: "At Home", emoji: "🏠", category: "energy" },
  { id: "travel", label: "Travelling", emoji: "🚗", category: "transport" },
  { id: "waste", label: "Handling Waste", emoji: "♻️", category: "waste" },
  { id: "water", label: "Using Water", emoji: "💧", category: "water" },
  { id: "greenery", label: "Caring for Greenery", emoji: "🌳", category: "greenery" },
];

// ─── Do This Instead (Section 2) ──────────────────────────────────────────────

export interface AvoidBetterPair {
  id: string;
  avoid: string;
  better: string;
  /** Which contextual signal (see FocusTopic below) this pair is most
   *  useful for. Used only to reorder — never to hide — pairs in
   *  DoThisInstead, so the most relevant behaviors surface first when
   *  today's conditions call for it. "general" pairs aren't tied to a
   *  specific condition and stay in their curated position. */
  topic: FocusTopic;
}

export const DO_THIS_INSTEAD: AvoidBetterPair[] = [
  {
    id: "burn-waste",
    avoid: "Burn household waste",
    better: "Use the appropriate disposal route",
    topic: "air",
  },
  {
    id: "idling",
    avoid: "Leave the engine idling at a long stop",
    better: "Switch off the engine during extended stops",
    topic: "air",
  },
  {
    id: "mix-waste",
    avoid: "Mix wet and dry waste",
    better: "Separate waste at the source",
    topic: "general",
  },
  {
    id: "running-tap",
    avoid: "Let a tap run while not using it",
    better: "Use only the water you need",
    topic: "water",
  },
  {
    id: "chemicals-drain",
    avoid: "Pour chemicals or used oil down the drain",
    better: "Store them for proper disposal at a collection point",
    topic: "water",
  },
  {
    id: "short-trip",
    avoid: "Take a private vehicle for a short trip",
    better: "Walk, cycle, or use public transport where practical",
    topic: "air",
  },
];

// ─── Everyday Actions (Section 5) ─────────────────────────────────────────────

export interface EverydayGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: string[];
}

export const EVERYDAY_ACTIONS: EverydayGroup[] = [
  {
    id: "home",
    title: "At Home",
    icon: Home,
    items: [
      "Segregate waste into wet, dry, and hazardous bins",
      "Conserve water — fix leaks and avoid unnecessary use",
      "Use energy responsibly — switch off what you're not using",
      "Avoid unnecessary burning of household or garden waste",
    ],
  },
  {
    id: "road",
    title: "On the Road",
    icon: Car,
    items: [
      "Avoid unnecessary engine idling",
      "Combine trips where practical",
      "Consider public transport, walking, or cycling where appropriate",
      "Maintain your vehicle properly",
    ],
  },
  {
    id: "waste",
    title: "With Waste",
    icon: Recycle,
    items: [
      "Separate waste at the source",
      "Reuse items where practical before discarding them",
      "Compost suitable organic waste",
      "Dispose of waste through the appropriate route",
    ],
  },
  {
    id: "water",
    title: "With Water",
    icon: Waves,
    items: [
      "Avoid unnecessary water wastage",
      "Address leaks as soon as you notice them",
      "Avoid contaminating drains or water bodies",
    ],
  },
];

/**
 * Phase 3 — "Habit to build" (Section 5 gets a small featured habit).
 *
 * One deterministic, rotating habit shown above the Everyday Actions grid
 * — education, not gamification: no streaks, no counters, no saved
 * progress. Reuses the same TipItem shape already used for GreenGuard Tips
 * Today rather than introducing a new content type. Rotation is a pure
 * function of the calendar date, so it needs no new persistence layer.
 */
export const HABITS_TO_BUILD: TipItem[] = [
  {
    emoji: "🚗",
    title: "Switch off unnecessary vehicle idling",
    detail: "A simple habit that avoids unnecessary emissions during extended waits.",
  },
  {
    emoji: "♻️",
    title: "Separate waste as it's created",
    detail: "Sort wet and dry waste in the moment instead of all at once later.",
  },
  {
    emoji: "💧",
    title: "Do a monthly leak check",
    detail: "A few minutes checking taps and pipes can catch small leaks before they grow.",
  },
  {
    emoji: "💡",
    title: "Unplug chargers once they're done",
    detail: "Idle chargers still draw a small amount of power when left plugged in.",
  },
  {
    emoji: "🌳",
    title: "Water plants in the cooler hours",
    detail: "Watering in the early morning or evening reduces water lost to evaporation.",
  },
];

/** Picks one habit per calendar day — deterministic, no randomness, no AI,
 *  nothing stored. Same habit for everyone on a given day, changes the
 *  next; not personalized to the individual citizen, which keeps this
 *  honest rather than implying tracking that doesn't exist. */
export function getHabitOfTheDay(date: Date = new Date()): TipItem {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86_400_000);
  return HABITS_TO_BUILD[dayOfYear % HABITS_TO_BUILD.length];
}

// ─── Today's Environmental Focus + GreenGuard Tips (Sections 1 & 6) ──────────
//
// Both sections read the city's live/fallback AQI and Water Quality Index
// (passed down from green-actions-page.tsx, which is the only place that
// calls useCity()) and key off the same tone scale already used across
// Sustainability and the Smart Map, so "dynamic where data supports it"
// never means inventing a new metric — it means presenting the reliable,
// already-available readings with tone/topic-appropriate curated guidance
// layered on top.

/** Mirrors the AQI-band → tone mapping already used in routes/sustainability.tsx,
 *  kept local here since the mapping itself isn't exported from mock-data.ts. */
export function bandToneFromLabel(label: string): Tone {
  if (label === "Good") return "good";
  if (label === "Moderate" || label === "Unhealthy (SG)") return "warning";
  return "critical";
}

export interface FocusContent {
  headline: string;
  explanation: string;
  actions: string[];
}

export const AIR_FOCUS_BY_TONE: Record<Tone, FocusContent> = {
  good: {
    headline: "Air quality is good today",
    explanation:
      "Conditions are favorable. Keep up the everyday habits that help keep it that way.",
    actions: [
      "Keep vehicles well maintained",
      "Avoid unnecessary open burning",
      "Continue separating waste at the source",
    ],
  },
  warning: {
    headline: "Air quality needs some care today",
    explanation:
      "Conditions are moderate. Avoid adding unnecessary particulate pollution where you can.",
    actions: [
      "Avoid open waste burning",
      "Reduce unnecessary vehicle trips",
      "Avoid unnecessary vehicle idling",
    ],
  },
  critical: {
    headline: "Air quality needs attention today",
    explanation:
      "Air quality is currently elevated. Avoid actions that add unnecessary particulate pollution.",
    actions: [
      "Avoid open waste burning",
      "Reduce unnecessary vehicle trips",
      "Avoid unnecessary vehicle idling",
    ],
  },
  info: {
    headline: "Air quality update",
    explanation: "Here's today's guidance based on current conditions.",
    actions: [
      "Avoid open waste burning",
      "Reduce unnecessary vehicle trips",
      "Avoid unnecessary vehicle idling",
    ],
  },
  neutral: {
    headline: "Everyday air-quality guidance",
    explanation:
      "No live reading is available right now — here's general guidance that always applies.",
    actions: [
      "Avoid open waste burning",
      "Reduce unnecessary vehicle trips",
      "Avoid unnecessary vehicle idling",
    ],
  },
};

/** Shown instead of the air-quality content when resolveFocusTopic() finds
 *  the Water Quality Index is the more relevant signal today. Same
 *  approved-guidance actions already curated elsewhere in this file (see
 *  the "water" EnvCategory and the water-tagged DO_THIS_INSTEAD pairs) —
 *  restated here as a focus panel rather than new content. */
export const WATER_FOCUS: FocusContent = {
  headline: "Water quality needs attention today",
  explanation:
    "Today's water quality reading is below the healthy target. Avoid adding unnecessary waste or chemicals to local water sources.",
  actions: [
    "Avoid pouring chemicals or oil down the drain",
    "Keep waste away from drains and water bodies",
    "Turn taps off between uses instead of letting them run",
  ],
};

/** Section 1's single entry point: picks air-quality or water-quality
 *  guidance depending on which signal resolveFocusTopic() found relevant,
 *  falling back to the plain AQI-tone content (including the "good"
 *  everyday case) otherwise. */
export function getTodaysFocusContent(topic: FocusTopic, tone: Tone): FocusContent {
  return topic === "water" ? WATER_FOCUS : AIR_FOCUS_BY_TONE[tone];
}

export interface TipItem {
  emoji: string;
  title: string;
  detail: string;
}

/** Evergreen curated tips shown alongside (or instead of) the topic-specific
 *  guidance, so the section always has something useful even without a
 *  live reading. Same underlying guidance as Sections 1–3, restated as a
 *  short title + one-line detail rather than a plain numbered sentence. */
export const EVERGREEN_TIP_ITEMS: TipItem[] = [
  {
    emoji: "♻️",
    title: "Separate waste at source",
    detail: "Keep wet and dry waste separated before disposal.",
  },
  {
    emoji: "💧",
    title: "Fix leaks early",
    detail: "Address dripping taps and visible leaks as soon as you notice them.",
  },
  {
    emoji: "🔥",
    title: "Avoid waste burning",
    detail: "Don't burn leaves, plastics, or household waste.",
  },
  {
    emoji: "🚗",
    title: "Combine your trips",
    detail: "Group errands into one outing instead of several short trips.",
  },
  {
    emoji: "💡",
    title: "Switch off when not in use",
    detail: "Turn off lights, fans, and appliances before leaving a room.",
  },
];

/** Lead tip shown first when today's air quality needs some care — same
 *  tone scale and same underlying guidance as Section 1, just framed as a
 *  title + detail to match the rest of this section. */
export const AIR_TIP_BY_TONE: Partial<Record<Tone, TipItem>> = {
  warning: {
    emoji: "🌫️",
    title: "Ease off vehicle trips today",
    detail: "Air quality is moderate — reduce unnecessary trips and avoid idling where you can.",
  },
  critical: {
    emoji: "🌫️",
    title: "Avoid extra pollution today",
    detail: "Air quality needs attention — avoid open burning and unnecessary vehicle trips.",
  },
};

/** Lead tips shown first when today's Water Quality Index is the more
 *  relevant signal — same approved guidance as WATER_FOCUS above, restated
 *  as two short tips. */
export const WATER_TIP_ITEMS: TipItem[] = [
  {
    emoji: "💧",
    title: "Keep drains clear of waste",
    detail: "Avoid letting loose waste or debris wash into drains and water bodies.",
  },
  {
    emoji: "🧴",
    title: "Store chemicals for proper disposal",
    detail:
      "Don't pour chemicals, oil, or paint down the drain — save them for a collection point.",
  },
];

/** Returns 3–5 tips for "GreenGuard Tips Today": leads with whichever
 *  topic-specific tip(s) match today's conditions, then fills the rest
 *  from the evergreen curated pool — never inventing a new dynamic value.
 *  Falls back to the evergreen pool alone when neither signal is elevated. */
export function getTipsToday(topic: FocusTopic, tone: Tone): TipItem[] {
  const lead: TipItem[] =
    topic === "air"
      ? [AIR_TIP_BY_TONE[tone]].filter((tip): tip is TipItem => Boolean(tip))
      : topic === "water"
        ? WATER_TIP_ITEMS
        : [];
  const fill = EVERGREEN_TIP_ITEMS.filter((tip) => !lead.some((l) => l.title === tip.title));
  return [...lead, ...fill].slice(0, 5);
}
