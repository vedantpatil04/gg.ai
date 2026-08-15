// ════════════════════════════════════════════════════════════════════════════
// COMMAND CENTER PDF EXPORT SERVICE — Phase 6
// ────────────────────────────────────────────────────────────────────────────
// Generates a government-grade PDF from a Command Center Executive Report.
// Reuses PDFKit (already a project dependency from Phase 5).
// ════════════════════════════════════════════════════════════════════════════

import PDFDocument from "pdfkit";
import { ExecutiveReportOutput } from "./gemini.service";

export interface CommandReportPdfInput {
  report: ExecutiveReportOutput;
  kpis: {
    cityCount: number;
    avgAqi: number;
    avgRisk: number;
    avgEco: number;
    activeAlerts: number;
    totalComplaints: number;
    resolvedComplaints: number;
    resolutionRate: number;
    worstCity?: { name: string; aqi: number } | null;
    bestCity?: { name: string; aqi: number } | null;
  };
  chartData: {
    aqiRanking: Array<{ city: string; aqi: number; pm25: number; risk: number; eco: number }>;
  };
  reportType: string;
  generatedAt: Date;
}

const C = {
  primary: "#0f5c3a",
  primaryDark: "#083b25",
  accent: "#1a9e61",
  dark: "#111827",
  mid: "#374151",
  muted: "#6b7280",
  border: "#d1d5db",
  light: "#f3f4f6",
  white: "#ffffff",
  danger: "#dc2626",
  warning: "#d97706",
  success: "#16a34a",
  info: "#2563eb",
};

function aqiColor(aqi: number): string {
  if (aqi <= 50) return C.success;
  if (aqi <= 100) return C.warning;
  if (aqi <= 150) return "#f97316";
  return C.danger;
}

function riskColor(risk: number): string {
  if (risk <= 40) return C.success;
  if (risk <= 65) return C.warning;
  return C.danger;
}

function pad(doc: PDFKit.PDFDocument, amount: number) {
  doc.moveDown(amount / 12);
}

function hline(doc: PDFKit.PDFDocument, y: number, color = C.border) {
  doc.save().strokeColor(color).lineWidth(0.5).moveTo(50, y).lineTo(545, y).stroke().restore();
}

function sectionHeader(doc: PDFKit.PDFDocument, text: string, y?: number) {
  const yPos = y ?? doc.y;
  doc
    .save()
    .fillColor(C.primary)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(text.toUpperCase(), 50, yPos, { characterSpacing: 0.8 });
  doc.restore();
  hline(doc, doc.y + 2, C.primary);
  doc.moveDown(0.6);
}

function bulletItem(doc: PDFKit.PDFDocument, text: string, color = C.mid) {
  const x = doc.x;
  doc
    .save()
    .fillColor(C.accent)
    .circle(x - 8, doc.y + 4.5, 2)
    .fill();
  doc
    .fillColor(color)
    .fontSize(9)
    .font("Helvetica")
    .text(text, x, doc.y, { width: 490, lineGap: 1.5 });
  doc.restore();
  pad(doc, 4);
}

function numberedItem(doc: PDFKit.PDFDocument, n: number, text: string) {
  const x = doc.x;
  doc
    .save()
    .fillColor(C.primary)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(`${n}.`, x - 12, doc.y, { width: 12 });
  doc
    .fillColor(C.mid)
    .fontSize(9)
    .font("Helvetica")
    .text(text, x, doc.y - doc.currentLineHeight(), { width: 490, lineGap: 1.5 });
  doc.restore();
  pad(doc, 4);
}

function kpiBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  color: string,
) {
  doc.save().roundedRect(x, y, w, h, 4).fillColor(C.light).fill();
  doc
    .fillColor(color)
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(value, x + 8, y + 8, { width: w - 16, align: "center" });
  doc
    .fillColor(C.muted)
    .fontSize(7)
    .font("Helvetica")
    .text(label.toUpperCase(), x + 4, y + h - 18, {
      width: w - 8,
      align: "center",
      characterSpacing: 0.3,
    });
  doc.restore();
}

