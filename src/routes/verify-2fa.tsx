import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield, AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { authApi } from "@/lib/api/auth.api";
import { useAuth } from "@/lib/auth-context";
import { setTokens } from "@/lib/api/client";
import { getRoleLandingPage } from "@/components/protected-route";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";

const searchSchema = z.object({
  challengeToken: z.string().optional(),
});

export const Route = createFileRoute("/verify-2fa")({
  head: () => ({ meta: [{ title: "Two-Factor Verification — GreenGuard AI" }] }),
  validateSearch: searchSchema,
  component: Verify2FAPage,
});

function Verify2FAPage() {
  const { challengeToken } = Route.useSearch();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setError("");
  }, [code, recoveryCode]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const submittedCode = useRecovery ? recoveryCode.trim() : code;

      if (!submittedCode || (!useRecovery && submittedCode.length < 6)) {
        setError(
          useRecovery
            ? "Enter your recovery code."
            : "Enter the 6-digit code from your authenticator app.",
        );
        return;
      }

      setError("");
      setLoading(true);
      try {
        const res = await authApi.complete2FAChallenge(
          challengeToken!,
          submittedCode,
          useRecovery,
        );
        const { user, accessToken, refreshToken } = res.data;
        setTokens(accessToken, refreshToken);
        await refreshUser();
        setSuccess(true);
        setTimeout(() => {
          navigate({ to: getRoleLandingPage(user.role) });
        }, 900);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message;
        setError(msg ?? "Invalid code. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [challengeToken, code, recoveryCode, useRecovery, navigate, refreshUser],
  );

  if (!challengeToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground">
              <Shield className="size-4" />
            </div>
            <span className="font-semibold">GreenGuard AI</span>
          </Link>
          <div className="glass rounded-2xl p-8 text-center">
            <div className="size-12 rounded-full bg-destructive/15 grid place-items-center mx-auto">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">Session expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No active 2FA challenge. Please sign in again.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex w-full items-center justify-center aurora text-primary-foreground rounded-lg py-2.5 text-sm font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="size-8 rounded-lg aurora grid place-items-center text-primary-foreground">
            <Shield className="size-4" />
          </div>
          <span className="font-semibold">GreenGuard AI</span>
        </Link>

        <div className="glass rounded-2xl p-8">
          {success ? (
            <div className="text-center">
              <div className="size-12 rounded-full bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] grid place-items-center mx-auto">
                <ShieldCheck className="size-6 text-[var(--color-success)]" />
              </div>
              <h1 className="mt-4 text-xl font-semibold">Verified!</h1>
              <p className="mt-2 text-sm text-muted-foreground">Signing you in…</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="size-12 rounded-full bg-primary/10 grid place-items-center mx-auto mb-4">
                  <KeyRound className="size-6 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {useRecovery ? "Recovery code" : "Two-factor verification"}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {useRecovery
                    ? "Enter one of your saved recovery codes."
                    : "Enter the 6-digit code from your authenticator app."}
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              <form id="verify-2fa-form" onSubmit={handleSubmit} noValidate>
                {useRecovery ? (
                  <label className="block mb-5">
                    <span className="text-xs text-muted-foreground">Recovery code</span>
                    <input
                      id="recovery-code-input"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      autoFocus
                      placeholder="xxxx-xxxx-xxxx"
                      value={recoveryCode}
                      disabled={loading}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background/40 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 tracking-widest font-mono"
                    />
                  </label>
                ) : (
                  <div className="flex justify-center mb-6">
                    <InputOTP
                      id="otp-input"
                      maxLength={6}
                      value={code}
                      onChange={(val) => setCode(val)}
                      disabled={loading}
                      pattern={REGEXP_ONLY_DIGITS}
                      autoFocus
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                )}

                <button
                  id="verify-2fa-submit"
                  type="submit"
                  disabled={
                    loading ||
                    (!useRecovery && code.length < 6) ||
                    (useRecovery && !recoveryCode.trim())
                  }
                  className="w-full aurora text-primary-foreground rounded-lg py-2.5 text-sm font-medium shadow-[var(--shadow-glow)] disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  id="toggle-recovery-code"
                  type="button"
                  onClick={() => {
                    setUseRecovery((v) => !v);
                    setCode("");
                    setRecoveryCode("");
                    setError("");
                  }}
                  className="text-xs text-primary hover:underline underline-offset-4 bg-transparent border-none cursor-pointer p-0"
                >
                  {useRecovery
                    ? "Use authenticator code instead"
                    : "Lost access? Use a recovery code"}
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link to="/login" className="hover:underline underline-offset-4">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
