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

export const commandApi = {
  // Executive Overview tab
  getExecutiveDashboard: () => client.get("/command/executive-dashboard").then((r) => r.data),

  // Complaint Intelligence tab
  getComplaintIntelligence: () => client.get("/command/complaint-intelligence").then((r) => r.data),

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
