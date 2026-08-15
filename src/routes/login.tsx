import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api/auth.api";
import { getRoleLandingPage } from "@/components/protected-route";
import { TurnstileWidget, type TurnstileRef } from "@/components/ui/turnstile";
import { LOGIN_HERO_IMAGE } from "@/assets/login-image";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GreenGuard AI" }] }),
  component: LoginPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "citizen" | "authority" | "admin";
type View = "login" | "fp-email" | "fp-done";

// ─── Role configuration ───────────────────────────────────────────────────────

const ROLES: Record<
  Role,
  {
    label: string;
    heading: string;
    subtext: string;
    showApprovalNote: boolean;
  }
> = {
  citizen: {
    label: "Citizen",
    heading: "Welcome back",
    subtext: "Sign in to access your GreenGuard environmental services.",
    showApprovalNote: false,
  },
  authority: {
    label: "Authority",
    heading: "Authority Sign In",
    subtext: "Access your environmental investigation and management workspace.",
    showApprovalNote: true,
  },
  admin: {
    label: "Administrator",
    heading: "Administrator Sign In",
    subtext: "Access GreenGuard platform administration and governance.",
    showApprovalNote: false,
  },
};

// ─── Main page ────────────────────────────────────────────────────────────────

function LoginPage() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isLoading, authMessage, clearAuthMessage } = useAuth();

  // Core form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileRef>(null);

  // Surface a friendly message when landing here after a forced logout
  useEffect(() => {
    if (authMessage) {
      setError(authMessage);
      clearAuthMessage();
    }
  }, [authMessage, clearAuthMessage]);

  // Role and view state
  const [role, setRole] = useState<Role>("citizen");
  const [view, setView] = useState<View>("login");

  // Forgot-password flow state
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");

  // Focus states
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [fpEmailFocus, setFpEmailFocus] = useState(false);

  const rc = ROLES[role];

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate({ to: getRoleLandingPage(user.role) });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0C12",
        }}
      >
        <Loader2 className="animate-spin" size={20} color="rgba(255,255,255,0.4)" />
      </div>
    );
  }

  // ── Login submit ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      setError("Please fill in your email and password.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the security verification to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password, role, turnstileToken);

      if ("requires2FA" in loggedInUser) {
        navigate({
          to: "/verify-2fa",
          search: { challengeToken: loggedInUser.challengeToken },
        });
        return;
      }

      navigate({ to: getRoleLandingPage(loggedInUser.role) });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "The email or password is incorrect. Please try again.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ──────────────────────────────────────────────────────

  const handleFpEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail) {
      setFpError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)) {
      setFpError("Enter a valid email address.");
      return;
    }
    setFpError("");
    setFpLoading(true);
    try {
      await authApi.forgotPassword(fpEmail);
      setView("fp-done");
    } catch {
      setFpError("Something went wrong. Please try again.");
    } finally {
      setFpLoading(false);
    }
  };

  const resetFp = () => {
    setFpEmail("");
    setFpError("");
    setFpLoading(false);
    setView("login");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const activeView = { login: "login", "fp-email": "fp-email", "fp-done": "fp-done" }[view];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;1,14..32,400&family=Space+Grotesk:wght@500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .gg2-root {
          min-height: 100vh;
          display: flex;
          background: #0A0C12;
          color: rgba(255,255,255,0.88);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        /* Left image panel — hidden on mobile */
        .gg2-visual {
          display: none;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* Right form panel */
        .gg2-form-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow-y: auto;
        }

        .gg2-form-center {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
        }

        .gg2-form-wrap {
          width: 100%;
          max-width: 22rem;
        }

        /* Role selector */
        .gg2-role-bar {
          display: flex;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.625rem;
          padding: 3px;
          gap: 2px;
          margin-bottom: 2rem;
        }

        .gg2-role-btn {
          flex: 1;
          padding: 0.4375rem 0.25rem;
          border: none;
          border-radius: 0.4375rem;
          cursor: pointer;
          font-size: 0.8125rem;
          font-weight: 500;
          letter-spacing: 0.005em;
          font-family: inherit;
          transition: background 0.18s ease, color 0.18s ease;
          white-space: nowrap;
          background: transparent;
          color: rgba(255,255,255,0.35);
        }

        .gg2-role-btn[aria-selected="true"] {
          background: rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.92);
          font-weight: 600;
        }

        .gg2-role-btn:focus-visible {
          outline: 2px solid rgba(255,255,255,0.4);
          outline-offset: -1px;
        }

        /* Inputs */
        .gg2-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
          padding: 0.6875rem 0.875rem;
          font-size: 0.875rem;
          color: rgba(255,255,255,0.9);
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .gg2-input:focus {
          border-color: rgba(255,255,255,0.3);
          box-shadow: 0 0 0 3px rgba(255,255,255,0.05);
        }

        .gg2-input--error {
          border-color: rgba(239,68,68,0.45);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.07);
        }

        .gg2-input::placeholder { color: rgba(255,255,255,0.18); }

        .gg2-input:-webkit-autofill,
        .gg2-input:-webkit-autofill:hover,
        .gg2-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #131620 inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          caret-color: rgba(255,255,255,0.9);
        }

        /* CTA button */
        .gg2-cta {
          width: 100%;
          border: none;
          border-radius: 0.5rem;
          padding: 0.75rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          letter-spacing: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-family: inherit;
          transition: opacity 0.15s, transform 0.12s;
          background: #fff;
          color: #0A0C12;
        }

        .gg2-cta:not(:disabled):hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }

        .gg2-cta:not(:disabled):active { transform: translateY(0); }

        .gg2-cta:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* Ghost button (forgot password back) */
        .gg2-ghost-btn {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.75);
          border: 1px solid rgba(255,255,255,0.09);
        }
        .gg2-ghost-btn:not(:disabled):hover {
          background: rgba(255,255,255,0.08);
          opacity: 1;
        }

        /* Inline links */
        .gg2-link {
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
          color: rgba(255,255,255,0.55);
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-color: rgba(255,255,255,0.2);
          transition: color 0.15s;
        }

        .gg2-link:hover { color: rgba(255,255,255,0.85); }
        .gg2-link:focus-visible {
          outline: 2px solid rgba(255,255,255,0.3);
          outline-offset: 2px;
          border-radius: 2px;
        }

        /* Label */
        .gg2-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.03em;
          margin-bottom: 0.4375rem;
        }

        /* Back button */
        .gg2-back {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          background: none;
          border: none;
          color: rgba(255,255,255,0.38);
          font-size: 0.8125rem;
          cursor: pointer;
          padding: 0;
          font-family: inherit;
          transition: color 0.15s;
          margin-bottom: 1.75rem;
        }

        .gg2-back:hover { color: rgba(255,255,255,0.7); }

        .gg2-back:focus-visible {
          outline: 2px solid rgba(255,255,255,0.3);
          outline-offset: 2px;
          border-radius: 2px;
        }

        /* Error / info alert */
        .gg2-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          border-radius: 0.5rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.8125rem;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .gg2-alert--error {
          border: 1px solid rgba(239,68,68,0.22);
          background: rgba(239,68,68,0.07);
          color: rgb(252,165,165);
        }

        .gg2-alert--info {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.48);
        }

        /* Eye toggle */
        .gg2-eye {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.28);
          padding: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .gg2-eye:hover { color: rgba(255,255,255,0.6); }

        .gg2-eye:focus-visible {
          outline: 2px solid rgba(255,255,255,0.3);
          outline-offset: 1px;
          border-radius: 3px;
        }

        /* Mobile header logo */
        .gg2-mobile-brand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        /* Forgot password inline link styling */
        .gg2-fp-link {
          background: none;
          border: none;
          padding: 0;
          font-family: inherit;
          font-size: 0.8125rem;
          cursor: pointer;
          color: rgba(255,255,255,0.38);
          transition: color 0.15s;
        }

        .gg2-fp-link:hover { color: rgba(255,255,255,0.7); }

        /* Turnstile wrapper */
        .gg2-turnstile-wrap {
          display: flex;
          justify-content: center;
          overflow: hidden;
        }

        /* Form field group */
        .gg2-field { display: flex; flex-direction: column; gap: 0; }

        /* Section divider text */
        .gg2-divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0.25rem 0;
          font-size: 0.6875rem;
          color: rgba(255,255,255,0.18);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .gg2-divider::before,
        .gg2-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.07);
        }

        /* ─── DESKTOP layout ─────────────────────────────────────────── */
        @media (min-width: 1024px) {
          .gg2-root { flex-direction: row; }

          .gg2-visual {
            display: block;
            width: 42%;
            min-width: 380px;
            max-width: 560px;
          }

          .gg2-mobile-brand { display: none; }

          .gg2-form-center { padding: 3rem 3rem; }
        }

        @media (min-width: 1280px) {
          .gg2-visual { width: 44%; }
          .gg2-form-center { padding: 3.5rem 4rem; }
        }

        /* ─── Animations ─────────────────────────────────────────────── */
        @keyframes gg2-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes gg2-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .gg2-view-enter {
          animation: gg2-fadein 0.22s ease forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="gg2-root">
        {/* ── Left: Environmental photograph ─────────────────────────── */}
        <div className="gg2-visual" aria-hidden="true">
          {/* Photograph */}
          <img
            src={LOGIN_HERO_IMAGE.imageUrl}
            alt={LOGIN_HERO_IMAGE.imageAlt}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
            draggable={false}
          />

          {/* Gradient overlays — allow photo to breathe while keeping text legible */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `
                linear-gradient(
                  180deg,
                  rgba(10,12,18,0.72) 0%,
                  rgba(10,12,18,0.28) 38%,
                  rgba(10,12,18,0.38) 68%,
                  rgba(10,12,18,0.88) 100%
                )
              `,
            }}
          />

          {/* Content over the photo */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "2rem",
            }}
          >
            {/* Brand mark */}
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.625rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  width: "2.125rem",
                  height: "2.125rem",
                  borderRadius: "0.5rem",
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  boxShadow: "0 0 16px rgba(34,197,94,0.35)",
                }}
              >
                <Shield size={14} color="#fff" strokeWidth={2.25} />
              </div>
              <span
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                GreenGuard AI
              </span>
            </Link>

            {/* Bottom identity */}
            <div>
              <p
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.38)",
                  marginBottom: "0.5rem",
                }}
              >
                Intelligent Environmental Platform
              </p>
              <p
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: "clamp(1.375rem, 2.2vw, 1.875rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.18,
                  color: "rgba(255,255,255,0.92)",
                  maxWidth: "18rem",
                }}
              >
                Environmental intelligence for cities that care.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Form column ───────────────────────────────────────── */}
        <div className="gg2-form-col">
          {/* Mobile-only top header */}
          <div className="gg2-mobile-brand">
            <Link
              to="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  width: "1.875rem",
                  height: "1.875rem",
                  borderRadius: "0.4375rem",
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <Shield size={13} color="#fff" strokeWidth={2.25} />
              </div>
              <span
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                GreenGuard AI
              </span>
            </Link>
          </div>

          <div className="gg2-form-center">
            <div className="gg2-form-wrap gg2-view-enter" key={activeView}>

              {/* ── Login view ─────────────────────────────────────────── */}
              {view === "login" && (
                <>
                  {/* Role selector */}
                  <div
                    role="tablist"
                    aria-label="Select your account type"
                    className="gg2-role-bar"
                  >
                    {(["citizen", "authority", "admin"] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="tab"
                        aria-selected={role === r}
                        className="gg2-role-btn"
                        onClick={() => {
                          setRole(r);
                          setError("");
                        }}
                      >
                        {ROLES[r].label}
                      </button>
                    ))}
                  </div>

                  {/* Heading */}
                  <h1
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                      color: "rgba(255,255,255,0.96)",
                      marginBottom: "0.3125rem",
                      lineHeight: 1.2,
                    }}
                  >
                    {rc.heading}
                  </h1>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.38)",
                      marginBottom: "1.75rem",
                      lineHeight: 1.55,
                    }}
                  >
                    {rc.subtext}
                  </p>

                  {/* Authority note */}
                  {rc.showApprovalNote && (
                    <div className="gg2-alert gg2-alert--info" style={{ marginBottom: "1.25rem" }}>
                      <AlertCircle
                        size={13}
                        style={{ flexShrink: 0, marginTop: "1px", color: "rgba(255,255,255,0.38)" }}
                      />
                      <span>Authority accounts require administrator approval before first sign-in.</span>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div role="alert" className="gg2-alert gg2-alert--error">
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{error}</span>
                    </div>
                  )}

                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                  >
                    {/* Email */}
                    <div className="gg2-field">
                      <label htmlFor="gg2-email" className="gg2-label">
                        Email address
                      </label>
                      <input
                        id="gg2-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@organisation.gov"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocus(true)}
                        onBlur={() => setEmailFocus(false)}
                        className={`gg2-input${emailFocus ? "" : ""}${error && !email ? " gg2-input--error" : ""}`}
                        aria-describedby={error ? "gg2-form-error" : undefined}
                      />
                    </div>

                    {/* Password */}
                    <div className="gg2-field">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.4375rem",
                        }}
                      >
                        <label htmlFor="gg2-pw" className="gg2-label" style={{ marginBottom: 0 }}>
                          Password
                        </label>
                        <button
                          type="button"
                          className="gg2-fp-link"
                          onClick={() => {
                            setFpEmail(email);
                            setFpError("");
                            setView("fp-email");
                          }}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div style={{ position: "relative" }}>
                        <input
                          id="gg2-pw"
                          type={showPw ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setPwFocus(true)}
                          onBlur={() => setPwFocus(false)}
                          className={`gg2-input${pwFocus ? "" : ""}${error && !password ? " gg2-input--error" : ""}`}
                          style={{ paddingRight: "2.75rem" }}
                        />
                        <button
                          type="button"
                          className="gg2-eye"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={showPw ? "Hide password" : "Show password"}
                        >
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Turnstile */}
                    <div className="gg2-turnstile-wrap">
                      <TurnstileWidget
                        ref={turnstileRef}
                        theme="dark"
                        onSuccess={(token) => {
                          setTurnstileToken(token);
                          setError((prev) =>
                            prev === "Please complete the security verification to continue."
                              ? ""
                              : prev,
                          );
                        }}
                        onError={() => {
                          setTurnstileToken("");
                          setError("Security verification failed. Please try again.");
                        }}
                        onExpire={() => {
                          setTurnstileToken("");
                        }}
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="gg2-cta"
                    >
                      {loading ? (
                        <>
                          <Loader2
                            size={14}
                            style={{ animation: "gg2-spin 0.85s linear infinite", flexShrink: 0 }}
                          />
                          Signing in…
                        </>
                      ) : (
                        <>
                          Sign In
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Footer link */}
                  <p
                    style={{
                      marginTop: "1.5rem",
                      fontSize: "0.8125rem",
                      color: "rgba(255,255,255,0.28)",
                      textAlign: "center",
                    }}
                  >
                    New to GreenGuard?{" "}
                    <Link
                      to="/signup"
                      style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline", textUnderlineOffset: "2px", textDecorationColor: "rgba(255,255,255,0.22)" }}
                      className="gg2-link"
                    >
                      Request access
                    </Link>
                  </p>
                </>
              )}

              {/* ── Forgot password: email step ─────────────────────────── */}
              {view === "fp-email" && (
                <>
                  <button type="button" className="gg2-back" onClick={resetFp}>
                    <ArrowLeft size={13} /> Back to sign in
                  </button>

                  <h1
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                      color: "rgba(255,255,255,0.96)",
                      marginBottom: "0.3125rem",
                    }}
                  >
                    Reset your password
                  </h1>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.38)",
                      marginBottom: "1.75rem",
                      lineHeight: 1.55,
                    }}
                  >
                    Enter your account email and we'll send a link to reset your password.
                  </p>

                  {fpError && (
                    <div role="alert" className="gg2-alert gg2-alert--error">
                      <AlertCircle size={13} style={{ flexShrink: 0, marginTop: "2px" }} />
                      <span>{fpError}</span>
                    </div>
                  )}

                  <form
                    onSubmit={handleFpEmailSubmit}
                    noValidate
                    style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
                  >
                    <div className="gg2-field">
                      <label htmlFor="gg2-fp-email" className="gg2-label">
                        Email address
                      </label>
                      <input
                        id="gg2-fp-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@organisation.gov"
                        value={fpEmail}
                        onChange={(e) => setFpEmail(e.target.value)}
                        onFocus={() => setFpEmailFocus(true)}
                        onBlur={() => setFpEmailFocus(false)}
                        className={`gg2-input${fpEmailFocus ? "" : ""}`}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={fpLoading}
                      className="gg2-cta"
                    >
                      {fpLoading ? (
                        <>
                          <Loader2
                            size={14}
                            style={{ animation: "gg2-spin 0.85s linear infinite", flexShrink: 0 }}
                          />
                          Sending…
                        </>
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ── Forgot password: done step ─────────────────────────── */}
              {view === "fp-done" && (
                <>
                  {/* Success icon */}
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.22)",
                      display: "grid",
                      placeItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <CheckCircle2 size={22} color="#22c55e" />
                  </div>

                  <h1
                    style={{
                      fontFamily: "'Space Grotesk', system-ui, sans-serif",
                      fontSize: "1.5rem",
                      fontWeight: 600,
                      letterSpacing: "-0.025em",
                      color: "rgba(255,255,255,0.96)",
                      marginBottom: "0.3125rem",
                    }}
                  >
                    Check your inbox
                  </h1>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.38)",
                      marginBottom: "1.75rem",
                      lineHeight: 1.55,
                    }}
                  >
                    If{" "}
                    <span style={{ color: "rgba(255,255,255,0.65)" }}>{fpEmail}</span>{" "}
                    is registered, a reset link is on its way. It expires in 1 hour — check spam if
                    you don't see it.
                  </p>

                  <button
                    type="button"
                    onClick={resetFp}
                    className="gg2-cta gg2-ghost-btn"
                  >
                    Back to sign in
                  </button>
                </>
              )}

            </div>
          </div>

          {/* Form footer */}
          <div
            style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.2)", flex: 1 }}>
              © 2025 GreenGuard AI
            </span>
            <Link
              to="/privacy"
              style={{
                fontSize: "0.6875rem",
                color: "rgba(255,255,255,0.22)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              style={{
                fontSize: "0.6875rem",
                color: "rgba(255,255,255,0.22)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
