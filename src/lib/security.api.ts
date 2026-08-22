import client from "./api/client";

export interface SecurityStatus {
  email: { verified: boolean; verifiedAt: string | null };
  phone: { verified: boolean };
  passwordLastChangedAt: string | null;
  activeSessionCount: number;
  lastSuccessfulLogin: string | null;
  twoFactorAuthentication: string;
}

export interface SecuritySession {
  sessionId: string;
  isCurrentSession: boolean;
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
  createdAt: string;
  lastActive: string;
}

export interface LoginHistoryEntry {
  device?: string;
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
  loginStatus: "SUCCESS" | "FAILED";
  createdAt: string;
}

export interface SecurityEventEntry {
  action: string;
  result: "SUCCESS" | "FAILURE";
  device?: string;
  timestamp: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type LoginHistoryFilter = "all" | "successful" | "failed";

export const securityApi = {
  getStatus: () =>
    client
      .get<{ success: boolean; data: SecurityStatus }>("/security/status")
      .then((r: { data: { success: boolean; data: SecurityStatus } }) => r.data),

  getSessions: () =>
    client
      .get<{ success: boolean; data: { sessions: SecuritySession[] } }>("/security/sessions")
      .then((r: { data: { success: boolean; data: { sessions: SecuritySession[] } } }) => r.data),

  revokeSession: (sessionId: string) =>
    client.post(`/security/sessions/${sessionId}/revoke`).then((r: { data: any }) => r.data),

  logoutAllOtherSessions: () =>
    client
      .post<{ success: boolean; data: { revokedCount: number } }>("/security/sessions/logout-all")
      .then((r: { data: { success: boolean; data: { revokedCount: number } } }) => r.data),

  getLoginHistory: (page = 1, limit = 10, filter: LoginHistoryFilter = "all") =>
    client
      .get<{ success: boolean; data: { history: LoginHistoryEntry[]; pagination: Pagination } }>(
        "/security/history",
        {
          params: { page, limit, filter },
        },
      )
      .then(
        (r: {
          data: {
            success: boolean;
            data: { history: LoginHistoryEntry[]; pagination: Pagination };
          };
        }) => r.data,
      ),

  getSecurityEvents: (page = 1, limit = 10) =>
    client
      .get<{ success: boolean; data: { events: SecurityEventEntry[]; pagination: Pagination } }>(
        "/security/events",
        {
          params: { page, limit },
        },
      )
      .then(
        (r: {
          data: {
            success: boolean;
            data: { events: SecurityEventEntry[]; pagination: Pagination };
          };
        }) => r.data,
      ),

  // Phase 6 — secure email change with OTP. Errors (cooldown/invalid/etc.)
  // arrive as rejected promises via axios, not as resolved values — the
  // structured `data.attemptsRemaining` / `data.retryAfterSeconds` the
  // backend sends alongside a 400/429 is read from err.response.data by
  // the caller, same pattern as every other mutation error in this app.
  sendEmailChangeOtp: (newEmail: string) =>
    client
      .post<{ success: boolean; message: string }>("/security/email/send-otp", { newEmail })
      .then((r: { data: { success: boolean; message: string } }) => r.data),

  verifyEmailChangeOtp: (newEmail: string, otp: string) =>
    client
      .post<{ success: boolean; message: string; data: { user: Record<string, unknown> } }>(
        "/security/email/verify-otp",
        { newEmail, otp },
      )
      .then(
        (r: {
          data: { success: boolean; message: string; data: { user: Record<string, unknown> } };
        }) => r.data,
      ),

  // Phase 7 — phone verification. smsSent will be false until an SMS
  // provider is configured; the UI checks this flag and displays an honest
  // message rather than claiming a code was delivered.
  sendPhoneVerificationOtp: () =>
    client
      .post<{ success: boolean; message: string; data: { smsSent: boolean; reason?: string; widgetId?: string } }>(
        "/security/phone/send-otp",
      )
      .then(
        (r: {
          data: { success: boolean; message: string; data: { smsSent: boolean; reason?: string; widgetId?: string } };
        }) => r.data,
      ),

  verifyPhoneVerificationOtp: (
    payload: string | { otp?: string; accessToken?: string; token?: string },
  ) =>
    client
      .post<{ success: boolean; message: string }>(
        "/security/phone/verify-otp",
        typeof payload === "string" ? { otp: payload } : payload,
      )
      .then((r: { data: { success: boolean; message: string } }) => r.data),

  deactivateAccount: (password: string) =>
    client
      .post<{ success: boolean; message: string }>("/security/deactivate-account", { password })
      .then((r: { data: { success: boolean; message: string } }) => r.data),

  // Phase 9/10 — 2FA management
  getTwoFactorStatus: () =>
    client
      .get<{
        success: boolean;
        data: { enabled: boolean; method: string | null; backupCodesGeneratedAt: string | null };
      }>("/security/2fa/status")
      .then((r: { data: any }) => r.data),

  initiateTwoFactorSetup: (password: string) =>
    client
      .post<{
        success: boolean;
        data: { uri: string; qrCodeDataUrl: string; displayKey: string; secret: string };
      }>("/security/2fa/setup", { password })
      .then((r: { data: any }) => r.data),

  verifyTwoFactorSetup: (code: string) =>
    client
      .post<{ success: boolean; message: string; data: { recoveryCodes: string[] } }>(
        "/security/2fa/verify-setup",
        { code },
      )
      .then((r: { data: any }) => r.data),

  disableTwoFactor: (password: string, code: string, useRecoveryCode = false) =>
    client
      .post<{ success: boolean; message: string }>("/security/2fa/disable", {
        password,
        code,
        useRecoveryCode,
      })
      .then((r: { data: any }) => r.data),

  regenerateRecoveryCodes: (password: string) =>
    client
      .post<{ success: boolean; message: string; data: { recoveryCodes: string[] } }>(
        "/security/2fa/recovery-codes/regenerate",
        { password },
      )
      .then((r: { data: any }) => r.data),
};
