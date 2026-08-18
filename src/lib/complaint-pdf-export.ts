/**
 * complaint-pdf-export.ts
 *
 * Official Environmental Complaint Report PDF Generator for GreenGuard AI Citizen Hub.
 *
 * Generates an official, publication-ready PDF document for complaints (especially
 * completed / closed / resolved complaints).
 * Uses jsPDF + jspdf-autotable, compatible with mobile viewports, Android Chrome,
 * and desktop browsers.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { generateAndDownloadPdf, ReportDownloadError } from "./download-file";
import { humanizeIssueType, humanizeEventType, getStatusMeta, getSeverityMeta } from "@/components/citizen/citizen-status-utils";
import type { CitizenComplaint } from "@/components/citizen/citizen-queries";

export interface GenerateComplaintPdfOptions {
  complaint: CitizenComplaint;
  cityName?: string;
}

export async function exportComplaintPdf({
  complaint,
  cityName,
}: GenerateComplaintPdfOptions): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const PW = 210; // Page width in mm
  const PH = 297; // Page height in mm
  const margin = 14;

  // GreenGuard Civic Palette
  const BRAND: [number, number, number] = [13, 94, 76]; // Deep forest teal
  const BRAND_DARK: [number, number, number] = [8, 58, 47];
  const ACCENT: [number, number, number] = [34, 197, 144]; // Green accent
  const INK: [number, number, number] = [22, 31, 38];
  const MUTED: [number, number, number] = [100, 115, 125];
  const LINE: [number, number, number] = [220, 228, 230];
  const BG_SOFT: [number, number, number] = [244, 248, 246];

  const reportRef = `GG-CMP-${complaint._id.slice(-8).toUpperCase()}`;
  const generatedDateStr = format(new Date(), "MMMM d, yyyy 'at' h:mm a");
  const statusMeta = getStatusMeta(complaint.status);
  const severityMeta = getSeverityMeta(complaint.severity);

  // Helper for drawing header on every page
  const drawPageHeader = (pageNumber: number, totalPages?: number) => {
    // Top banner bar
    doc.setFillColor(...BRAND);
    doc.rect(0, 0, PW, 7, "F");

    // Brand tag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND);
    doc.text("GREENGUARD AI", margin, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("CIVIC ENVIRONMENTAL SERVICE PLATFORM", margin + 30, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Record Ref: ${reportRef}`, PW - margin, 14, { align: "right" });

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(margin, 17, PW - margin, 17);
  };

  const drawPageFooter = (pageNumber: number, totalPages: number) => {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(margin, PH - 14, PW - margin, PH - 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "Official Civic Record — GreenGuard AI Environmental Protection System",
      margin,
      PH - 9,
    );
    doc.text(`Page ${pageNumber} of ${totalPages}`, PW - margin, PH - 9, { align: "right" });
  };

  // --- PAGE 1: TITLE & SUMMARY ---
  drawPageHeader(1);

  // Report Title Box
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(margin, 22, PW - margin * 2, 28, 2, 2, "F");
  doc.setDrawColor(...LINE);
  doc.roundedRect(margin, 22, PW - margin * 2, 28, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text("Environmental Complaint Report", margin + 6, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Official Case File: ${reportRef} · City: ${cityName || complaint.cityId || "Assigned Jurisdiction"}`, margin + 6, 38);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Generated: ${generatedDateStr}`, margin + 6, 44);

  // Status Badge on right of banner
  doc.setFillColor(
    complaint.status === "closed" ? 34 : complaint.status === "resolved" ? 13 : 210,
    complaint.status === "closed" ? 160 : complaint.status === "resolved" ? 94 : 140,
    complaint.status === "closed" ? 90 : complaint.status === "resolved" ? 76 : 40,
  );
  doc.roundedRect(PW - margin - 52, 27, 46, 9, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(statusMeta.label.toUpperCase(), PW - margin - 29, 33, { align: "center" });

  // Section 1: Complaint Details Table
  let cursorY = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text("1. Case Overview & Status", margin, cursorY);
  cursorY += 4;

  const complainantName =
    typeof complaint.submittedBy === "object" && complaint.submittedBy?.name
      ? complaint.submittedBy.name
      : "Verified Resident";
  const complainantContact =
    typeof complaint.submittedBy === "object" && complaint.submittedBy?.email
      ? complaint.submittedBy.email
      : "Protected for Privacy";

  const assignedAuth = complaint.assignedTo as { name?: string; email?: string; phone?: string } | null;
  const authorityName = assignedAuth?.name ?? (complaint.assignedByName || "Environmental Response Unit");

  const overviewRows = [
    ["Case Title", complaint.title || `${humanizeIssueType(complaint.issueType)} Report`],
    ["Category / Issue Type", humanizeIssueType(complaint.issueType)],
    ["Priority Assessment", `${severityMeta.label} Priority`],
    ["Current Lifecycle State", statusMeta.label],
    ["Date Submitted", format(new Date(complaint.createdAt), "MMMM d, yyyy 'at' h:mm a")],
    ["Last Updated", format(new Date(complaint.updatedAt), "MMMM d, yyyy 'at' h:mm a")],
    ["Reported By", `${complainantName} (${complainantContact})`],
    ["Assigned Authority", authorityName],
  ];

  if (complaint.resolvedAt) {
    overviewRows.push(["Resolution Date", format(new Date(complaint.resolvedAt), "MMMM d, yyyy 'at' h:mm a")]);
  }
  if (complaint.verifiedAt) {
    overviewRows.push(["Verification Date", format(new Date(complaint.verifiedAt), "MMMM d, yyyy 'at' h:mm a")]);
  }

  autoTable(doc, {
    startY: cursorY,
    head: [["Attribute", "Details"]],
    body: overviewRows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.8, textColor: INK, lineColor: LINE },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: [248, 250, 249] },
      1: { cellWidth: PW - margin * 2 - 50 },
    },
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Location & Description
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text("2. Location & Observed Issue", margin, cursorY);
  cursorY += 4;

  const locAddress = complaint.location?.address || "Address not provided (Location pinned in assigned city)";
  const locCoords =
    complaint.location?.lat && complaint.location?.lng
      ? `${complaint.location.lat.toFixed(5)}° N, ${complaint.location.lng.toFixed(5)}° E`
      : "Standard civic geocode recorded";

  const locationRows = [
    ["Reported Address / Landmark", locAddress],
    ["Geographical Coordinates", locCoords],
    ["Photographic Evidence", `${complaint.images?.length ?? 0} image(s) attached and archived on file`],
  ];

  autoTable(doc, {
    startY: cursorY,
    head: [["Location Property", "Value"]],
    body: locationRows,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2.8, textColor: INK, lineColor: LINE },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50, fillColor: [248, 250, 249] },
      1: { cellWidth: PW - margin * 2 - 50 },
    },
    margin: { left: margin, right: margin },
  });

  cursorY = (doc as any).lastAutoTable.finalY + 6;

  // Citizen's Description Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("Citizen Observation Details:", margin, cursorY);
  cursorY += 3.5;

  const descLines = doc.splitTextToSize(complaint.description || "No description provided.", PW - margin * 2 - 8);
  const descBoxHeight = Math.max(16, descLines.length * 4.2 + 8);

  // Page break check if needed
  if (cursorY + descBoxHeight > PH - 25) {
    doc.addPage();
    drawPageHeader(2);
    cursorY = 25;
  }

  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(margin, cursorY, PW - margin * 2, descBoxHeight, 1.5, 1.5, "F");
  doc.setDrawColor(...LINE);
  doc.roundedRect(margin, cursorY, PW - margin * 2, descBoxHeight, 1.5, 1.5, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(descLines, margin + 4, cursorY + 6);

  cursorY += descBoxHeight + 8;

  // Section 3: Official Resolution (if available)
  if (complaint.resolution || complaint.status === "closed" || complaint.status === "resolved") {
    if (cursorY + 40 > PH - 25) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      cursorY = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text("3. Official Authority Resolution", margin, cursorY);
    cursorY += 4;

    const resText = complaint.resolution || "Investigation completed and corrective environmental measures enacted by authority.";
    const resLines = doc.splitTextToSize(resText, PW - margin * 2 - 8);
    const resBoxHeight = Math.max(16, resLines.length * 4.2 + 8);

    doc.setFillColor(240, 252, 245);
    doc.roundedRect(margin, cursorY, PW - margin * 2, resBoxHeight, 1.5, 1.5, "F");
    doc.setDrawColor(34, 197, 144);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, cursorY, PW - margin * 2, resBoxHeight, 1.5, 1.5, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(resLines, margin + 4, cursorY + 6);

    cursorY += resBoxHeight + 8;
  }

  // Section 4: Lifecycle Event Timeline
  if (complaint.events && complaint.events.length > 0) {
    if (cursorY + 35 > PH - 25) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      cursorY = 25;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text("4. Case Lifecycle & Investigation Timeline", margin, cursorY);
    cursorY += 4;

    const timelineRows = complaint.events.map((evt) => [
      format(new Date(evt.timestamp), "MMM d, yyyy h:mm a"),
      humanizeEventType(evt.type),
      evt.userName || "System",
      evt.message || "Status updated",
    ]);

    autoTable(doc, {
      startY: cursorY,
      head: [["Timestamp", "Milestone", "Actor", "Notes / Action Taken"]],
      body: timelineRows,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, textColor: INK, lineColor: LINE },
      headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold", fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 34, fontStyle: "bold" },
        2: { cellWidth: 30 },
        3: { cellWidth: PW - margin * 2 - 102 },
      },
      margin: { left: margin, right: margin },
    });
  }

  // Apply footers to all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(p, totalPages);
  }

  const filename = `GreenGuard_Complaint_Report_${reportRef}.pdf`;
  const blob = doc.output("blob");

  await generateAndDownloadPdf(
    () => blob,
    filename,
    {
      generateFailed: "Could not build the complaint PDF report. Please try again.",
      saveFailed: "The report was created but could not be saved to your device.",
    },
  );
}
