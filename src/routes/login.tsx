import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api/auth.api";
import { getRoleLandingPage } from "@/components/protected-route";
import { TurnstileWidget, type TurnstileRef } from "@/components/ui/turnstile";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GreenGuard AI" }] }),
  component: LoginPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "citizen" | "authority" | "admin";
type View = "login" | "fp-email" | "fp-done";

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLES: Record<
  Role,
  {
    label: string;
    tagline: string;
    description: string;
    accent: string;
    accentRgb: string;
    features: string[];
    headline: string;
  }
> = {
  citizen: {
    label: "Citizen",
    tagline: "Your environment. Your voice.",
    description:
      "Report environmental incidents, track the status of your complaints, receive targeted alerts, and view real-time data for your neighbourhood.",
    accent: "#0EA5E9",
    accentRgb: "14,165,233",
    headline: "Empowering citizens with\nenvironmental intelligence.",
    features: [
      "Submit Environmental Incident Reports",
      "Track Complaint Status in Real Time",
      "Receive Targeted Environmental Alerts",
      "View Local Air, Water & Noise Data",
    ],
  },
  authority: {
    label: "Authority",
    tagline: "Informed decisions. Faster response.",
    description:
      "Manage complaints across your jurisdiction, access AI-powered environmental intelligence, monitor city sensor networks, and drive corrective action.",
    accent: "#F59E0B",
    accentRgb: "245,158,11",
    headline: "Environmental authority\nintelligence, centralised.",
    features: [
      "Complaint Management & Escalation",
      "AI Environmental Intelligence Briefings",
      "City-Wide Sensor Network Monitoring",
      "Authority Action & Response Tracking",
    ],
  },
  admin: {
    label: "Administrator",
    tagline: "Platform-wide visibility. Executive control.",
    description:
      "Operate the GreenGuard Command Center, manage cities and agencies, access platform-wide intelligence, and generate executive environmental reports.",
    accent: "#0D9373",
    accentRgb: "13,147,115",
    headline: "Executive command over\ncity environmental systems.",
    features: [
      "Executive Command Center Dashboard",
      "City & Agency Management",
      "Platform-Wide Environmental Intelligence",
      "AI-Generated Executive Reports",
    ],
  },
};

// ─── Animated network canvas ──────────────────────────────────────────────────

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number;
  pulseSpeed: number;
  kind: "hub" | "node" | "leaf";
}