/** Renders the city table with AQI/Risk/Eco columns */
function renderCityTable(
  doc: PDFKit.PDFDocument,
  rows: Array<{ city: string; aqi: number; pm25: number; risk: number; eco: number }>,
) {
  const startX = 50;
  const colWidths = [180, 70, 70, 70, 70, 35];
  const headers = ["City", "AQI", "PM2.5", "Risk", "Eco", "Status"];
  const rowH = 16;

  // Header row
  doc.save().rect(startX, doc.y, 495, rowH).fillColor(C.primary).fill();
  let cx = startX + 6;
  headers.forEach((h, i) => {
    doc
      .fillColor(C.white)
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .text(h, cx, doc.y - rowH + 4, { width: colWidths[i] - 4, lineBreak: false });
    cx += colWidths[i];
  });
  doc.restore();
  doc.moveDown(rowH / 12);

  rows.slice(0, 12).forEach((r, idx) => {
    const rowY = doc.y;
    if (idx % 2 === 0) {
      doc
        .save()
        .rect(startX, rowY, 495, rowH - 1)
        .fillColor(C.light)
        .fill()
        .restore();
    }
    const status =
      r.aqi <= 50 ? "Good" : r.aqi <= 100 ? "Moderate" : r.aqi <= 150 ? "Unhealthy" : "Hazardous";
    const statusColor = aqiColor(r.aqi);
    const cells = [
      r.city.slice(0, 22),
      String(r.aqi),
      String(r.pm25),
      String(r.risk),
      String(r.eco),
      status,
    ];
    let cx2 = startX + 6;
    cells.forEach((val, ci) => {
      const color =
        ci === 1
          ? aqiColor(r.aqi)
          : ci === 3
            ? riskColor(r.risk)
            : ci === 4
              ? C.success
              : ci === 5
                ? statusColor
                : C.mid;
      const bold = ci === 1 || ci === 5;
      doc
        .fillColor(color)
        .fontSize(8)
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .text(val, cx2, rowY + 4, { width: colWidths[ci] - 4, lineBreak: false });
      cx2 += colWidths[ci];
    });
    doc.moveDown(rowH / 12);
  });
}

