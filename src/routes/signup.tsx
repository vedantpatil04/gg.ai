import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, User, ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getRoleLandingPage } from "@/components/protected-route";
import { Pill } from "@/components/ui-bits";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — GreenGuard AI" }] }),
  component: SignupPage,
});

// Administrator accounts can never be created through public registration —
// only Citizen (immediate access) and Authority (an access request, subject
// to Administrator approval) are offered here. See Phase 1.1 backend rules.
const ROLES = [
  {
    id: "citizen",
    label: "Citizen",
    tag: "Join immediately",
    tagTone: "success" as const,
    desc: "Report incidents, view local air and water quality, and follow advisories.",
    icon: User,
  },
  {
    id: "authority",
    label: "Authority",
    tag: "Approval required",
    tagTone: "warning" as const,
    desc: "Request official access to operate sensor networks, dispatch actions, and issue alerts.",
    icon: ShieldCheck,
  },
] as const;

type PublicRole = (typeof ROLES)[number]["id"];

// Role-specific copy. Authority framing is deliberately "access request"
// rather than "signup" — the account isn't active until an Administrator
// approves it.
const COPY: Record<
  PublicRole,
  { heading: string; subheading: string; submitLabel: string; submitLoadingLabel: string }
> = {
  citizen: {
    heading: "Create your account",
    subheading: "Join the environmental intelligence network.",
    submitLabel: "Create account",
    submitLoadingLabel: "Creating account…",
  },
  authority: {
    heading: "Authority Access Request",
    subheading:
      "Submit your official request to access the GreenGuard Authority Portal. Your request will be reviewed by a platform administrator before your account is activated.",
    submitLabel: "Submit Access Request",
    submitLoadingLabel: "Submitting request…",
  },
};

function SignupPage() {
  const navigate = useNavigate();
  const { signup, user, isAuthenticated, isLoading } = useAuth();
  const [role, setRole] = useState<PublicRole>("citizen");
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    password: "",
  });
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Set once an Authority access request has been submitted successfully.
  // Pending Authority accounts have no session/tokens (see auth-context's
  // signup()), so there's nothing to redirect into — show a confirmation
  // instead.
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Avoid flashing the signup form while the session is still being
  // restored, and redirect away immediately if the user is already
  // authenticated rather than showing them a signup form they don't need.
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      navigate({ to: getRoleLandingPage(user.role) });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requestSubmitted) {
    return <AuthorityRequestSubmitted />;
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in required fields.");
      return;
    }
    if (!agree) {
      setError("Please accept the terms to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { user: newUser, pending } = await signup({ ...form, role });
      if (pending) {
        setRequestSubmitted(true);
      } else {
        navigate({ to: getRoleLandingPage(newUser.role) });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[role];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <span className="font-semibold">GreenGuard AI</span>
        </Link>

        <div className="glass rounded-3xl p-8 lg:p-10">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.heading}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{copy.subheading}</p>

          <div className="mt-8">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Choose your role
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRole(r.id);
                    setError("");
                  }}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all",
                    role === r.id
                      ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="size-9 rounded-lg glass grid place-items-center">
                      <r.icon className="size-4 text-primary" />
                    </div>
                    <Pill tone={r.tagTone}>{r.tag}</Pill>
                  </div>
                  <div className="mt-3 font-medium">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 grid sm:grid-cols-2 gap-4">
            <Field
              label="Full name *"
              placeholder="Ada Lovelace"
              value={form.name}
              onChange={set("name")}
            />
            <Field
              label="Email *"
              type="email"
              placeholder="you@city.gov"
              value={form.email}
              onChange={set("email")}
            />
            <Field
              label="Organization"
              placeholder="City Pollution Control Board"
              value={form.organization}
              onChange={set("organization")}
            />
            <Field
              label="Phone"
              placeholder="+91 98xxxxxx"
              value={form.phone}
              onChange={set("phone")}
            />
            <Field
              className="sm:col-span-2"
              label="Password * (min 8 chars, upper, lower, number)"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={set("password")}
            />

            <label className="sm:col-span-2 flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the Terms of Service and Data Processing Addendum.
            </label>

            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-2 w-full aurora text-primary-foreground rounded-lg py-2.5 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? copy.submitLoadingLabel : copy.submitLabel}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Authority request confirmation ────────────────────────────────────────
// Shown in place of the form once an Authority access request has been
// submitted. No tokens exist at this point, so this deliberately does not
// redirect into the app — only back to /login, for once the request has
// been approved.
function AuthorityRequestSubmitted() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <span className="font-semibold">GreenGuard AI</span>
        </Link>

        <div className="glass rounded-3xl p-8 lg:p-10 text-center">
          <div className="mx-auto size-12 rounded-full bg-primary/10 border border-primary/20 grid place-items-center">
            <CheckCircle2 className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-6">
            Request Submitted Successfully
          </h1>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Your Authority Access Request has been received. Your account is currently under review.
          </p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            You'll be able to log in once your request has been approved by an Administrator.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center justify-center aurora text-primary-foreground rounded-lg py-2.5 px-6 text-sm font-medium shadow-[var(--shadow-glow)]"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  ...rest
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1.5 w-full rounded-lg border border-input bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
