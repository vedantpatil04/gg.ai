import { Router } from "express";
import {
  getReports,
  getReport,
  createReport,
  generateAIReportEndpoint,
  getReportStats,
  downloadReportPdf,
} from "../controllers/report.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();
router.use(authenticate, authorize(...AUTHORITY_ROLES));

router.get("/stats", getReportStats);
router.get("/", getReports);
router.get("/:id/download", downloadReportPdf);
router.get("/:id", getReport);

// Existing: create with AI summary
router.post("/", createReport);

// Phase 3: full AI report generation
router.post("/generate-ai-report", generateAIReportEndpoint);

export default router;
