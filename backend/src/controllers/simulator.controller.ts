import { Request, Response, NextFunction } from "express";
import { PolicySimulation } from "../models/PolicySimulation";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { AppError } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import {
  generateFullPolicyAnalysis,
  generateExecutiveBriefing,
  generateComparisonNarrative,
} from "../services/gemini.service";
import {
  calculateSimulation,
  calculateExecutiveScores,
  normalizeLevers,
  diffResults,
  SimulationLevers,
  LEVER_BOUNDS,
  CityBaseline,
} from "../services/simulationEngine.service";
import { SCENARIO_PRESETS, getPresetById } from "../data/scenarioPresets";
import { buildSimulationPdf } from "../services/pdfExport.service";

// ─── helpers ───────────────────────────────────────────────────────────────
async function loadCityBaseline(cityId: string): Promise<CityBaseline | null> {
  const cityData = await EnvironmentalData.findOne({ cityId: (cityId || "belagavi").toLowerCase() })
    .sort({ timestamp: -1 })
    .lean();
  if (!cityData) return null;
  return {
    cityId: cityData.cityId,
    cityName: cityData.cityName,
    country: cityData.country,
    aqi: cityData.aqi,
    pm25: cityData.pm25,
    pm10: cityData.pm10,
    water: cityData.water,
    risk: cityData.risk,
    eco: cityData.eco,
    carbon: cityData.carbon,
    renewableShare: cityData.renewableShare,
    greenCover: cityData.greenCover,
  };
}

function leversToArray(levers: SimulationLevers) {
  return (Object.keys(LEVER_BOUNDS) as Array<keyof SimulationLevers>).map((key) => ({
    id: key,
    label: LEVER_BOUNDS[key].label,
    value: levers[key],
    unit: LEVER_BOUNDS[key].unit,
  }));
}

