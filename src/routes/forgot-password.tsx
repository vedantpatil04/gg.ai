import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { authApi } from "@/lib/api/auth.api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — GreenGuard AI" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(trimmedEmail);
      setSent(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Could not send reset link. Please check your email and try again.";
      setError(message);
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

        {sent ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="size-12 rounded-full bg-success/15 grid place-items-center mx-auto">
              <CheckCircle className="size-6 text-[var(--color-success)]" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If <span className="text-foreground font-medium">{email.trim()}</span> is registered, a reset
              link has been sent. Check your spam folder if you don't see it.
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
            <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we'll send a reset link.
            </p>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs text-muted-foreground">Email address</span>
                <input
                  type="email"
                  placeholder="you@city.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Sending…
                  </>
                ) : (
                  "Send reset link"
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
