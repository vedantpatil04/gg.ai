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
  User,
  ShieldCheck,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { authApi, type LoginPortal } from "@/lib/api/auth.api";
import { getRoleLandingPage } from "@/components/protected-route";
import { TurnstileWidget, type TurnstileRef } from "@/components/ui/turnstile";
import { useTheme } from "@/lib/theme";
import { AuthBackground } from "@/components/auth/auth-background";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — GreenGuard AI" }] }),
  component: LoginPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

/** The portal the sign-in form submits as — kept as an alias of the API's own
 *  `LoginPortal` type so this file can't silently drift from what the backend
 *  actually accepts. */
type Role = LoginPortal;
type View = "login" | "fp-email" | "fp-done";
type Accent = "primary" | "warning" | "info";

// ─── Role config ──────────────────────────────────────────────────────────────
// Copy per GreenGuard AI Step 2 spec §9 — short and concrete, not a marketing
// panel. Accents reuse the design system's existing semantic tokens (the same
// ones already used for status tags in signup.tsx and throughout admin/
// command-center) rather than introducing a new palette.

const ROLES: Record<
  Role,
  {
    tab: string;
    portal: string;
    icon: LucideIcon;
    headline: string;
    supporting: string;
    accent: Accent;
  }
> = {
  citizen: {
    tab: "Citizen",
    portal: "Citizen Portal",
    icon: User,
    headline: "Your environment. Your voice.",
    supporting: "Monitor your surroundings, report environmental issues, and stay informed.",
    accent: "primary",
  },
  authority: {
    tab: "Authority",
    portal: "Authority Portal",
    icon: ShieldCheck,
    headline: "From environmental incident to resolution.",
    supporting: "Investigate environmental incidents and manage environmental response workflows.",
    accent: "warning",
  },
  admin: {
    tab: "Administrator",
    portal: "Administrator Portal",
    icon: Settings2,
    headline: "Govern the intelligence behind GreenGuard.",
    supporting: "Manage platform operations, governance, access, and environmental intelligence.",
    accent: "info",
  },
};

// Literal per-role class strings. Tailwind's scanner needs complete class
// names in source, not ones built via "text-" + accent — so nothing below is
// assembled dynamically.
const ACCENT: Record<Role, { tabActive: string; text: string; chip: string; focus: string }> = {
  citizen: {
    tabActive: "bg-primary/10 text-primary",
    text: "text-primary",
    chip: "bg-primary/12 text-primary",
    focus: "focus:border-primary focus:ring-primary/20",
  },
  authority: {
    tabActive: "bg-warning/10 text-warning",
    text: "text-warning",
    chip: "bg-warning/12 text-warning",
    focus: "focus:border-warning focus:ring-warning/20",
  },
  admin: {
    tabActive: "bg-info/10 text-info",
    text: "text-info",
    chip: "bg-info/12 text-info",
    focus: "focus:border-info focus:ring-info/20",
  },
};

const ROLE_ORDER: Role[] = ["citizen", "authority", "admin"];

const inputClass =
  "h-11 w-full rounded-lg border border-input bg-background/40 px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:ring-2";

const ctaClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

