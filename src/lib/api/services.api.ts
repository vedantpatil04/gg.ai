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

  /** Phase 3C — admin approves resolution → complaint becomes closed. */
  verifyResolution: (id: string) => client.post(`/complaints/${id}/verify`).then((r) => r.data),

  /** Phase 3C — admin rejects resolution → complaint returns to authority as rework. */
  requestRework: (id: string, data: { reason: string; comments?: string }) =>
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

// ─── AI Copilot ───────────────────────────────────────────────────────────────
export const copilotApi = {
  chat: (question: string, cityId: string, sessionId?: string) =>
    client.post("/copilot/chat", { question, cityId, sessionId }).then((r) => r.data),
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

export const healthApi = {
  check: () => client.get("/health").then((r) => r.data),
};
