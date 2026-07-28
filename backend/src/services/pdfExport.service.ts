// ════════════════════════════════════════════════════════════════════════════
// PDF EXPORT SERVICE — Phase 5
// ────────────────────────────────────────────────────────────────────────────
// Generates a professional, government/judge-ready PDF summary of a single
// policy simulation. Uses pdfkit (pure JS, no native deps) so it runs the
// same way in dev and in any deployment target without extra system libs.
// ════════════════════════════════════════════════════════════════════════════

import PDFDocument from "pdfkit";
import {
  SimulationResults,
  ExecutiveScores,
  SimulationLevers,
  LEVER_BOUNDS,
} from "./simulationEngine.service";
import { ExecutiveBriefing } from "./gemini.service";

export interface PdfExportInput {
  cityName: string;
  country: string;
  baselineAqi: number;
  baselineEco: number;
  generatedAt: Date;
  scenarioName: string;
  presetName?: string;
  levers: SimulationLevers;
  results: SimulationResults;
  executiveScores: ExecutiveScores;
  briefing?: ExecutiveBriefing;
}

const COLORS = {
  primary: "#1f7a4d",
  dark: "#14202b",
  muted: "#5b6b76",
  border: "#d8e0e2",
  good: "#1f7a4d",
  bad: "#c0392b",
  bg: "#f4f7f6",
};

function verdictColor(verdict: string): string {
  switch (verdict) {
    case "Highly Recommended":
      return "#1f7a4d";
    case "Recommended":
      return "#2d7dd2";
    case "Moderate Impact":
      return "#c98a1c";
    default:
      return "#c0392b";
  }
}

