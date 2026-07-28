// ════════════════════════════════════════════════════════════════════════════
// SCENARIO PRESETS — Phase 5
// ────────────────────────────────────────────────────────────────────────────
// Named, pre-configured lever combinations. Stored as data (not hardcoded
// into any controller) so they can be served via API, modified, or extended
// without touching business logic. No city-specific values are baked in —
// presets only define LEVER intensities; outcomes are always computed
// per-city through the simulation engine against that city's live baseline.
// ════════════════════════════════════════════════════════════════════════════

import { SimulationLevers } from "../services/simulationEngine.service";

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  category:
    | "green"
    | "smart-city"
    | "industrial"
    | "urbanization"
    | "traffic"
    | "air-quality"
    | "net-zero"
    | "regional";
  levers: SimulationLevers;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "green-city-initiative",
    name: "Green City Initiative",
    description:
      "Balanced push on EVs, public transport, and tree cover for steady citywide air-quality gains.",
    category: "green",
    levers: {
      ev: 45,
      traffic: 25,
      trees: 200,
      industry: 5,
      renewable: 40,
      publicTransport: 35,
      wasteManagement: 45,
      greenArea: 25,
    },
  },
  {
    id: "smart-city-transformation",
    name: "Smart City Transformation",
    description:
      "Technology-led transformation emphasizing renewables, public transport digitization, and waste efficiency.",
    category: "smart-city",
    levers: {
      ev: 55,
      traffic: 30,
      trees: 150,
      industry: 10,
      renewable: 60,
      publicTransport: 55,
      wasteManagement: 65,
      greenArea: 20,
    },
  },
  {
    id: "sustainable-belagavi-2030",
    name: "Sustainable Belagavi 2030",
    description:
      "A decade-horizon roadmap purpose-built for mid-sized Indian cities like Belagavi, balancing growth with green cover.",
    category: "green",
    levers: {
      ev: 50,
      traffic: 28,
      trees: 300,
      industry: 12,
      renewable: 45,
      publicTransport: 40,
      wasteManagement: 50,
      greenArea: 30,
    },
  },
  {
    id: "net-zero-roadmap",
    name: "Net Zero Roadmap",
    description:
      "Aggressive decarbonization across every lever, prioritizing renewables and carbon reduction above all else.",
    category: "net-zero",
    levers: {
      ev: 80,
      traffic: 40,
      trees: 400,
      industry: 3,
      renewable: 85,
      publicTransport: 60,
      wasteManagement: 70,
      greenArea: 35,
    },
  },
  {
    id: "industrial-expansion",
    name: "Industrial Expansion Scenario",
    description:
      "Models economic growth priorities with higher industrial output, partially offset by mitigation levers.",
    category: "industrial",
    levers: {
      ev: 20,
      traffic: 8,
      trees: 60,
      industry: 28,
      renewable: 25,
      publicTransport: 15,
      wasteManagement: 30,
      greenArea: 8,
    },
  },
  {
    id: "rapid-urbanization",
    name: "Rapid Urbanization Scenario",
    description:
      "Reflects fast population and infrastructure growth with moderate green investment lagging behind.",
    category: "urbanization",
    levers: {
      ev: 30,
      traffic: 10,
      trees: 90,
      industry: 22,
      renewable: 20,
      publicTransport: 25,
      wasteManagement: 35,
      greenArea: 10,
    },
  },
  {
    id: "traffic-reduction-strategy",
    name: "Traffic Reduction Strategy",
    description:
      "Focused intervention on congestion and vehicle emissions through transit and EV incentives.",
    category: "traffic",
    levers: {
      ev: 60,
      traffic: 55,
      trees: 100,
      industry: 8,
      renewable: 30,
      publicTransport: 65,
      wasteManagement: 35,
      greenArea: 12,
    },
  },
  {
    id: "clean-air-mission",
    name: "Clean Air Mission",
    description:
      "Direct assault on AQI and PM2.5/PM10 through combined transport, industrial, and green-cover measures.",
    category: "air-quality",
    levers: {
      ev: 65,
      traffic: 45,
      trees: 250,
      industry: 6,
      renewable: 50,
      publicTransport: 45,
      wasteManagement: 55,
      greenArea: 28,
    },
  },
];

export function getPresetById(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((p) => p.id === id);
}
