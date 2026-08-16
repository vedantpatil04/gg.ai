/**
 * green-actions-data.ts — Green Actions, Phase 1
 *
 * Curated, static environmental-prevention content for the Green Actions
 * page. Mirrors the pattern already used for curated content elsewhere in
 * the app (e.g. INSIGHTS / RECOMMENDATIONS in lib/mock-data.ts) — plain
 * hardcoded data, no fabricated live statistics, no invented impact
 * numbers. Where a value genuinely comes from live data (AQI), it is read
 * from the existing city context in the components that use this file,
 * never stored here.
 *
 * This file intentionally contains no components and no data fetching —
 * it is pure content so the six Green Actions sections can stay small and
 * focused on presentation.
 */

import type { LucideIcon } from "lucide-react";
import { Wind, Recycle, Droplets, Zap, Car, Trees, Home, Waves } from "lucide-react";
import type { Tone } from "@/components/map/intelligence-ui";

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
        answer: "Spreading out demand reduces strain on the grid at the times it's under the most pressure.",
      },
    ],
  },
  {
    id: "transport",
    label: "Transport",
    emoji: "🚗",
    icon: Car,
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
        answer: "Mature trees offer shade and support local air quality, and take years to replace once lost.",
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

// ─── Do This Instead (Section 2) ──────────────────────────────────────────────

export interface AvoidBetterPair {
  id: string;
  avoid: string;
  better: string;
}

export const DO_THIS_INSTEAD: AvoidBetterPair[] = [
  { id: "burn-waste", avoid: "Burn household waste", better: "Use the appropriate disposal route" },
  {
    id: "idling",
    avoid: "Leave the engine idling at a long stop",
    better: "Switch off the engine during extended stops",
  },
  { id: "mix-waste", avoid: "Mix wet and dry waste", better: "Separate waste at the source" },
  { id: "running-tap", avoid: "Let a tap run while not using it", better: "Use only the water you need" },
  {
    id: "chemicals-drain",
    avoid: "Pour chemicals or used oil down the drain",
    better: "Store them for proper disposal at a collection point",
  },
  {
    id: "short-trip",
    avoid: "Take a private vehicle for a short trip",
    better: "Walk, cycle, or use public transport where practical",
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

// ─── Today's Environmental Focus + GreenGuard Tips (Sections 1 & 6) ──────────
//
// Both sections read the city's live/fallback AQI (via useCity() +
// findAqiBand() in the components that use this data) and key off the same
// three-tone scale already used across Sustainability and the Smart Map, so
// "dynamic where data supports it" never means inventing a new metric —
// it means presenting the one reliable, already-available reading (AQI)
// with tone-appropriate curated guidance layered on top.

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
    explanation: "Conditions are favorable. Keep up the everyday habits that help keep it that way.",
    actions: [
      "Keep vehicles well maintained",
      "Avoid unnecessary open burning",
      "Continue separating waste at the source",
    ],
  },
  warning: {
    headline: "Air quality needs some care today",
    explanation: "Conditions are moderate. Avoid adding unnecessary particulate pollution where you can.",
    actions: ["Avoid open waste burning", "Reduce unnecessary vehicle trips", "Avoid unnecessary vehicle idling"],
  },
  critical: {
    headline: "Air quality needs attention today",
    explanation: "Air quality is currently elevated. Avoid actions that add unnecessary particulate pollution.",
    actions: ["Avoid open waste burning", "Reduce unnecessary vehicle trips", "Avoid unnecessary vehicle idling"],
  },
  info: {
    headline: "Air quality update",
    explanation: "Here's today's guidance based on current conditions.",
    actions: ["Avoid open waste burning", "Reduce unnecessary vehicle trips", "Avoid unnecessary vehicle idling"],
  },
  neutral: {
    headline: "Everyday air-quality guidance",
    explanation: "No live reading is available right now — here's general guidance that always applies.",
    actions: ["Avoid open waste burning", "Reduce unnecessary vehicle trips", "Avoid unnecessary vehicle idling"],
  },
};

/** Evergreen curated tips shown alongside (or instead of) the AQI-specific
 *  guidance, so the section always has something useful even without a
 *  live reading. */
export const EVERGREEN_TIPS: string[] = [
  "Separate wet and dry waste before disposal.",
  "Fix dripping taps as soon as you notice them.",
  "Combine errands into one trip when you can.",
  "Avoid burning leaves, plastic, or household waste.",
  "Switch off lights and fans when you leave a room.",
];

/** Returns 3–5 tips for "GreenGuard Tips Today": leads with the AQI-specific
 *  action set when air quality needs care, then fills the rest from the
 *  evergreen curated pool — never inventing a new dynamic value. */
export function getTipsToday(tone: Tone): string[] {
  const focus = AIR_FOCUS_BY_TONE[tone];
  const needsAirFocus = tone === "warning" || tone === "critical";
  const lead = needsAirFocus ? focus.actions : [];
  const fill = EVERGREEN_TIPS.filter((tip) => !lead.includes(tip));
  return [...lead, ...fill].slice(0, 5);
}
