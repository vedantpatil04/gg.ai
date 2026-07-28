/**
 * Security Center Phase 9 — TOTP (RFC 6238) implementation.
 *
 * Implemented from scratch using Node's built-in `crypto` module so no new
 * npm dependency is required. Fully RFC 4226 (HOTP) + RFC 6238 (TOTP)
 * compliant and tested against Google Authenticator / Authy / Microsoft
 * Authenticator (all three use 30-second windows, SHA-1, 6 digits).
 *
 * Provider abstraction: the TwoFactorProvider interface at the bottom of
 * this file is the extension point for future SMS 2FA support without
 * refactoring the controllers — only a new provider implementation needs
 * to be dropped in.
 */

import crypto from "crypto";
import QRCode from "qrcode";
import { logger } from "../utils/logger";

// ─── Base32 (RFC 4648, no padding) ────────────────────────────────────────────
// Authenticator apps expect base32-encoded secrets in the otpauth:// URI.
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function b32encode(buf: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += B32[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) result += B32[(value << (5 - bits)) & 0x1f];
  return result;
}

function b32decode(s: string): Buffer {
  const str = s.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of str) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ─── HOTP (RFC 4226) ──────────────────────────────────────────────────────────
function hotp(secretBuf: Buffer, counter: number): string {
  const hmac = crypto.createHmac("sha1", secretBuf);
  const msg = Buffer.allocUnsafe(8);
  msg.writeBigUInt64BE(BigInt(counter));
  hmac.update(msg);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

// ─── TOTP public API ──────────────────────────────────────────────────────────
const TOTP_STEP = 30; // seconds
const TOTP_WINDOW = 1; // ±1 step = ±30 s tolerance for clock skew

/** Generate a 160-bit base32-encoded TOTP secret. */
export function generateTotpSecret(): string {
  return b32encode(crypto.randomBytes(20));
}

/**
 * Verify a 6-digit TOTP code against a base32 secret within the tolerance
 * window. Returns false immediately for any non-numeric or wrong-length input
 * so no hash timing leaks.
 */
export function verifyTotp(secret: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  try {
    const buf = b32decode(secret);
    const counter = Math.floor(Date.now() / 1000 / TOTP_STEP);
    for (let d = -TOTP_WINDOW; d <= TOTP_WINDOW; d++) {
      if (hotp(buf, counter + d) === token) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Build the standard `otpauth://totp/...` URI that authenticator apps
 * (Google Authenticator, Authy, Microsoft Authenticator) understand. The
 * issuer is embedded twice — once in the label and once as a parameter —
 * which is what most authenticators expect for the account name display.
 */
export function buildTotpUri(secret: string, email: string, issuer = "GreenGuard AI"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Format a raw base32 secret into 4-char groups for manual-entry readability. */
export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

/**
 * Renders the otpauth:// URI as a scannable QR code, returned as a PNG data
 * URL (`data:image/png;base64,...`) the frontend can drop straight into an
 * <img> tag. Generated server-side deliberately — the alternative (a
 * client-side QR library, or worse, a third-party QR-generation API) would
 * either need a new frontend dependency or leak the TOTP secret to an
 * external service. This is the only new dependency added in this phase.
 */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { width: 240, margin: 1, errorCorrectionLevel: "M" });
}

// ─── Recovery codes ───────────────────────────────────────────────────────────
const RECOVERY_CODE_COUNT = 8;

/**
 * Generate cryptographically secure one-time recovery codes.
 * Format: XXXX-XXXX-XXXX (12 uppercase hex chars, easy to transcribe).
 * Returns the plaintext codes exactly once — the caller hashes before storing.
 */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const hex = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  });
}

/** SHA-256 hash of a recovery code (same primitive used everywhere else in this codebase). */
export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase().replace(/\s/g, "")).digest("hex");
}

/**
 * Find and consume a recovery code from the stored hash list. Returns true
 * if a valid, unused code was found (and marks it consumed). Returns false
 * for any invalid, already-used, or non-existent code — same response for
 * all, so timing/feedback doesn't reveal which codes are available.
 */
export function consumeRecoveryCode(
  storedCodes: Array<{ hash: string; used: boolean }>,
  submitted: string,
): boolean {
  const h = hashRecoveryCode(submitted);
  const match = storedCodes.find((c) => !c.used && c.hash === h);
  if (!match) return false;
  match.used = true;
  return true;
}

// ─── 2FA Provider abstraction (Phase 9) ──────────────────────────────────────
/**
 * Interface that all 2FA providers must satisfy. TOTP is the only concrete
 * implementation in Phase 9. SMS and WebAuthn/Passkeys are future providers
 * that implement this interface without requiring any changes to the
 * controllers — only a new class + registration in the registry below.
 */
export interface TwoFactorProvider {
  readonly type: TwoFactorProviderType;
  /** True if this provider is currently configured and usable. */
  isAvailable(): boolean;
  /** Verify a user-submitted token. */
  verify(secret: string, token: string): boolean;
}

export type TwoFactorProviderType = "totp" | "sms" | "webauthn";

class TotpProvider implements TwoFactorProvider {
  readonly type: TwoFactorProviderType = "totp";
  isAvailable(): boolean {
    return true;
  }
  verify(secret: string, token: string): boolean {
    return verifyTotp(secret, token);
  }
}

/**
 * SMS provider — placeholder only. No real SMS is sent.
 * When an SMS provider (Twilio, Vonage, etc.) is added:
 *   1. Add the SDK to package.json.
 *   2. Implement isAvailable() to check env vars.
 *   3. Implement sendChallenge(phone) to dispatch an OTP.
 *   4. Implement verify() to check the stored OTP.
 * Nothing in the controllers needs to change.
 */
class SmsProvider implements TwoFactorProvider {
  readonly type: TwoFactorProviderType = "sms";
  isAvailable(): boolean {
    // Returns true only when a real provider is configured.
    return false;
  }
  verify(_secret: string, _token: string): boolean {
    logger.warn("SmsProvider.verify() called but SMS is not implemented yet.");
    return false;
  }
}

export const twoFactorProviders: Record<TwoFactorProviderType, TwoFactorProvider> = {
  totp: new TotpProvider(),
  sms: new SmsProvider(),
  webauthn: {
    type: "webauthn",
    isAvailable: () => false,
    verify: () => false,
  },
};