// ─── Brand lockup ─────────────────────────────────────────────────────────────
// Same lockup as the marketing header (LandingHeader.tsx) — same gradient
// badge, same font-display wordmark — so sign-in reads as GreenGuard, not a
// separate product.

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex w-fit items-center gap-2.5">
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--color-primary)] to-[color:var(--color-info)] text-primary-foreground shadow-lg shadow-[color:var(--color-primary)]/25",
          compact ? "size-8" : "size-9",
        )}
      >
        <Shield className="size-4" />
      </div>
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          compact ? "text-[15px]" : "text-base",
        )}
      >
        GreenGuard <span className="font-normal text-muted-foreground">AI</span>
      </span>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function LoginPage() {
  const navigate = useNavigate();
  const { login, user, isAuthenticated, isLoading, authMessage, clearAuthMessage } = useAuth();
  const { resolvedTheme } = useTheme();

  // Core form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileRef>(null);

  // Role tab + view state
  const [role, setRole] = useState<Role>("citizen");
  const [view, setView] = useState<View>("login");

  // Forgot-password flow state
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");

  // Surface a friendly message when landing here after a forced logout
  // (e.g. an expired session), then consume it so it doesn't reappear.
  useEffect(() => {
    if (authMessage) {
      setError(authMessage);
      clearAuthMessage();
    }
  }, [authMessage, clearAuthMessage]);

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

  const rc = ROLES[role];
  const ac = ACCENT[role];

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Login submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
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
          search: { challengeToken: loggedInUser.challengeToken },
        });
        return; // stop here, don't redirect to dashboard yet
      }

      navigate({ to: getRoleLandingPage(loggedInUser.role) });
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
  const handleFpEmailSubmit = async (e: FormEvent) => {
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

  const ErrorBanner = ({ message }: { message: string }) =>
    message ? (
      <div
        role="alert"
        className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm leading-relaxed text-destructive"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </div>
    ) : null;

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEWS
  // ─────────────────────────────────────────────────────────────────────────────

  const LoginView = (
    <>
      <div className="mb-6 lg:hidden">
        <BrandMark compact />
      </div>

      <div
        role="group"
        aria-label="Sign in as"
        className="mb-6 grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/40 p-1"
      >
        {ROLE_ORDER.map((r) => {
          const active = role === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setRole(r);
                setError("");
              }}
              className={cn(
                "rounded-lg px-1.5 py-2.5 text-center text-[11px] font-medium leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-xs",
                active ? ACCENT[r].tabActive : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ROLES[r].tab}
            </button>
          );
        })}
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-muted-foreground">{rc.supporting}</p>

      {role === "authority" && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/8 px-3.5 py-2.5 text-xs leading-relaxed text-foreground/75">
          <Info className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <span>Authority accounts require Administrator approval before first login.</span>
        </div>
      )}

      <ErrorBanner message={error} />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="gg-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Email address
          </label>
          <input
            id="gg-email"
            type="email"
            autoComplete="email"
            placeholder="you@city.gov"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={cn(inputClass, ac.focus)}
          />
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="gg-pw" className="block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setFpEmail(email);
                setFpError("");
                setView("fp-email");
              }}
              className={cn("text-xs font-medium underline-offset-4 hover:underline", ac.text)}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="gg-pw"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClass, ac.focus, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Turnstile security verification */}
        <div className="flex justify-center py-1">
          <TurnstileWidget
            ref={turnstileRef}
            theme={resolvedTheme}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setError((prev) =>
                prev === "Please complete the security verification." ? "" : prev,
              );
            }}
            onError={() => {
              setTurnstileToken("");
              setError("Security verification failed. Please try again.");
            }}
            onExpire={() => setTurnstileToken("")}
          />
        </div>

        <button type="submit" disabled={loading} className={cn(ctaClass, "aurora")}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Sign In
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to GreenGuard?{" "}
        <Link to="/signup" className={cn("font-medium underline-offset-4 hover:underline", ac.text)}>
          Request access
        </Link>
      </p>
    </>
  );

  // ── Forgot step 1: email ────────────────────────────────────────────────────

  const FpEmailView = (
    <>
      <div className="mb-6 lg:hidden">
        <BrandMark compact />
      </div>

      <button
        type="button"
        onClick={resetFp}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </button>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-muted-foreground">
        Enter your account email and we&rsquo;ll send a link to reset your password.
      </p>

      <ErrorBanner message={fpError} />

      <form onSubmit={handleFpEmailSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="gg-fp-email"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
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
            className={cn(inputClass, ac.focus)}
          />
        </div>
        <button type="submit" disabled={fpLoading} className={cn(ctaClass, "aurora")}>
          {fpLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              Send reset link
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      </form>
    </>
  );

  // ── Forgot done ──────────────────────────────────────────────────────────────
  // The actual password change happens on /reset-password once the person
  // clicks the link emailed to them — this screen only confirms the email
  // was sent.

  const FpDoneView = (
    <>
      <div className="mb-6 lg:hidden">
        <BrandMark compact />
      </div>

      <div className="mb-5 grid size-11 place-items-center rounded-full bg-primary/12">
        <CheckCircle2 className="size-5 text-primary" />
      </div>

      <h1 className="text-xl font-semibold tracking-tight text-foreground">Check your inbox</h1>
      <p className="mb-7 mt-1 text-sm leading-relaxed text-muted-foreground">
        If <span className="text-foreground">{fpEmail}</span> is registered, a reset link is on its
        way. It expires in 1 hour — check spam if you don&rsquo;t see it.
      </p>

      <button type="button" onClick={resetFp} className={cn(ctaClass, "aurora")}>
        Back to sign in
      </button>
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const activeView = { login: LoginView, "fp-email": FpEmailView, "fp-done": FpDoneView }[view];

  return (
    <AuthBackground accent={rc.accent}>
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Context panel — desktop only. On mobile the photograph plus the
            card's own heading/supporting copy carry the role context instead. */}
        <div className="relative hidden flex-1 flex-col justify-between p-10 lg:flex xl:p-14">
          <BrandMark />

          <div className="max-w-md">
            <div
              className={cn(
                "mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider",
                ac.chip,
              )}
            >
              <rc.icon className="size-3" />
              {rc.portal}
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground xl:text-4xl">
              {rc.headline}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {rc.supporting}
            </p>
          </div>
        </div>

        {/* Auth column */}
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:max-w-[26rem] lg:flex-none lg:px-10 xl:max-w-[28rem]">
          <div className="w-full max-w-sm rounded-2xl glass-panel p-6 sm:p-8">
            <div
              key={view}
              className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
            >
              {activeView}
            </div>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
}
