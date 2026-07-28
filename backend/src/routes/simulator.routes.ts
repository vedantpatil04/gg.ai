import { Router } from "express";
import {
  runSimulation,
  aiAnalysis,
  getSimulations,
  getPresets,
  compareScenarios,
  getSimulationById,
  exportSimulation,
} from "../controllers/simulator.controller";
import { authenticate, optionalAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  runSimulationValidator,
  compareScenariosValidator,
  exportSimulationValidator,
  simulationIdParamValidator,
} from "../validators/simulator.validator";

const router = Router();

router.get("/presets", getPresets);
router.post("/run", optionalAuth, runSimulationValidator, validate, runSimulation);
router.post("/ai-analysis", optionalAuth, aiAnalysis);
router.post("/compare", optionalAuth, compareScenariosValidator, validate, compareScenarios);
router.get("/history", authenticate, getSimulations);
router.post("/export", optionalAuth, exportSimulationValidator, validate, exportSimulation);
router.get("/:id", optionalAuth, simulationIdParamValidator, validate, getSimulationById);

export default router;
