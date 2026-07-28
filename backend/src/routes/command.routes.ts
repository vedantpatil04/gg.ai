import { Router } from "express";
import {
  getExecutiveDashboard,
  getComplaintIntelligence,
  getTrendIntelligence,
  getAuthorityActions,
  generateExecutiveReportEndpoint,
  getGeminiIntelligence,
  exportCommandReportPdf,
} from "../controllers/command.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();

// All Command Center endpoints require authority or administrator role
router.use(authenticate, authorize(...AUTHORITY_ROLES));

// ─── Executive Overview ───────────────────────────────────────────────────────
router.get("/executive-dashboard", getExecutiveDashboard);

// ─── Complaint Intelligence ───────────────────────────────────────────────────
router.get("/complaint-intelligence", getComplaintIntelligence);

// ─── Trend Intelligence ───────────────────────────────────────────────────────
router.get("/trend-intelligence", getTrendIntelligence);

// ─── Authority Actions ────────────────────────────────────────────────────────
router.get("/authority-actions", getAuthorityActions);

// ─── Executive Reports ────────────────────────────────────────────────────────
router.post("/generate-executive-report", generateExecutiveReportEndpoint);

// ─── PDF Export (Phase 6.1) ───────────────────────────────────────────────────
// Streams a downloadable government-grade PDF of the executive report
router.post("/export-report-pdf", exportCommandReportPdf);

// ─── Gemini Intelligence (multi-type) ────────────────────────────────────────
router.post("/gemini-intelligence", getGeminiIntelligence);

export default router;