function NetworkCanvas({ accentRgb }: { accentRgb: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<NetworkNode[]>([]);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const accentRef = useRef(accentRgb);

  useEffect(() => {
    accentRef.current = accentRgb;
  }, [accentRgb]);

  const buildNodes = useCallback((w: number, h: number) => {
    const count = Math.max(22, Math.floor((w * h) / 11000));
    const nodes: NetworkNode[] = [];
    for (let i = 0; i < count; i++) {
      const rnd = Math.random();
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: rnd > 0.88 ? 4 : rnd > 0.6 ? 2.5 : 1.5,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
        kind: rnd > 0.88 ? "hub" : rnd > 0.6 ? "node" : "leaf",
      });
    }
    nodesRef.current = nodes;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      buildNodes(canvas.offsetWidth, canvas.offsetHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      timeRef.current += 0.007;
      const t = timeRef.current;
      const rgb = accentRef.current;

      ctx.clearRect(0, 0, W, H);

      const nodes = nodesRef.current;
      const maxD = Math.min(W, H) * 0.26;

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.x = Math.max(0, Math.min(W, n.x));
        n.y = Math.max(0, Math.min(H, n.y));
      }

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i],
            b = nodes[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > maxD) continue;
          const fade = (1 - d / maxD) * (0.06 + 0.08 * Math.sin(t + i * 0.2));
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${rgb},${fade})`;
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
      }

      // Travelling packet
      if (nodes.length > 1) {
        const segIdx = Math.floor(t * 0.35) % nodes.length;
        const nextIdx = (segIdx + 1) % nodes.length;
        const progress = (t * 0.35) % 1;
        const px = nodes[segIdx].x + (nodes[nextIdx].x - nodes[segIdx].x) * progress;
        const py = nodes[segIdx].y + (nodes[nextIdx].y - nodes[segIdx].y) * progress;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 6);
        pg.addColorStop(0, `rgba(${rgb},0.9)`);
        pg.addColorStop(1, `rgba(${rgb},0)`);
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = pg;
        ctx.fill();
      }

      // Nodes
      for (const n of nodes) {
        const pf = 0.5 + 0.5 * Math.sin(n.pulse);
        if (n.kind === "hub") {
          const rr = n.r * (2.8 + pf * 1.6);
          const g = ctx.createRadialGradient(n.x, n.y, n.r, n.x, n.y, rr);
          g.addColorStop(0, `rgba(${rgb},${0.22 * pf})`);
          g.addColorStop(1, `rgba(${rgb},0)`);
          ctx.beginPath();
          ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle =
          n.kind === "hub"
            ? `rgba(${rgb},1)`
            : n.kind === "node"
              ? `rgba(${rgb},0.7)`
              : `rgba(${rgb},0.4)`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [buildNodes]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

// ─── Feature card row ─────────────────────────────────────────────────────────

function FeatureCard({ text, accent }: { text: string; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.625rem",
        padding: "0.5rem 0.75rem",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.6)",
        letterSpacing: "0.005em",
        lineHeight: 1.4,
      }}
    >
      <CheckCircle2 size={13} style={{ flexShrink: 0, color: accent }} />
      {text}
    </div>
  );
}

// ─── Role tab ─────────────────────────────────────────────────────────────────

function RoleTab({
  label,
  active,
  accent,
  onClick,
}: {
  label: string;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "0.5rem 0.25rem",
        fontSize: "0.75rem",
        fontWeight: active ? 600 : 400,
        color: active ? accent : "rgba(255,255,255,0.35)",
        background: active
          ? `rgba(${accent === "#0EA5E9" ? "14,165,233" : accent === "#F59E0B" ? "245,158,11" : "13,147,115"},0.1)`
          : "transparent",
        border: "none",
        borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
        cursor: "pointer",
        transition: "all 0.18s ease",
        fontFamily: "inherit",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap" as const,
      }}
    >
      {label}
    </button>
  );
}

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
  const [remember, setRemember] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileRef>(null);

  // Surface a friendly message when landing here after a forced logout
  // (e.g. an expired session), then consume it so it doesn't reappear.
  useEffect(() => {
    if (authMessage) {
      setError(authMessage);
      clearAuthMessage();
    }
  }, [authMessage, clearAuthMessage]);

  // Role tab state
  const [role, setRole] = useState<Role>("citizen");

  // View state
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
  const accent = rc.accent;

  // Precompute accent-based bg string for RoleTab
  const accentBg = useMemo(() => {
    if (accent === "#0EA5E9") return "rgba(14,165,233,0.1)";
    if (accent === "#F59E0B") return "rgba(245,158,11,0.1)";
    return "rgba(13,147,115,0.1)";
  }, [accent]);

  // Avoid flashing the login form while the session is still being
  // restored, and redirect away immediately if it turns out the user is
  // already authenticated (e.g. a stale bookmark, or the browser Back
  // button after already signing in) rather than showing a form they
  // don't need.
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
          background: "#08090E",
        }}
      >
        <Loader2 className="animate-spin" size={20} color="rgba(255,255,255,0.4)" />
      </div>
    );
  }

  // ── Login submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the security verification.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(email, password, role, turnstileToken);

      // ── Handle 2FA response
      if ("requires2FA" in loggedInUser) {
        navigate({
          to: "/verify-2fa",
          search: {
            challengeToken: loggedInUser.challengeToken,
          },
        });
        return; // stop here, don't redirect to dashboard yet
      }

      navigate({
        to: getRoleLandingPage(loggedInUser.role),
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Invalid email or password.");
      // Reset Turnstile token and widget on failed attempt so the user can re-verify and retry
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ─────────────────────────────────────────────────────────
  // Sends the account email to the real backend, which emails a signed,
  // time-limited reset link (see /reset-password). There is no in-app code
  // or password step here — the person continues the flow from their inbox.
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

  // ── Shared input style helper ───────────────────────────────────────────────
  const inputStyle = (focused: boolean, hasError = false): React.CSSProperties => ({
    width: "100%",
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${hasError ? "rgba(239,68,68,0.5)" : focused ? accent : "rgba(255,255,255,0.1)"}`,
    borderRadius: "0.5rem",
    padding: "0.6875rem 0.875rem",
    fontSize: "0.875rem",
    color: "rgba(255,255,255,0.9)",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
    boxShadow: focused
      ? `0 0 0 3px ${accent}22`
      : hasError
        ? "0 0 0 3px rgba(239,68,68,0.08)"
        : "none",
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LEFT PANEL
  // ─────────────────────────────────────────────────────────────────────────────

  const LeftPanel = (
    <div
      className="gg-left"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "none",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100vh",
      }}
    >
      {/* Canvas */}
      <NetworkCanvas accentRgb={rc.accentRgb} />

      {/* Ambient glow orbs */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          background: `radial-gradient(ellipse 55% 45% at 20% 65%, ${accent}18 0%, transparent 60%),
                     radial-gradient(ellipse 40% 35% at 80% 20%, ${accent}10 0%, transparent 55%)`,
          transition: "background 0.6s ease",
        }}
      />

      {/* Dark overlay */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "linear-gradient(170deg, rgba(8,9,14,0.6) 0%, rgba(8,9,14,0.15) 50%, rgba(8,9,14,0.8) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "2.5rem",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          gap: "0",
          justifyContent: "space-between",
        }}
      >
        {/* Logo + status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "0.5rem",
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 0 16px ${accent}44`,
                transition: "background 0.5s, box-shadow 0.5s",
              }}
            >
              <Shield size={15} color="#fff" />
            </div>
            <span style={{ fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
              GreenGuard AI
            </span>
          </Link>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: `${accent}14`,
              border: `1px solid ${accent}30`,
              borderRadius: "99px",
              padding: "0.25rem 0.75rem",
              fontSize: "0.6125rem",
              color: accent,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.4s",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: accent,
                boxShadow: `0 0 6px ${accent}`,
                animation: "gg-pulse 2s ease-in-out infinite",
              }}
            />
            Systems operational
          </div>
        </div>

        {/* Hero */}
        <div>
          <p
            style={{
              fontSize: "0.6375rem",
              fontFamily: "'JetBrains Mono', monospace",
              color: accent,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
              transition: "color 0.4s",
            }}
          >
            Environmental Intelligence Platform · {rc.label} Portal
          </p>
          <h2
            style={{
              fontSize: "clamp(1.5rem, 2.6vw, 2.125rem)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "rgba(255,255,255,0.95)",
              margin: "0 0 0.875rem",
              whiteSpace: "pre-line",
            }}
          >
            {rc.headline}
          </h2>
          <p
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.7,
              maxWidth: "27rem",
              margin: "0 0 2rem",
            }}
          >
            {rc.description}
          </p>

          {/* Feature cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {rc.features.map((f) => (
              <FeatureCard key={f} text={f} accent={accent} />
            ))}
          </div>
        </div>

        {/* Certs */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {["SOC 2 Type II", "ISO 27001", "CERT-In", "GDPR"].map((c) => (
            <span
              key={c}
              style={{
                fontSize: "0.5875rem",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.05em",
                color: "rgba(255,255,255,0.22)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "4px",
                padding: "2px 7px",
                textTransform: "uppercase",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RIGHT PANEL VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  // Shared wrapper
  const formWrapStyle: React.CSSProperties = { width: "100%", maxWidth: "22.5rem" };

  const errorBox = (msg: string) =>
    msg ? (
      <div
        role="alert"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.5rem",
          borderRadius: "0.5rem",
          border: "1px solid rgba(239,68,68,0.25)",
          background: "rgba(239,68,68,0.07)",
          padding: "0.625rem 0.875rem",
          fontSize: "0.8125rem",
          color: "rgb(252,165,165)",
          marginBottom: "1rem",
        }}
      >
        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
        <span>{msg}</span>
      </div>
    ) : null;

  const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
    width: "100%",
    background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
    color: "#fff",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.75rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.01em",
    boxShadow: `0 0 24px ${accent}30, 0 1px 3px rgba(0,0,0,0.4)`,
    transition: "opacity 0.15s, transform 0.12s, box-shadow 0.15s, background 0.4s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    fontFamily: "inherit",
    opacity: disabled ? 0.65 : 1,
  });

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="gg-back-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        background: "none",
        border: "none",
        color: "rgba(255,255,255,0.38)",
        fontSize: "0.8125rem",
        cursor: "pointer",
        padding: 0,
        marginBottom: "1.75rem",
        fontFamily: "inherit",
        transition: "color 0.15s",
      }}
    >
      <ArrowLeft size={13} /> Back to sign in
    </button>
  );

  // ── Login view ──────────────────────────────────────────────────────────────

  const LoginView = (
    <div style={formWrapStyle}>
      {/* Mobile logo */}
      <div className="gg-mobile-logo" style={{ marginBottom: "2rem" }}>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
              display: "grid",
              placeItems: "center",
              boxShadow: `0 0 14px ${accent}44`,
            }}
          >
            <Shield size={15} color="#fff" />
          </div>
          <span style={{ fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
            GreenGuard AI
          </span>
        </Link>
      </div>

      {/* Role tabs */}
      <div
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "0.625rem",
          overflow: "hidden",
          marginBottom: "1.75rem",
        }}
      >
        {(["citizen", "authority", "admin"] as Role[]).map((r) => (
          <RoleTab
            key={r}
            label={ROLES[r].label}
            active={role === r}
            accent={ROLES[r].accent}
            onClick={() => {
              setRole(r);
              setError("");
            }}
          />
        ))}
      </div>

      <h1
        style={{
          fontSize: "1.375rem",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          color: "rgba(255,255,255,0.95)",
          margin: "0 0 0.25rem",
        }}
      >
        Welcome back
      </h1>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "rgba(255,255,255,0.32)",
          margin: "0 0 1.5rem",
          lineHeight: 1.5,
        }}
      >
        {rc.tagline}
      </p>

      {role === "authority" && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            borderRadius: "0.5rem",
            border: `1px solid ${accent}30`,
            background: `${accent}0f`,
            padding: "0.625rem 0.875rem",
            fontSize: "0.75rem",
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.55)",
            marginBottom: "1.5rem",
          }}
        >
          <Info size={13} style={{ flexShrink: 0, marginTop: "1px", color: accent }} />
          <span>Authority accounts require Administrator approval before first login.</span>
        </div>
      )}

      {errorBox(error)}

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {/* Email */}
        <div>
          <label
            htmlFor="gg-email"
            style={{
              display: "block",
              fontSize: "0.6875rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Email address
          </label>
          <input
            id="gg-email"
            type="email"
            autoComplete="email"
            placeholder="you@city.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setEmailFocus(true)}
            onBlur={() => setEmailFocus(false)}
            style={inputStyle(emailFocus)}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="gg-pw"
            style={{
              display: "block",
              fontSize: "0.6875rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="gg-pw"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPwFocus(true)}
              onBlur={() => setPwFocus(false)}
              style={{ ...inputStyle(pwFocus), paddingRight: "2.75rem" }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.3)",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
              className="gg-eye"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Remember + Forgot */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.36)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: "13px", height: "13px", accentColor: accent, cursor: "pointer" }}
            />
            Keep me signed in
          </label>
          <button
            type="button"
            onClick={() => {
              setFpEmail(email);
              setFpError("");
              setView("fp-email");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: accent,
              fontSize: "0.8125rem",
              fontFamily: "inherit",
              padding: 0,
              transition: "opacity 0.15s",
            }}
            className="gg-fp-link"
          >
            Forgot password?
          </button>
        </div>

        {/* Turnstile Security Verification */}
        <div style={{ display: "flex", justifyContent: "center", margin: "0.25rem 0" }}>
          <TurnstileWidget
            ref={turnstileRef}
            theme="dark"
            onSuccess={(token) => {
              setTurnstileToken(token);
              setError((prev) => (prev === "Please complete the security verification." ? "" : prev));
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

        {/* CTA */}
        <button
          type="submit"
          disabled={loading}
          style={submitBtnStyle(loading)}
          className={loading ? "" : "gg-btn-hover"}
        >
          {loading ? (
            <>
              <Loader2 size={14} style={{ animation: "gg-spin 0.85s linear infinite" }} />
              Authenticating…
            </>
          ) : (
            <>
              Access Environmental Intelligence <ChevronRight size={14} />
            </>
          )}
        </button>
      </form>

      <p
        style={{
          marginTop: "1.75rem",
          fontSize: "0.8125rem",
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
        }}
      >
        New to GreenGuard?{" "}
        <Link to="/signup" style={{ color: accent, textDecoration: "none" }} className="gg-link">
          Request access
        </Link>
      </p>
    </div>
  );

  // ── Forgot step 1: email ────────────────────────────────────────────────────

  const FpEmailView = (
    <div style={formWrapStyle}>
      <div className="gg-mobile-logo" style={{ marginBottom: "2rem" }}>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Shield size={15} color="#fff" />
          </div>
          <span style={{ fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
            GreenGuard AI
          </span>
        </Link>
      </div>

      <BackBtn onClick={resetFp} />

      <h1
        style={{
          fontSize: "1.375rem",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          color: "rgba(255,255,255,0.95)",
          margin: "0 0 0.25rem",
        }}
      >
        Reset your password
      </h1>
      <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.32)", margin: "0 0 1.5rem" }}>
        Enter your account email and we'll send a link to reset your password.
      </p>

      {errorBox(fpError)}

      <form
        onSubmit={handleFpEmailSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div>
          <label
            htmlFor="gg-fp-email"
            style={{
              display: "block",
              fontSize: "0.6875rem",
              fontWeight: 500,
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            Email address
          </label>
          <input
            id="gg-fp-email"
            type="email"
            autoComplete="email"
            placeholder="you@city.gov"
            value={fpEmail}
            onChange={(e) => setFpEmail(e.target.value)}
            onFocus={() => setFpEmailFocus(true)}
            onBlur={() => setFpEmailFocus(false)}
            style={inputStyle(fpEmailFocus)}
          />
        </div>
        <button
          type="submit"
          disabled={fpLoading}
          style={submitBtnStyle(fpLoading)}
          className={fpLoading ? "" : "gg-btn-hover"}
        >
          {fpLoading ? (
            <>
              <Loader2 size={14} style={{ animation: "gg-spin 0.85s linear infinite" }} />
              Sending…
            </>
          ) : (
            <>
              Send reset link <ChevronRight size={14} />
            </>
          )}
        </button>
      </form>
    </div>
  );

  // ── Forgot done ──────────────────────────────────────────────────────────────
  // The actual password change happens on /reset-password once the person
  // clicks the link emailed to them — this screen only confirms the email
  // was sent.

  const FpDoneView = (
    <div style={formWrapStyle}>
      <div className="gg-mobile-logo" style={{ marginBottom: "2rem" }}>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Shield size={15} color="#fff" />
          </div>
          <span style={{ fontSize: "0.9375rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
            GreenGuard AI
          </span>
        </Link>
      </div>

      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "50%",
          background: `${accent}18`,
          border: `1px solid ${accent}35`,
          display: "grid",
          placeItems: "center",
          marginBottom: "1.5rem",
          boxShadow: `0 0 20px ${accent}20`,
        }}
      >
        <CheckCircle2 size={22} color={accent} />
      </div>

      <h1
        style={{
          fontSize: "1.375rem",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          color: "rgba(255,255,255,0.95)",
          margin: "0 0 0.25rem",
        }}
      >
        Check your inbox
      </h1>
      <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.32)", margin: "0 0 1.75rem" }}>
        If <span style={{ color: "rgba(255,255,255,0.65)" }}>{fpEmail}</span> is registered, a reset
        link is on its way. It expires in 1 hour — check spam if you don't see it.
      </p>

      <button
        type="button"
        onClick={resetFp}
        style={{ ...submitBtnStyle(false), cursor: "pointer" }}
        className="gg-btn-hover"
      >
        Back to sign in
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const activeView = {
    login: LoginView,
    "fp-email": FpEmailView,
    "fp-done": FpDoneView,
  }[view];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .gg-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr;
          background: #08090E;
          color: rgba(255,255,255,0.88);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        @media (min-width: 1024px) {
          .gg-root { grid-template-columns: 1fr 1fr; }
          .gg-left { display: flex !important; }
          .gg-mobile-logo { display: none !important; }
        }

        @keyframes gg-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }

        @keyframes gg-spin {
          to { transform: rotate(360deg); }
        }

        .gg-btn-hover:hover {
          opacity: 0.86 !important;
          transform: translateY(-1px);
        }
        .gg-btn-hover:active { transform: translateY(0); }

        .gg-back-btn:hover { color: rgba(255,255,255,0.7) !important; }
        .gg-eye:hover { color: rgba(255,255,255,0.65) !important; }
        .gg-fp-link:hover { opacity: 0.75; }
        .gg-link:hover { opacity: 0.8; }

        input::placeholder { color: rgba(255,255,255,0.18); }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0d1117 inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          caret-color: rgba(255,255,255,0.9);
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="gg-root">
        {LeftPanel}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1.25rem",
            minHeight: "100vh",
          }}
        >
          {activeView}
        </div>
      </div>
    </>
  );
}
