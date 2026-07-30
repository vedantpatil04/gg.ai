import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authApi, type LoginPortal } from "./api/auth.api";
import { setTokens, clearTokens } from "./api/client";
import { getRoleLandingPage } from "./role-routing";

export type UserRole = "citizen" | "authority" | "administrator";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Only meaningful for the "authority" role — see Phase 1.1 backend rules.
   *  Citizen/Administrator accounts are always "approved". */
  approvalStatus?: "approved" | "pending" | "rejected";
  organization?: string;
  phone?: string;
  city?: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  // Phase 3 — Personal Information. All optional: absent until the person
  // fills them in via the Edit Profile drawer.
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  addressLine?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  profileUpdatedAt?: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Set when the session is ended by a forced logout (e.g. an expired
   *  or invalid token), so the login page can show a friendly reason.
   *  Cleared once consumed. */
  authMessage: string | null;
}

export type LoginResult =
  | {
      requires2FA: true;
      challengeToken: string;
    }
  | AuthUser;

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string,
    portal: LoginPortal,
  ) => Promise<LoginResult>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organization?: string;
    phone?: string;
  }) => Promise<{ user: AuthUser; pending: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  refreshUser: () => Promise<void>;
  /** Consumes and clears the current authMessage (call after displaying it). */
  clearAuthMessage: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authMessage: null,
  login: async () => {
    throw new Error("AuthProvider not mounted");
  },
  signup: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: async () => {},
  updateProfile: async () => {},
  refreshUser: async () => {},
  clearAuthMessage: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    authMessage: null,
  });

  // Lets the gg:forbidden listener below (subscribed once) always read the
  // current user without re-subscribing on every state change.
  const userRef = useRef<AuthUser | null>(null);
  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

  // ─── Load user on mount ────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("gg_access_token");
    if (!token) {
      setState((s) => ({ ...s, user: null, isLoading: false, isAuthenticated: false }));
      return;
    }
    try {
      const res = await authApi.getMe();
      setState((s) => ({ ...s, user: res.data.user, isLoading: false, isAuthenticated: true }));
    } catch {
      clearTokens();
      setState((s) => ({ ...s, user: null, isLoading: false, isAuthenticated: false }));
    }
  }, []);

  useEffect(() => {
    refreshUser();
    // Listen for forced logout from the token interceptor (expired/invalid
    // refresh token). Uses a functional update so it can't race with — or
    // get clobbered by — the refreshUser() catch branch above.
    const handleLogout = () =>
      setState((s) => ({
        ...s,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        authMessage: "Your session has expired. Please sign in again.",
      }));

    // Listen for a 403 from an authenticated request (session is still
    // valid — this role just isn't allowed to do that particular thing).
    // Unlike gg:logout, we keep the session and just route the user to
    // wherever they *are* allowed, instead of leaving them on a page that
    // will keep failing or surfacing a raw "Forbidden" error.
    const handleForbidden = () => {
      const role = userRef.current?.role;
      toast("You don't have permission to access that page.");
      navigate({ to: role ? getRoleLandingPage(role) : "/login" });
    };

    window.addEventListener("gg:logout", handleLogout);
    window.addEventListener("gg:forbidden", handleForbidden);
    return () => {
      window.removeEventListener("gg:logout", handleLogout);
      window.removeEventListener("gg:forbidden", handleForbidden);
    };
  }, [refreshUser, navigate]);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string, portal: LoginPortal): Promise<LoginResult> => {
      const res = await authApi.login({ email, password, portal });

      // Handle 2FA challenge response
      if (res.requires2FA) {
        return {
          requires2FA: true,
          challengeToken: res.challengeToken,
        };
      }

      const { user, accessToken, refreshToken } = res.data;

      setTokens(accessToken, refreshToken);
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        authMessage: null,
      });

      return user;
    },
    [],
  );

  // ─── Signup ────────────────────────────────────────────────────────────────
  const signup = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      role?: string;
      organization?: string;
      phone?: string;
    }) => {
      const res = await authApi.signup(data);
      const { user, accessToken, refreshToken } = res.data;

      // Authority access requests are created in a "pending" state, and the
      // backend intentionally issues no tokens for them (see Phase 1.1
      // backend rules) — there is no session to start yet. Report that back
      // to the caller instead of treating this as a successful login; the
      // signup page is responsible for showing the appropriate confirmation
      // instead of navigating into the app.
      if (!accessToken || !refreshToken) {
        return { user, pending: true };
      }

      setTokens(accessToken, refreshToken);
      setState({ user, isLoading: false, isAuthenticated: true, authMessage: null });
      return { user, pending: false };
    },
    [],
  );

  // ─── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem("gg_refresh_token") ?? "";
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Ignore errors on logout
    } finally {
      clearTokens();
      setState({ user: null, isLoading: false, isAuthenticated: false, authMessage: null });
    }
  }, []);

  // ─── Consume the current session message ──────────────────────────────────
  const clearAuthMessage = useCallback(() => {
    setState((s) => (s.authMessage ? { ...s, authMessage: null } : s));
  }, []);

  // ─── Update profile ────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    const res = await authApi.updateProfile(data);
    setState((s) => ({ ...s, user: res.data.user }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout, updateProfile, refreshUser, clearAuthMessage }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Shorthand for role checks */
export const useIsAdmin = () => useAuth().user?.role === "administrator";
export const useIsAuthority = () => {
  const role = useAuth().user?.role;
  return role === "authority" || role === "administrator";
};
