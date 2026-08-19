import client from "./client";

export interface ExecutiveDashboardData {
  scores: {
    environmentalHealthIndex: number;
    smartCityScore: number;
    sustainabilityScore: number;
    environmentalRiskScore: number;
  };
  network: {
    cityCount: number;
    avgAqi: number;
    avgRisk: number;
    avgEco: number;
    avgCarbon: number;
    avgWater: number;
  };
  alerts: { active: number };
  complaints: { open: number; resolved: number };
  highRiskCities: Array<{ cityId: string; cityName: string; aqi: number; risk: number }>;
  cityRankings: Array<{
    rank: number;
    cityId: string;
    cityName: string;
    country: string;
    aqi: number;
    pm25: number;
    risk: number;
    eco: number;
    carbon: number;
    water: number;
  }>;
  generatedAt: string;
}

export interface ComplaintIntelligenceData {
  summary: { total: number; resolved: number; resolutionRate: number };
  byCategory: Array<{ issueType: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  cityStats: Array<{
    cityId: string;
    total: number;
    resolved: number;
    pending: number;
    critical: number;
    resolutionRate: number;
  }>;
  highRiskAreas: Array<{
    cityId: string;
    total: number;
    pending: number;
    critical: number;
    resolutionRate: number;
  }>;
  repeatedIssues: Array<{ issueType: string; count: number }>;
  trend: Array<{ date: string; total: number; resolved: number }>;
  generatedAt: string;
}

export interface TrendIntelligenceData {
  granularity: string;
  aqiTrend: Array<{
    period: string;
    avgAqi: number;
    avgPm25: number;
    avgPm10: number;
    avgRisk: number;
    avgEco: number;
    avgCarbon: number;
  }>;
  complaintTrend: Array<{ period: string; total: number; resolved: number }>;
  alertTrend: Array<{ period: string; total: number; critical: number }>;
  generatedAt: string;
}

export interface AuthorityActionsData {
  actionPlans: Array<{
    cityId: string;
    cityName: string;
    country: string;
    currentAqi: number;
    currentRisk: number;
    activeAlerts: number;
    pendingComplaints: number;
    plan: {
      urgencyLevel: "Immediate" | "High" | "Moderate" | "Routine";
      treePlantationTarget: string;
      trafficOptimization: string[];
      wasteManagement: string[];
      inspectionSchedule: string[];
      emergencyInterventions: string[];
      estimatedAqiImprovement: string;
      timeframe: string;
    };
  }>;
  generatedAt: string;
}

export interface ExecutiveReportData {
  report: {
    title: string;
    period: string;
    executiveSummary: string;
    networkHealthAssessment: string;
    keyFindings: string[];
    cityPerformanceHighlights: string[];
    actionItems: string[];
    recommendations: string[];
    conclusion: string;
  };
  kpis: {
    cityCount: number;
    avgAqi: number;
    avgRisk: number;
    avgEco: number;
    activeAlerts: number;
    totalComplaints: number;
    resolvedComplaints: number;
    resolutionRate: number;
  };
  chartData: {
    aqiRanking: Array<{ city: string; aqi: number; pm25: number; risk: number; eco: number }>;
  };
  generatedAt: string;
}

// ─── Authority Analytics (Phase 8) ───────────────────────────────────────────
// Authority-scoped complaint/workload analytics — distinct from the
// network-wide ComplaintIntelligenceData above.
export interface AuthorityAnalyticsData {
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
  trend: Array<{ date: string; submitted: number; resolved: number; closed: number; rework: number }>;
  generatedAt: string;
}

export interface OfficerSummary {
  id: string;
  name: string;
  email: string;
  designation?: string;
  department?: string;
  assignedCities: string[];
  availability: "available" | "busy" | "on_leave" | "inactive";
  activeCaseCount: number;
  totalCaseCount: number;
}

export interface CityCoverageSummary {
  cityId: string;
  cityName: string;
  officerCount: number;
  availableOfficerCount: number;
  activeComplaintCount: number;
  hasGap: boolean;
}

export interface BoardWorkloadSummary {
  totalAssigned: number;
  inProgress: number;
  rework: number;
  awaitingReview: number;
  resolved: number;
  closed: number;
}

export interface BoardOperationalContextData {
  organization: string;
  department?: string;
  jurisdiction: string[];
  totalOfficers: number;
  availability: {
    available: number;
    busy: number;
    on_leave: number;
    inactive: number;
  };
  officers: OfficerSummary[];
  workload: BoardWorkloadSummary;
  jurisdictionCoverage: CityCoverageSummary[];
  coverageGaps: Array<{ cityId: string; cityName: string; reason: string }>;
  boardStatus: "optimal" | "warning" | "critical";
  self: {
    id: string;
    name: string;
    availability: "available" | "busy" | "on_leave" | "inactive";
    department?: string;
    assignedCities: string[];
    myActiveCases: number;
    myTotalCases: number;
  };
}

export const commandApi = {
  // Authority Board Automation (Automation 4)
  getBoardContext: () =>
    client
      .get<{ success: boolean; data: { boardContext: BoardOperationalContextData } }>(
        "/command/board-context",
      )
      .then((r) => r.data),

  updateAvailability: (availability: "available" | "busy" | "on_leave" | "inactive") =>
    client
      .patch<{ success: boolean; data: { availability: string; gapTriggered?: boolean } }>(
        "/command/availability",
        { availability },
      )
      .then((r) => r.data),

  // Executive Overview tab
  getExecutiveDashboard: () => client.get("/command/executive-dashboard").then((r) => r.data),

  // Complaint Intelligence tab
  getComplaintIntelligence: () => client.get("/command/complaint-intelligence").then((r) => r.data),

  // Authority Analytics — "My Workload" tab (Phase 8)
  getAuthorityAnalytics: (days: 7 | 30 | 90 = 30) =>
    client.get("/command/authority-analytics", { params: { days } }).then((r) => r.data),

  // Complaint Operations Report PDF export (Phase 8)
  exportOperationsReportPdf: (days: 7 | 30 | 90 = 30) =>
    client
      .get("/command/export-operations-report-pdf", { params: { days }, responseType: "blob" })
      .then((r) => r.data as Blob),

  // Trend Intelligence tab
  getTrendIntelligence: (granularity: "daily" | "weekly" | "monthly" = "daily") =>
    client.get("/command/trend-intelligence", { params: { granularity } }).then((r) => r.data),

  // Authority Actions tab
  getAuthorityActions: () => client.get("/command/authority-actions").then((r) => r.data),

  // Executive Reports tab
  generateExecutiveReport: (data: {
    type: "Weekly" | "Monthly" | "Sustainability" | "City";
    cityId?: string;
  }) => client.post("/command/generate-executive-report", data).then((r) => r.data),

  // PDF Export — returns a Blob for browser download (Phase 6.1)
  exportReportPdf: (data: {
    type: "Weekly" | "Monthly" | "Sustainability" | "City";
    cityId?: string;
  }) =>
    client
      .post("/command/export-report-pdf", data, { responseType: "blob" })
      .then((r) => r.data as Blob),

  // Gemini intelligence panel
  getGeminiIntelligence: (data: {
    type:
      | "executive-summary"
      | "environmental-assessment"
      | "risk-analysis"
      | "city-performance"
      | "sustainability"
      | "recommendations";
    cityId?: string;
  }) => client.post("/command/gemini-intelligence", data).then((r) => r.data),
};
