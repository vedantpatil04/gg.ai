import { Router } from "express";
import {
  getExecutiveDashboard,
  getComplaintIntelligence,
  getAuthorityAnalytics,
  getTrendIntelligence,
  getAuthorityActions,
  generateExecutiveReportEndpoint,
  getGeminiIntelligence,
  exportCommandReportPdf,
  exportAuthorityOperationsReportPdf,
  getBoardContext,
  updateAvailability,
} from "../controllers/command.controller";
import { authenticate, authorize, AUTHORITY_ROLES } from "../middleware/auth";

const router = Router();

// All Command Center endpoints require authority or administrator role
router.use(authenticate, authorize(...AUTHORITY_ROLES));

// ─── Executive Overview ───────────────────────────────────────────────────────
router.get("/executive-dashboard", getExecutiveDashboard);

// ─── Complaint Intelligence ───────────────────────────────────────────────────
router.get("/complaint-intelligence", getComplaintIntelligence);

// ─── Authority Analytics (Phase 8) ────────────────────────────────────────────
// Authority-scoped (server-enforced) complaint/workload analytics — distinct
// from the network-wide /complaint-intelligence above.
router.get("/authority-analytics", getAuthorityAnalytics);

// ─── Trend Intelligence ───────────────────────────────────────────────────────
router.get("/trend-intelligence", getTrendIntelligence);

// ─── Authority Board Automation (Automation 4) ────────────────────────────────
// Board operational context & team availability
router.get("/board-context", getBoardContext);
router.patch("/availability", updateAvailability);

// ─── Authority Actions ────────────────────────────────────────────────────────
router.get("/authority-actions", getAuthorityActions);

// ─── Executive Reports ────────────────────────────────────────────────────────
router.post("/generate-executive-report", generateExecutiveReportEndpoint);

// ─── PDF Export (Phase 6.1) ───────────────────────────────────────────────────
// Streams a downloadable government-grade PDF of the executive report
router.post("/export-report-pdf", exportCommandReportPdf);

// ─── Operations Report PDF Export (Phase 8) ───────────────────────────────────
// Streams the authority-scoped Complaint Operations Report — real complaint
// data only, no Gemini narrative — as a downloadable PDF.
router.get("/export-operations-report-pdf", exportAuthorityOperationsReportPdf);

// ─── Gemini Intelligence (multi-type) ────────────────────────────────────────
router.post("/gemini-intelligence", getGeminiIntelligence);

export default router;