// ─── POST /api/simulator/run ──────────────────────────────────────────────
export async function runSimulation(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      cityId,
      levers: leverInput,
      name,
      presetId,
    } = req.body as {
      cityId: string;
      levers?: Partial<SimulationLevers>;
      name?: string;
      presetId?: string;
    };

    const baseline = await loadCityBaseline(cityId);
    if (!baseline) return next(new AppError("City data not found", 404));

    const preset = presetId ? getPresetById(presetId) : undefined;
    const levers = normalizeLevers(preset ? preset.levers : (leverInput ?? {}));

    const results = calculateSimulation(baseline, levers);
    const executiveScores = calculateExecutiveScores(baseline, results);

    // Full AI analysis (kept compatible with existing PolicyAnalysis shape)
    const analysis = await generateFullPolicyAnalysis(
      baseline as unknown as Record<string, unknown>,
      levers as unknown as Record<string, number>,
      results as unknown as Record<string, unknown>,
    );

    const legacyResults = {
      aqiDelta: results.aqiDelta,
      projectedAqi: results.projectedAqi,
      healthScore: results.healthScore,
      ecoScore: results.ecoScore,
      sustainabilityScore: results.sustainabilityScore,
      carbonReduction: results.carbonReduction,
      pm25Delta: results.pm25Delta,
      projectedPm25: results.projectedPm25,
      pm10Delta: results.pm10Delta,
      projectedPm10: results.projectedPm10,
      riskScoreDelta: results.riskScoreDelta,
      projectedRiskScore: results.projectedRiskScore,
      waterQualityDelta: results.waterQualityDelta,
      projectedWaterQuality: results.projectedWaterQuality,
      sustainabilityIndex: results.sustainabilityIndex,
    };

    let saved = null;
    if (req.user) {
      saved = await PolicySimulation.create({
        name:
          name ||
          preset?.name ||
          `Simulation — ${baseline.cityName} ${new Date().toLocaleDateString()}`,
        cityId: baseline.cityId,
        baselineAqi: baseline.aqi,
        levers: leversToArray(levers),
        results: legacyResults,
        aiInsight: analysis.summary + " " + analysis.environmentalImpact,
        createdBy: req.user._id,
        presetId: preset?.id,
        presetName: preset?.name,
        executiveScores,
      });
    }

    res.json({
      success: true,
      data: {
        cityId: baseline.cityId,
        cityName: baseline.cityName,
        levers,
        results,
        executiveScores,
        aiInsight: analysis.summary + " " + analysis.environmentalImpact,
        analysis,
        simulation: saved,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/simulator/ai-analysis ─────────────────────────────────────────
export async function aiAnalysis(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId, levers, results } = req.body as {
      cityId: string;
      levers: Record<string, number>;
      results: Record<string, unknown>;
    };

    const baseline = await loadCityBaseline(cityId);
    if (!baseline) return next(new AppError("City data not found", 404));

    const analysis = await generateFullPolicyAnalysis(
      baseline as unknown as Record<string, unknown>,
      levers,
      results,
    );
    res.json({
      success: true,
      data: { analysis, cityId: baseline.cityId, cityName: baseline.cityName },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/simulator/presets ───────────────────────────────────────────
export async function getPresets(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: { presets: SCENARIO_PRESETS } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/simulator/compare ──────────────────────────────────────────
export async function compareScenarios(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId, scenarioA, scenarioB } = req.body as {
      cityId: string;
      scenarioA: { name?: string; levers: Partial<SimulationLevers>; presetId?: string };
      scenarioB: { name?: string; levers: Partial<SimulationLevers>; presetId?: string };
    };

    const baseline = await loadCityBaseline(cityId);
    if (!baseline) return next(new AppError("City data not found", 404));

    const presetA = scenarioA.presetId ? getPresetById(scenarioA.presetId) : undefined;
    const presetB = scenarioB.presetId ? getPresetById(scenarioB.presetId) : undefined;

    const leversA = normalizeLevers(presetA ? presetA.levers : (scenarioA.levers ?? {}));
    const leversB = normalizeLevers(presetB ? presetB.levers : (scenarioB.levers ?? {}));

    const resultsA = calculateSimulation(baseline, leversA);
    const resultsB = calculateSimulation(baseline, leversB);

    const scoresA = calculateExecutiveScores(baseline, resultsA);
    const scoresB = calculateExecutiveScores(baseline, resultsB);

    const diff = diffResults(resultsA, resultsB);

    const nameA = scenarioA.name || presetA?.name || "Scenario A";
    const nameB = scenarioB.name || presetB?.name || "Scenario B";

    const narrative = await generateComparisonNarrative(
      baseline.cityName,
      nameA,
      nameB,
      diff as unknown as Record<string, unknown>,
    );

    res.json({
      success: true,
      data: {
        cityId: baseline.cityId,
        cityName: baseline.cityName,
        scenarioA: { name: nameA, levers: leversA, results: resultsA, executiveScores: scoresA },
        scenarioB: { name: nameB, levers: leversB, results: resultsB, executiveScores: scoresB },
        diff,
        narrative,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/simulator/history ───────────────────────────────────────────
export async function getSimulations(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) return next(new AppError("Not authenticated", 401));
    const simulations = await PolicySimulation.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ success: true, data: { simulations } });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/simulator/:id ────────────────────────────────────────────────
export async function getSimulationById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const simulation = await PolicySimulation.findById(req.params.id).lean();
    if (!simulation) return next(new AppError("Simulation not found", 404));

    // Only the owner (or public simulations) may be viewed
    if (
      !simulation.isPublic &&
      (!req.user || String(simulation.createdBy) !== String(req.user._id))
    ) {
      return next(new AppError("Not authorized to view this simulation", 403));
    }

    res.json({ success: true, data: { simulation } });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/simulator/export ───────────────────────────────────────────
export async function exportSimulation(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      simulationId,
      cityId,
      levers: leverInput,
      presetId,
    } = req.body as {
      simulationId?: string;
      cityId?: string;
      levers?: Partial<SimulationLevers>;
      presetId?: string;
    };

    let baseline: CityBaseline | null;
    let levers: SimulationLevers;
    let scenarioName = "Custom Scenario";
    let presetName: string | undefined;

    if (simulationId) {
      const sim = await PolicySimulation.findById(simulationId).lean();
      if (!sim) return next(new AppError("Simulation not found", 404));
      if (!sim.isPublic && (!req.user || String(sim.createdBy) !== String(req.user._id))) {
        return next(new AppError("Not authorized to export this simulation", 403));
      }
      baseline = await loadCityBaseline(sim.cityId);
      if (!baseline) return next(new AppError("City data not found", 404));
      const leverMap: Partial<SimulationLevers> = {};
      sim.levers.forEach((l) => {
        (leverMap as Record<string, number>)[l.id] = l.value;
      });
      levers = normalizeLevers(leverMap);
      scenarioName = sim.name;
      presetName = sim.presetName;
    } else {
      baseline = await loadCityBaseline(cityId || "belagavi");
      if (!baseline) return next(new AppError("City data not found", 404));
      const preset = presetId ? getPresetById(presetId) : undefined;
      levers = normalizeLevers(preset ? preset.levers : (leverInput ?? {}));
      presetName = preset?.name;
    }

    const results = calculateSimulation(baseline, levers);
    const executiveScores = calculateExecutiveScores(baseline, results);

    const briefing = await generateExecutiveBriefing(
      baseline as unknown as Record<string, unknown>,
      levers as unknown as Record<string, number>,
      results as unknown as Record<string, unknown>,
      executiveScores as unknown as Record<string, unknown>,
    );

    const pdfBuffer = await buildSimulationPdf({
      cityName: baseline.cityName,
      country: baseline.country,
      baselineAqi: baseline.aqi,
      baselineEco: baseline.eco,
      generatedAt: new Date(),
      scenarioName,
      presetName,
      levers,
      results,
      executiveScores,
      briefing,
    });

    const safeCity = baseline.cityName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="greenguard-simulation-${safeCity}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}
