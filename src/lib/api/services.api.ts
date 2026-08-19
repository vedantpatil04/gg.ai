import client from "./client";

// ─── Complaints ───────────────────────────────────────────────────────────────
export const complaintApi = {
  create: (data: {
    title: string;
    description: string;
    issueType: string;
    severity?: string;
    cityId: string;
    location?: { address?: string; lat?: number; lng?: number };
  }) => client.post("/complaints", data).then((r) => r.data),

  getAll: (params?: {
    cityId?: string;
    status?: string;
    severity?: string;
    issueType?: string;
    assignedTo?: string;
    unassigned?: string;
    page?: number;
    limit?: number;
  }) => client.get("/complaints", { params }).then((r) => r.data),

  getAssigned: (params?: { status?: string; page?: number; limit?: number }) =>
    client
      .get("/complaints", { params: { ...params, assignedTo: "me", limit: 200 } })
      .then((r) => r.data),

  getMine: () => client.get("/complaints/mine").then((r) => r.data),
  getOne: (id: string) => client.get(`/complaints/${id}`).then((r) => r.data),

  update: (id: string, data: { status?: string; resolution?: string; assignedTo?: string }) =>
    client.patch(`/complaints/${id}`, data).then((r) => r.data),

  delete: (id: string) => client.delete(`/complaints/${id}`).then((r) => r.data),

  uploadImages: (id: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("images", f, f.name));
    return client.post(`/complaints/${id}/images`, fd).then((r) => r.data);
  },

  removeImage: (id: string, imageUrl: string) =>
    client.delete(`/complaints/${id}/images`, { data: { imageUrl } }).then((r) => r.data),

  updateNotes: (id: string, notes: string) =>
    client.patch(`/complaints/${id}/notes`, { notes }).then((r) => r.data),

  verifyResolution: (id: string) => client.post(`/complaints/${id}/verify`).then((r) => r.data),
  acceptResolution: (id: string) => client.post(`/complaints/${id}/verify`).then((r) => r.data),

  requestRework: (id: string, data: { reason: string; comments?: string }) =>
    client.post(`/complaints/${id}/rework`, data).then((r) => r.data),
  citizenRequestRework: (id: string, data: { reason: string; comments?: string }) =>
    client.post(`/complaints/${id}/rework`, data).then((r) => r.data),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertApi = {
  getForCity: (cityId: string, params?: { status?: string; page?: number }) =>
    client.get(`/alerts/${cityId}`, { params }).then((r) => r.data),
  getActive: (cityId?: string) =>
    client.get("/alerts/active", { params: cityId ? { cityId } : {} }).then((r) => r.data),
  create: (data: {
    title: string;
    description: string;
    severity: string;
    category: string;
    cityId: string;
    area: string;
  }) => client.post("/alerts", data).then((r) => r.data),
  acknowledge: (id: string) => client.patch(`/alerts/${id}/acknowledge`).then((r) => r.data),
  resolve: (id: string) => client.patch(`/alerts/${id}/resolve`).then((r) => r.data),
  explain: (id: string) => client.get(`/alerts/explain/${id}`).then((r) => r.data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportApi = {
  getAll: (params?: { cityId?: string; type?: string; page?: number; limit?: number }) =>
    client.get("/reports", { params }).then((r) => r.data),
  getOne: (id: string) => client.get(`/reports/${id}`).then((r) => r.data),
  getStats: (cityId?: string) =>
    client.get("/reports/stats", { params: cityId ? { cityId } : {} }).then((r) => r.data),
  create: (data: {
    title: string;
    type: string;
    cityId: string;
    metrics?: Record<string, unknown>;
    tags?: string[];
  }) => client.post("/reports", data).then((r) => r.data),
  generateAI: (data: {
    type: "Daily" | "Weekly" | "Monthly" | "City" | "Sustainability";
    cityId: string;
    save?: boolean;
  }) => client.post("/reports/generate-ai-report", data).then((r) => r.data),
  download: (id: string) =>
    client.get(`/reports/${id}/download`, { responseType: "blob" }).then((r) => r.data as Blob),
};

export interface EnvironmentInsightResponse {
  question: string;
  answer: string;
  cityId: string;
  cityName: string;
  hasVerifiedTrend: boolean;
  hasLocationContext: boolean;
  timestamp: string;
}

export const copilotApi = {
  // `provider` is optional and Phase-2-only — every existing caller
  // (Dashboard, Map, Forecast, legacy /intelligence, and Copilot itself
  // before a user switches models) omits it and gets unchanged Gemini
  // behavior server-side.
  chat: (question: string, cityId: string, sessionId?: string, provider?: string) =>
    client.post("/copilot/chat", { question, cityId, sessionId, provider }).then((r) => r.data),
  // PHASE 2 — Intelligence Center Assistant model selector: which AI
  // providers are actually configured server-side right now.
  getProviders: () => client.get("/copilot/providers").then((r) => r.data),
  // PHASE 5 — GreenGuard Intelligence Center: Sustainability-page-only chat.
  // Hits a dedicated backend route/handler grounded in the same transparent
  // EcoScore engine and Phase 4 historical data the page renders from — see
  // sustainabilityChat in copilot.controller.ts. The generic chat() above is
  // left untouched for its other callers (Dashboard, Map, Forecast,
  // Intelligence, the standalone Copilot page).
  sustainabilityChat: (question: string, cityId: string, sessionId?: string) =>
    client.post("/copilot/sustainability-chat", { question, cityId, sessionId }).then((r) => r.data),
  healthAdvice: (cityId: string) =>
    client.post("/copilot/health-advice", { cityId }).then((r) => r.data),
  cityInsights: (city: string) =>
    client.get(`/copilot/cities/${city}/ai-insights`).then((r) => r.data),
  ask: (question: string, cityId: string) =>
    client.post("/copilot/ask", { question, cityId }).then((r) => r.data),
  getRecommendations: (cityId: string) =>
    client.get("/copilot/recommendations", { params: { cityId } }).then((r) => r.data),
  getInsights: (cityId: string) =>
    client.get("/copilot/insights", { params: { cityId } }).then((r) => r.data),
  environmentInsight: (
    question: string,
    cityId: string,
    locationId?: string,
  ): Promise<{ success: boolean; data: EnvironmentInsightResponse }> =>
    client
      .post("/copilot/environment-insight", { question, cityId, locationId })
      .then((r) => r.data),
};

// ─── Policy Simulator ─────────────────────────────────────────────────────────
export const simulatorApi = {
  run: (data: {
    cityId: string;
    levers: Record<string, number>;
    name?: string;
    presetId?: string;
  }) => client.post("/simulator/run", data).then((r) => r.data),
  aiAnalysis: (data: {
    cityId: string;
    levers: Record<string, number>;
    results: Record<string, unknown>;
  }) => client.post("/simulator/ai-analysis", data).then((r) => r.data),
  getHistory: () => client.get("/simulator/history").then((r) => r.data),
  getPresets: () => client.get("/simulator/presets").then((r) => r.data),
  compare: (data: {
    cityId: string;
    scenarioA: { name?: string; levers?: Record<string, number>; presetId?: string };
    scenarioB: { name?: string; levers?: Record<string, number>; presetId?: string };
  }) => client.post("/simulator/compare", data).then((r) => r.data),
  getById: (id: string) => client.get(`/simulator/${id}`).then((r) => r.data),
  exportPdf: (data: {
    simulationId?: string;
    cityId?: string;
    levers?: Record<string, number>;
    presetId?: string;
  }) =>
    client.post("/simulator/export", data, { responseType: "blob" }).then((r) => r.data as Blob),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => client.get("/admin/stats").then((r) => r.data),
  getAISummary: () => client.get("/admin/ai-summary").then((r) => r.data),
  getUsers: (params?: { role?: string; page?: number; limit?: number; isActive?: boolean }) =>
    client.get("/admin/users", { params }).then((r) => r.data),
  updateUser: (id: string, data: { role?: string; isActive?: boolean }) =>
    client.patch(`/admin/users/${id}`, data).then((r) => r.data),
  deleteUser: (id: string) => client.delete(`/admin/users/${id}`).then((r) => r.data),
  getCities: () => client.get("/admin/cities").then((r) => r.data),
  getAuthorityRequests: (params?: {
    status?: "pending" | "approved" | "rejected";
    page?: number;
    limit?: number;
  }) => client.get("/admin/authority-requests", { params }).then((r) => r.data),
  approveAuthorityRequest: (id: string) =>
    client.patch(`/admin/authority-requests/${id}/approve`).then((r) => r.data),
  rejectAuthorityRequest: (id: string) =>
    client.patch(`/admin/authority-requests/${id}/reject`).then((r) => r.data),
  getWorkload: () => client.get("/admin/workload").then((r) => r.data),
};

// ─── Phase 4 — Enterprise Authority Management API ────────────────────────────
export const authorityMgmtApi = {
  // Intelligence dashboard
  getDashboard: () =>
    client.get("/admin/authorities/dashboard").then((r) => r.data),

  // Directory
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    approvalStatus?: string;
    isActive?: boolean;
    city?: string;
    availability?: string;
    sortBy?: string;
    sortDir?: "asc" | "desc";
  }) => client.get("/admin/authorities", { params }).then((r) => r.data),

  // Single authority
  getOne: (id: string) => client.get(`/admin/authorities/${id}`).then((r) => r.data),

  // Update profile fields
  updateProfile: (
    id: string,
    data: {
      department?: string;
      designation?: string;
      employeeId?: string;
      specializations?: string[];
      availability?: string;
      organization?: string;
      phone?: string;
    },
  ) => client.patch(`/admin/authorities/${id}`, data).then((r) => r.data),

  // City assignment
  assignCities: (id: string, cities: string[], primaryCity?: string) =>
    client.post(`/admin/authorities/${id}/cities`, { cities, primaryCity }).then((r) => r.data),
  removeCities: (id: string, cities: string[]) =>
    client.delete(`/admin/authorities/${id}/cities`, { data: { cities } }).then((r) => r.data),
  setPrimaryCity: (id: string, primaryCity: string) =>
    client.patch(`/admin/authorities/${id}/primary-city`, { primaryCity }).then((r) => r.data),

  // Lifecycle
  performLifecycleAction: (
    id: string,
    action: "activate" | "deactivate" | "suspend" | "reinstate" | "lock" | "unlock",
  ) => client.post(`/admin/authorities/${id}/lifecycle`, { action }).then((r) => r.data),
  getLifecycleHistory: (id: string) =>
    client.get(`/admin/authorities/${id}/lifecycle`).then((r) => r.data),

  // Bulk
  bulk: (data: {
    action: "activate" | "deactivate" | "assign_cities" | "remove_cities";
    ids: string[];
    cities?: string[];
  }) => client.post("/admin/authorities/bulk", data).then((r) => r.data),
};

export const healthApi = {
  check: () => client.get("/health").then((r) => r.data),
};

// ─── Messages (Complaint-scoped) ─────────────────────────────────────────────
export { messageApi, type MessageRecord } from "./message.api";