/** Main builder — returns the PDF as a Buffer */
export function buildCommandReportPdf(input: CommandReportPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: input.report.title,
          Author: "GreenGuard AI",
          Subject: `${input.reportType} Environmental Intelligence Report`,
          Creator: "GreenGuard AI v6.0",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── COVER HEADER ─────────────────────────────────────────────────────
      // Top green bar
      doc.save().rect(0, 0, 595, 6).fillColor(C.primary).fill().restore();

      doc
        .fillColor(C.muted)
        .fontSize(7.5)
        .font("Helvetica")
        .text("GOVERNMENT ENVIRONMENTAL INTELLIGENCE", 50, 24, { characterSpacing: 1.2 });
      doc.fillColor(C.dark).fontSize(20).font("Helvetica-Bold").text("GreenGuard AI", 50, 38);
      doc
        .fillColor(C.primary)
        .fontSize(11)
        .font("Helvetica")
        .text("Environmental Intelligence Platform — Command Center", 50, 62);

      hline(doc, 82);

      // Report title block
      doc
        .fillColor(C.dark)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(input.report.title, 50, 94, { width: 440 });
      doc
        .fillColor(C.muted)
        .fontSize(9)
        .font("Helvetica")
        .text(`Reporting Period: ${input.report.period}`, 50, doc.y + 4);
      doc
        .fillColor(C.muted)
        .fontSize(8)
        .text(
          `Generated: ${input.generatedAt.toLocaleString("en-IN")} · Network: ${input.kpis.cityCount} Cities`,
          50,
          doc.y + 2,
        );

      // Official badge (top-right)
      doc.save().roundedRect(420, 94, 125, 32, 4).fillColor(C.primary).fill();
      doc
        .fillColor(C.white)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("OFFICIAL REPORT", 420, 100, { width: 125, align: "center", characterSpacing: 0.6 });
      doc
        .fillColor(C.white)
        .fontSize(6.5)
        .font("Helvetica")
        .text("GreenGuard AI v6.0", 420, 113, { width: 125, align: "center" });
      doc.restore();

      hline(doc, doc.y + 10);
      doc.moveDown(1.4);

      // ── KPI BOXES ────────────────────────────────────────────────────────
      const kpiY = doc.y;
      const boxW = 93;
      const boxH = 48;
      const gap = 6;
      kpiBox(
        doc,
        50,
        kpiY,
        boxW,
        boxH,
        "Cities Monitored",
        String(input.kpis.cityCount),
        C.primary,
      );
      kpiBox(
        doc,
        50 + (boxW + gap),
        kpiY,
        boxW,
        boxH,
        "Avg Network AQI",
        String(input.kpis.avgAqi),
        aqiColor(input.kpis.avgAqi),
      );
      kpiBox(
        doc,
        50 + (boxW + gap) * 2,
        kpiY,
        boxW,
        boxH,
        "Active Alerts",
        String(input.kpis.activeAlerts),
        input.kpis.activeAlerts > 5 ? C.danger : C.warning,
      );
      kpiBox(
        doc,
        50 + (boxW + gap) * 3,
        kpiY,
        boxW,
        boxH,
        "Avg Eco Score",
        String(input.kpis.avgEco),
        C.success,
      );
      kpiBox(
        doc,
        50 + (boxW + gap) * 4,
        kpiY,
        boxW,
        boxH,
        "Resolution Rate",
        `${input.kpis.resolutionRate}%`,
        C.info,
      );

      doc.y = kpiY + boxH + 16;

      // ── EXECUTIVE SUMMARY ────────────────────────────────────────────────
      sectionHeader(doc, "1. Executive Summary");
      doc
        .fillColor(C.mid)
        .fontSize(9.5)
        .font("Helvetica")
        .text(input.report.executiveSummary, 50, doc.y, {
          width: 495,
          lineGap: 2.5,
          align: "justify",
        });
      pad(doc, 14);

      // ── NETWORK HEALTH ASSESSMENT ─────────────────────────────────────────
      sectionHeader(doc, "2. Network Health Assessment");
      doc
        .fillColor(C.mid)
        .fontSize(9.5)
        .font("Helvetica")
        .text(input.report.networkHealthAssessment, 50, doc.y, {
          width: 495,
          lineGap: 2.5,
          align: "justify",
        });
      pad(doc, 14);

      // Best / Worst cities callout
      if (input.kpis.bestCity || input.kpis.worstCity) {
        const calloutY = doc.y;
        // Worst city box
        if (input.kpis.worstCity) {
          doc.save().roundedRect(50, calloutY, 235, 36, 4).fillColor("#fef2f2").fill().restore();
          doc.save().roundedRect(50, calloutY, 4, 36, 2).fillColor(C.danger).fill().restore();
          doc
            .fillColor(C.danger)
            .fontSize(7)
            .font("Helvetica-Bold")
            .text("HIGHEST POLLUTION", 62, calloutY + 5, { characterSpacing: 0.4 });
          doc
            .fillColor(C.dark)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(input.kpis.worstCity.name, 62, calloutY + 15);
          doc
            .fillColor(C.danger)
            .fontSize(9)
            .font("Helvetica")
            .text(`AQI ${input.kpis.worstCity.aqi}`, 62, calloutY + 26);
        }
        // Best city box
        if (input.kpis.bestCity) {
          doc.save().roundedRect(310, calloutY, 235, 36, 4).fillColor("#f0fdf4").fill().restore();
          doc.save().roundedRect(310, calloutY, 4, 36, 2).fillColor(C.success).fill().restore();
          doc
            .fillColor(C.success)
            .fontSize(7)
            .font("Helvetica-Bold")
            .text("BEST PERFORMER", 322, calloutY + 5, { characterSpacing: 0.4 });
          doc
            .fillColor(C.dark)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(input.kpis.bestCity.name, 322, calloutY + 15);
          doc
            .fillColor(C.success)
            .fontSize(9)
            .font("Helvetica")
            .text(`AQI ${input.kpis.bestCity.aqi}`, 322, calloutY + 26);
        }
        doc.y = calloutY + 50;
      }

      // ── PAGE 2 ───────────────────────────────────────────────────────────
      doc.addPage();
      doc.save().rect(0, 0, 595, 6).fillColor(C.primary).fill().restore();
      doc.moveDown(0.8);

      // ── CITY RANKINGS TABLE ───────────────────────────────────────────────
      sectionHeader(doc, "3. City Performance Rankings");
      if (input.chartData.aqiRanking.length > 0) {
        renderCityTable(doc, input.chartData.aqiRanking);
      }
      pad(doc, 14);

      // ── KEY FINDINGS ──────────────────────────────────────────────────────
      sectionHeader(doc, "4. Key Findings");
      doc.x = 62; // indent for bullets
      input.report.keyFindings.forEach((f) => bulletItem(doc, f));
      doc.x = 50;
      pad(doc, 10);

      // ── CITY PERFORMANCE HIGHLIGHTS ───────────────────────────────────────
      sectionHeader(doc, "5. City Performance Highlights");
      doc.x = 62;
      input.report.cityPerformanceHighlights.forEach((h) => bulletItem(doc, h, C.primary));
      doc.x = 50;
      pad(doc, 10);

      // ── PAGE 3 ───────────────────────────────────────────────────────────
      doc.addPage();
      doc.save().rect(0, 0, 595, 6).fillColor(C.primary).fill().restore();
      doc.moveDown(0.8);

      // ── ACTION ITEMS ──────────────────────────────────────────────────────
      sectionHeader(doc, "6. Action Items");
      doc.x = 62;
      input.report.actionItems.forEach((item, i) => numberedItem(doc, i + 1, item));
      doc.x = 50;
      pad(doc, 14);

      // ── RECOMMENDATIONS ───────────────────────────────────────────────────
      sectionHeader(doc, "7. Recommendations");
      doc.x = 62;
      input.report.recommendations.forEach((rec, i) => numberedItem(doc, i + 1, rec));
      doc.x = 50;
      pad(doc, 14);

      // ── CONCLUSION ────────────────────────────────────────────────────────
      sectionHeader(doc, "8. Conclusion");
      doc
        .fillColor(C.mid)
        .fontSize(9.5)
        .font("Helvetica")
        .text(input.report.conclusion, 50, doc.y, { width: 495, lineGap: 2.5, align: "justify" });
      pad(doc, 20);

      // Network stats summary
      doc.save().roundedRect(50, doc.y, 495, 48, 4).fillColor(C.light).fill().restore();
      const sY = doc.y + 8;
      const statsRow = [
        { label: "Total Complaints", val: String(input.kpis.totalComplaints) },
        { label: "Resolved", val: String(input.kpis.resolvedComplaints) },
        { label: "Avg Risk Score", val: String(input.kpis.avgRisk) },
        { label: "Avg AQI", val: String(input.kpis.avgAqi) },
      ];
      statsRow.forEach((s, i) => {
        const sx = 70 + i * 120;
        doc
          .fillColor(C.primary)
          .fontSize(14)
          .font("Helvetica-Bold")
          .text(s.val, sx, sY, { width: 100, align: "center" });
        doc
          .fillColor(C.muted)
          .fontSize(7)
          .font("Helvetica")
          .text(s.label.toUpperCase(), sx, sY + 17, {
            width: 100,
            align: "center",
            characterSpacing: 0.3,
          });
      });

      // ── FOOTER ───────────────────────────────────────────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(pages.start + i);
        hline(doc, 760);
        doc
          .fillColor(C.muted)
          .fontSize(7)
          .font("Helvetica")
          .text(
            `GreenGuard AI — Environmental Intelligence Platform · ${input.report.title}`,
            50,
            768,
            { width: 350 },
          )
          .text(`Page ${i + 1} of ${pages.count}`, 50, 768, { width: 495, align: "right" });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
// AUTHORITY OPERATIONS REPORT PDF — Phase 8
// ────────────────────────────────────────────────────────────────────────────
// Unlike buildCommandReportPdf above (a Gemini-narrated network report), this
// is a purely tabular, real-data-only operational document built from the
// same authority-scoped complaint analytics served on the Analytics tab.
// No AI narrative, no invented figures — every number here traces directly
// back to real Complaint documents/timestamps/events.
// ════════════════════════════════════════════════════════════════════════════

export interface AuthorityOperationsReportPdfInput {
  scope: "assigned" | "all";
  period: { days: number; since: string };
  kpis: {
    totalAssigned: number;
    inProgress: number;
    awaitingCitizenReview: number;
    rework: number;
    closed: number;
    resolutionRate: number;
    avgOpenCaseAgeHours?: number;
  };
  performance: {
    avgAssignmentToInvestigationHours?: number;
    avgInvestigationDurationHours?: number;
    avgResolutionToClosureHours?: number;
    avgOverallResolutionHours?: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  byCategory: Array<{ issueType: string; count: number }>;
  byAssignmentSource: Array<{ source: string; count: number }>;
  byCity: Array<{
    cityId: string;
    total: number;
    resolved: number;
    pending: number;
    critical: number;
    resolutionRate: number;
    aqi?: number;
  }>;
  rework: {
    total: number;
    percentage: number;
    avgResolutionAttempts?: number;
    byCategory: Array<{ issueType: string; count: number }>;
  };
  citizenReview: { awaiting: number; accepted: number; avgTurnaroundHours?: number };
  generatedAt: Date;
  generatedByName: string;
}

function fmtHours(h?: number): string {
  if (h === undefined) return "Insufficient data";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h} hrs`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Simple two/three-column label→value data table, no chart dependency. */
function renderDataTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  colWidths: number[],
  rows: string[][],
) {
  const startX = 50;
  const rowH = 16;

  doc.save().rect(startX, doc.y, 495, rowH).fillColor(C.primary).fill();
  let cx = startX + 6;
  headers.forEach((h, i) => {
    doc
      .fillColor(C.white)
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .text(h, cx, doc.y - rowH + 4, { width: colWidths[i] - 4, lineBreak: false });
    cx += colWidths[i];
  });
  doc.restore();
  doc.moveDown(rowH / 12);

  if (rows.length === 0) {
    doc
      .fillColor(C.muted)
      .fontSize(8.5)
      .font("Helvetica")
      .text("No data available for this period.", startX + 6, doc.y + 4);
    doc.moveDown(1.2);
    return;
  }

  rows.forEach((row, idx) => {
    const rowY = doc.y;
    if (idx % 2 === 0) {
      doc.save().rect(startX, rowY, 495, rowH - 1).fillColor(C.light).fill().restore();
    }
    let cx2 = startX + 6;
    row.forEach((val, ci) => {
      doc
        .fillColor(C.mid)
        .fontSize(8)
        .font(ci === 0 ? "Helvetica-Bold" : "Helvetica")
        .text(val, cx2, rowY + 4, { width: colWidths[ci] - 4, lineBreak: false });
      cx2 += colWidths[ci];
    });
    doc.moveDown(rowH / 12);
  });
}

/** Main builder — returns the Authority Operations Report PDF as a Buffer */
export function buildAuthorityOperationsReportPdf(
  input: AuthorityOperationsReportPdfInput,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: "GreenGuard AI — Complaint Operations Report",
          Author: "GreenGuard AI",
          Subject: "Authority Complaint Operations Report",
          Creator: "GreenGuard AI v6.0",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── HEADER ──────────────────────────────────────────────────────────
      doc.save().rect(0, 0, 595, 6).fillColor(C.primary).fill().restore();
      doc
        .fillColor(C.muted)
        .fontSize(7.5)
        .font("Helvetica")
        .text("GOVERNMENT COMPLAINT OPERATIONS", 50, 24, { characterSpacing: 1.2 });
      doc.fillColor(C.dark).fontSize(20).font("Helvetica-Bold").text("GreenGuard AI", 50, 38);
      doc
        .fillColor(C.primary)
        .fontSize(11)
        .font("Helvetica")
        .text("Authority Command Center — Complaint Operations Report", 50, 62);

      hline(doc, 82);

      doc
        .fillColor(C.dark)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Complaint Operations Report", 50, 94, { width: 440 });
      const sinceLabel = new Date(input.period.since).toLocaleDateString("en-IN");
      doc
        .fillColor(C.muted)
        .fontSize(9)
        .font("Helvetica")
        .text(`Reporting Period: Last ${input.period.days} days (from ${sinceLabel})`, 50, doc.y + 4);
      doc
        .fillColor(C.muted)
        .fontSize(8)
        .text(
          `Generated: ${input.generatedAt.toLocaleString("en-IN")} · Scope: ${
            input.scope === "assigned" ? `Complaints assigned to ${input.generatedByName}` : "Network-wide (Administrator)"
          }`,
          50,
          doc.y + 2,
        );

      doc.save().roundedRect(420, 94, 125, 32, 4).fillColor(C.primary).fill();
      doc
        .fillColor(C.white)
        .fontSize(7)
        .font("Helvetica-Bold")
        .text("OFFICIAL REPORT", 420, 100, { width: 125, align: "center", characterSpacing: 0.6 });
      doc
        .fillColor(C.white)
        .fontSize(6.5)
        .font("Helvetica")
        .text("GreenGuard AI v6.0", 420, 113, { width: 125, align: "center" });
      doc.restore();

      hline(doc, doc.y + 10);
      doc.moveDown(1.4);

      // ── KPI BOXES ───────────────────────────────────────────────────────
      const kpiY = doc.y;
      const boxW = 93;
      const boxH = 48;
      const gap = 6;
      const kpis = [
        { label: "Total Assigned", value: String(input.kpis.totalAssigned), color: C.primary },
        { label: "In Progress", value: String(input.kpis.inProgress), color: C.info },
        { label: "Awaiting Review", value: String(input.kpis.awaitingCitizenReview), color: C.warning },
        { label: "Rework", value: String(input.kpis.rework), color: C.danger },
        { label: "Resolution Rate", value: `${input.kpis.resolutionRate}%`, color: C.success },
      ];
      kpis.forEach((k, i) => kpiBox(doc, 50 + (boxW + gap) * i, kpiY, boxW, boxH, k.label, k.value, k.color));
      doc.y = kpiY + boxH + 16;

      // ── PERFORMANCE ─────────────────────────────────────────────────────
      sectionHeader(doc, "1. Performance Metrics");
      renderDataTable(
        doc,
        ["Metric", "Value"],
        [280, 215],
        [
          ["Avg. Time to Closure (overall)", fmtHours(input.performance.avgOverallResolutionHours)],
          ["Avg. Investigation Duration", fmtHours(input.performance.avgInvestigationDurationHours)],
          ["Avg. Resolution → Closure", fmtHours(input.performance.avgResolutionToClosureHours)],
          ["Avg. Age of Open Cases", fmtHours(input.kpis.avgOpenCaseAgeHours)],
        ],
      );
      pad(doc, 10);

      // ── STATUS / SEVERITY BREAKDOWN ────────────────────────────────────
      sectionHeader(doc, "2. Status & Severity Distribution");
      renderDataTable(
        doc,
        ["Status", "Count"],
        [280, 215],
        input.byStatus.map((s) => [titleCase(s.status), String(s.count)]),
      );
      pad(doc, 6);
      renderDataTable(
        doc,
        ["Severity", "Count"],
        [280, 215],
        input.bySeverity.map((s) => [titleCase(s.severity), String(s.count)]),
      );
      pad(doc, 10);

      // ── PAGE 2 ──────────────────────────────────────────────────────────
      doc.addPage();
      doc.save().rect(0, 0, 595, 6).fillColor(C.primary).fill().restore();
      doc.moveDown(0.8);

      // ── CATEGORY BREAKDOWN ──────────────────────────────────────────────
      sectionHeader(doc, "3. Category Breakdown");
      renderDataTable(
        doc,
        ["Category", "Count"],
        [280, 215],
        input.byCategory.map((c) => [titleCase(c.issueType), String(c.count)]),
      );
      pad(doc, 10);

      // ── LOCATION BREAKDOWN ───────────────────────────────────────────────
      sectionHeader(doc, "4. Location / Jurisdiction Breakdown");
      renderDataTable(
        doc,
        ["City", "Total", "Resolved", "Pending", "Critical", "AQI"],
        [140, 65, 80, 70, 70, 70],
        input.byCity.map((c) => [
          titleCase(c.cityId),
          String(c.total),
          String(c.resolved),
          String(c.pending),
          String(c.critical),
          c.aqi !== undefined ? String(c.aqi) : "—",
        ]),
      );
      pad(doc, 10);

      // ── ASSIGNMENT SOURCE ──────────────────────────────────────────────
      sectionHeader(doc, "5. Assignment Source (Smart Routing)");
      renderDataTable(
        doc,
        ["Source", "Count"],
        [280, 215],
        input.byAssignmentSource.map((s) => [titleCase(s.source), String(s.count)]),
      );
      pad(doc, 10);

      // ── PAGE 3 ──────────────────────────────────────────────────────────
      doc.addPage();
      doc.save().rect(0, 0, 595, 6).fillColor(C.primary).fill().restore();
      doc.moveDown(0.8);

      // ── REWORK ANALYTICS ────────────────────────────────────────────────
      sectionHeader(doc, "6. Rework Analytics");
      renderDataTable(
        doc,
        ["Metric", "Value"],
        [280, 215],
        [
          ["Total Cases with Rework", String(input.rework.total)],
          ["Rework Rate", `${input.rework.percentage}%`],
          [
            "Avg. Resolution Attempts",
            input.rework.avgResolutionAttempts !== undefined
              ? String(input.rework.avgResolutionAttempts)
              : "Insufficient data",
          ],
        ],
      );
      pad(doc, 6);
      if (input.rework.byCategory.length > 0) {
        renderDataTable(
          doc,
          ["Rework by Category", "Count"],
          [280, 215],
          input.rework.byCategory.map((c) => [titleCase(c.issueType), String(c.count)]),
        );
        pad(doc, 10);
      }

      // ── CITIZEN REVIEW ───────────────────────────────────────────────────
      sectionHeader(doc, "7. Citizen Review");
      renderDataTable(
        doc,
        ["Metric", "Value"],
        [280, 215],
        [
          ["Awaiting Citizen Review", String(input.citizenReview.awaiting)],
          ["Accepted Resolutions", String(input.citizenReview.accepted)],
          ["Avg. Citizen Review Turnaround", fmtHours(input.citizenReview.avgTurnaroundHours)],
        ],
      );
      pad(doc, 20);

      // ── FOOTER ───────────────────────────────────────────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(pages.start + i);
        hline(doc, 760);
        doc
          .fillColor(C.muted)
          .fontSize(7)
          .font("Helvetica")
          .text("GreenGuard AI — Complaint Operations Report", 50, 768, { width: 350 })
          .text(`Page ${i + 1} of ${pages.count}`, 50, 768, { width: 495, align: "right" });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