/** Builds the PDF and returns it as a Buffer. */
export function buildSimulationPdf(input: PdfExportInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      renderHeader(doc, input);
      renderExecutiveVerdict(doc, input);
      renderKpiCards(doc, input);
      renderLeverTable(doc, input);
      renderMetricsTable(doc, input);
      if (input.briefing) renderBriefing(doc, input.briefing);
      renderFooter(doc, input);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function renderHeader(doc: PDFKit.PDFDocument, input: PdfExportInput) {
  doc
    .fillColor(COLORS.dark)
    .fontSize(9)
    .font("Helvetica")
    .text("GREENGUARD AI", 50, 50, { characterSpacing: 1.5 });
  doc
    .fillColor(COLORS.muted)
    .fontSize(8)
    .text("Environmental Policy Decision Intelligence Platform", 50, 62);

  doc
    .fillColor(COLORS.dark)
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(`Policy Simulation Report`, 50, 90);
  doc
    .fillColor(COLORS.primary)
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(`${input.cityName}, ${input.country}`, 50, 118);

  doc
    .fillColor(COLORS.muted)
    .fontSize(9)
    .font("Helvetica")
    .text(`Scenario: ${input.presetName ?? input.scenarioName}`, 50, 138)
    .text(`Generated: ${input.generatedAt.toLocaleString()}`, 50, 151);

  doc.moveTo(50, 172).lineTo(545, 172).strokeColor(COLORS.border).lineWidth(1).stroke();
}

function renderExecutiveVerdict(doc: PDFKit.PDFDocument, input: PdfExportInput) {
  const y = 186;
  const color = verdictColor(input.executiveScores.verdict);
  doc.roundedRect(50, y, 495, 46, 6).fillColor(color).fillOpacity(0.08).fill();
  doc.fillOpacity(1);
  doc
    .fillColor(color)
    .fontSize(15)
    .font("Helvetica-Bold")
    .text(input.executiveScores.verdict.toUpperCase(), 65, y + 12, { characterSpacing: 0.5 });
  doc
    .fillColor(COLORS.dark)
    .fontSize(9)
    .font("Helvetica")
    .text(`Overall Decision Score: ${input.executiveScores.overallScore}/100`, 65, y + 30);
  doc
    .fillColor(COLORS.muted)
    .fontSize(8)
    .text("Suitable for executive review and policy-readiness assessment", 300, y + 18, {
      width: 230,
      align: "right",
    });
}

function renderKpiCards(doc: PDFKit.PDFDocument, input: PdfExportInput) {
  const y = 248;
  const cards: Array<{ label: string; value: string; delta?: string; positive?: boolean }> = [
    {
      label: "PROJECTED AQI",
      value: String(input.results.projectedAqi),
      delta: `${input.results.aqiDelta > 0 ? "+" : ""}${input.results.aqiDelta} vs baseline ${input.baselineAqi}`,
      positive: input.results.aqiDelta < 0,
    },
    {
      label: "ECOSCORE",
      value: `${input.results.projectedEcoScore}/100`,
      delta: `${input.results.ecoScoreDelta > 0 ? "+" : ""}${input.results.ecoScoreDelta} vs baseline ${input.baselineEco}`,
      positive: input.results.ecoScoreDelta > 0,
    },
    { label: "SUSTAINABILITY INDEX", value: `${input.results.sustainabilityIndex}/100` },
    { label: "CARBON REDUCTION", value: `${input.results.carbonReductionTons} tCO2e` },
  ];

  const cardWidth = 117;
  const gap = 13;
  cards.forEach((card, i) => {
    const x = 50 + i * (cardWidth + gap);
    doc.roundedRect(x, y, cardWidth, 70, 5).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc
      .fillColor(COLORS.muted)
      .fontSize(7)
      .font("Helvetica")
      .text(card.label, x + 10, y + 12, { width: cardWidth - 20, characterSpacing: 0.3 });
    doc
      .fillColor(COLORS.dark)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(card.value, x + 10, y + 26, { width: cardWidth - 20 });
    if (card.delta) {
      doc
        .fillColor(card.positive ? COLORS.good : COLORS.muted)
        .fontSize(7)
        .font("Helvetica")
        .text(card.delta, x + 10, y + 50, { width: cardWidth - 20 });
    }
  });
}

function renderLeverTable(doc: PDFKit.PDFDocument, input: PdfExportInput) {
  let y = 340;
  doc
    .fillColor(COLORS.dark)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Policy Levers Applied", 50, y);
  y += 18;

  const entries = Object.entries(input.levers) as Array<[keyof SimulationLevers, number]>;
  const colWidth = 247;
  entries.forEach(([key, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 50 + col * (colWidth + 1);
    const rowY = y + row * 18;
    const bound = LEVER_BOUNDS[key];
    doc
      .fillColor(COLORS.muted)
      .fontSize(8.5)
      .font("Helvetica")
      .text(bound.label, x, rowY, { width: colWidth - 60 });
    doc
      .fillColor(COLORS.dark)
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .text(`${value}${bound.unit}`, x + colWidth - 60, rowY, { width: 60, align: "right" });
  });
}

function renderMetricsTable(doc: PDFKit.PDFDocument, input: PdfExportInput) {
  let y = 440;
  doc
    .fillColor(COLORS.dark)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Projected Environmental Metrics", 50, y);
  y += 18;

  const rows: Array<[string, string]> = [
    ["PM2.5", `${input.results.projectedPm25} µg/m³ (Δ ${input.results.pm25Delta})`],
    ["PM10", `${input.results.projectedPm10} µg/m³ (Δ ${input.results.pm10Delta})`],
    [
      "Environmental Risk Score",
      `${input.results.projectedRiskScore}/100 (Δ ${input.results.riskScoreDelta})`,
    ],
    [
      "Water Quality Index",
      `${input.results.projectedWaterQuality}/100 (Δ ${input.results.waterQualityDelta})`,
    ],
    ["Public Health Score", `${input.results.healthScore}/100`],
  ];

  rows.forEach(([label, value], i) => {
    const rowY = y + i * 16;
    if (i % 2 === 0)
      doc
        .rect(50, rowY - 3, 495, 16)
        .fillColor(COLORS.bg)
        .fill();
    doc
      .fillColor(COLORS.muted)
      .fontSize(8.5)
      .font("Helvetica")
      .text(label, 60, rowY, { width: 250 });
    doc
      .fillColor(COLORS.dark)
      .fontSize(8.5)
      .font("Helvetica-Bold")
      .text(value, 310, rowY, { width: 225, align: "right" });
  });
}

function renderBriefing(doc: PDFKit.PDFDocument, briefing: ExecutiveBriefing) {
  let y = doc.y + 30;
  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  doc.fillColor(COLORS.dark).fontSize(11).font("Helvetica-Bold").text("Executive Summary", 50, y);
  y += 16;
  doc
    .fillColor(COLORS.muted)
    .fontSize(8.5)
    .font("Helvetica")
    .text(briefing.executiveSummary, 50, y, { width: 495, lineGap: 2 });
  y = doc.y + 14;

  doc.fillColor(COLORS.dark).fontSize(10).font("Helvetica-Bold").text("Key Findings", 50, y);
  y = doc.y + 4;
  briefing.keyFindings.forEach((f) => {
    doc
      .fillColor(COLORS.muted)
      .fontSize(8.5)
      .font("Helvetica")
      .text(`•  ${f}`, 55, doc.y, { width: 490, lineGap: 2 });
  });
  y = doc.y + 10;

  doc
    .fillColor(COLORS.dark)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Government Recommendations", 50, y);
  y = doc.y + 4;
  briefing.governmentRecommendations.forEach((r) => {
    doc
      .fillColor(COLORS.muted)
      .fontSize(8.5)
      .font("Helvetica")
      .text(`•  ${r}`, 55, doc.y, { width: 490, lineGap: 2 });
  });
}

function renderFooter(doc: PDFKit.PDFDocument, input: PdfExportInput) {
  doc
    .fillColor(COLORS.muted)
    .fontSize(7)
    .font("Helvetica")
    .text(
      `Generated by GreenGuard AI — Environmental Policy Simulator. Figures are model-based projections derived from a deterministic simulation engine and should be validated against on-ground data before final policy adoption.`,
      50,
      760,
      { width: 495, align: "center" },
    );
}
