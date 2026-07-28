import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api/auth.api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — GreenGuard AI" }] }),
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  // A missing token means the link itself is malformed — there's nothing to
  // submit, so this is treated as invalid from the start rather than surfaced
  // as a form-submit error.
  const [invalidLink, setInvalidLink] = useState(!token);

  // Auto-redirect to Login a couple seconds after a successful reset, so the
  // confirmation is still visible but the person isn't stuck here.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate({ to: "/login" }), 2500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setInvalidLink(true);
      return;
    }
    if (password.length < 8 || !PASSWORD_RULE.test(password)) {
      setError(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      );
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg && /token/i.test(msg)) {
        setInvalidLink(true);
      } else {
        setError(msg ?? "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <span className="font-semibold">GreenGuard AI</span>
        </Link>

        {invalidLink ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="size-12 rounded-full bg-destructive/15 grid place-items-center mx-auto">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Link invalid or expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This password reset link is no longer valid. Reset links expire after 1 hour and can
              only be used once.
            </p>
            <Link
              to="/forgot-password"
              className="mt-6 inline-flex w-full items-center justify-center aurora text-primary-foreground rounded-lg py-2.5 text-sm font-medium"
            >
              Request a new link
            </Link>
          </div>
        ) : success ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="size-12 rounded-full bg-success/15 grid place-items-center mx-auto">
              <CheckCircle className="size-6 text-[var(--color-success)]" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Password updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been changed. Redirecting you to sign in…
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex w-full items-center justify-center aurora text-primary-foreground rounded-lg py-2.5 text-sm font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="glass rounded-2xl p-8">
            <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Min 8 characters, with uppercase, lowercase, and a number.
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs text-muted-foreground">New password</span>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background/40 px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="text-xs text-muted-foreground">Confirm password</span>
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full aurora text-primary-foreground rounded-lg py-2.5 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted-foreground text-center">
              <Link to="/login" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
