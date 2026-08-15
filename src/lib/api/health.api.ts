import client from "./client";

export interface PlatformHealth {
  success: boolean;
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  aiEnabled: boolean;
  database: { connected: boolean; state: string };
}

// Public — no auth required (mirrors the backend's own /health, /api/health
// routes, which are mounted outside the authenticated routers).
export const healthApi = {
  get: () => client.get<PlatformHealth>("/health").then((r) => r.data),
};
