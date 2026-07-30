import client from "./client";

export type LoginPortal = "citizen" | "authority" | "admin";
export interface LoginPayload {
  email: string;
  password: string;
  portal: LoginPortal;
}
export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  organization?: string;
  phone?: string;
  city?: string;
}
export interface UpdateProfilePayload {
  name?: string;
  organization?: string;
  phone?: string;
  city?: string;
}

/** Shape returned by POST /auth/login */
export type LoginApiResponse =
  | {
      requires2FA: true;
      challengeToken: string;
      data?: undefined;
    }
  | {
      requires2FA?: false;
      challengeToken?: undefined;
      data: {
        user: import("../auth-context").AuthUser;
        accessToken: string;
        refreshToken: string;
      };
    };

export const authApi = {
  login: (data: LoginPayload) =>
    client.post<LoginApiResponse>("/auth/login", data).then((r) => r.data),

  signup: (data: SignupPayload) => client.post("/auth/signup", data).then((r) => r.data),

  logout: (refreshToken: string) =>
    client.post("/auth/logout", { refreshToken }).then((r) => r.data),

  getMe: () => client.get("/auth/me").then((r) => r.data),

  updateProfile: (data: UpdateProfilePayload) => client.patch("/auth/me", data).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.patch("/auth/me/password", { currentPassword, newPassword }).then((r) => r.data),

  forgotPassword: (email: string) =>
    client.post("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    client.post("/auth/reset-password", { token, password }).then((r) => r.data),

  // Phase 9: completes login for 2FA-enabled accounts.
  complete2FAChallenge: (challengeToken: string, code: string, useRecoveryCode = false) =>
    client
      .post("/auth/2fa-challenge", { challengeToken, code, useRecoveryCode })
      .then((r) => r.data),
};
