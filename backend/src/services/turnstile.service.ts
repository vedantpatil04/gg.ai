import axios from "axios";

const CLOUDFLARE_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEV_FALLBACK_TEST_SECRET = "1x0000000000000000000000000000000AA";

export interface TurnstileVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Server-side verification for Cloudflare Turnstile CAPTCHA tokens.
 *
 * @param token - The Turnstile response token provided by the client widget.
 * @param remoteIp - Optional remote client IP address.
 * @returns Object with `success: true` or `success: false` and a user-safe error message.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<TurnstileVerificationResult> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    return {
      success: false,
      error: "Security verification is required. Please complete the CAPTCHA.",
    };
  }

  const isProduction = process.env.NODE_ENV === "production";
  const configuredSecret = process.env.TURNSTILE_SECRET_KEY;

  if (!configuredSecret) {
    if (isProduction) {
      console.error("[Security] Turnstile verification failed: TURNSTILE_SECRET_KEY is not configured in production environment.");
      return {
        success: false,
        error: "Security verification service is unavailable. Please contact support.",
      };
    }
  }

  const secretKey = configuredSecret || DEV_FALLBACK_TEST_SECRET;

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const response = await axios.post<{
      success: boolean;
      "error-codes"?: string[];
      challenge_ts?: string;
      hostname?: string;
    }>(CLOUDFLARE_TURNSTILE_VERIFY_URL, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });

    if (response.data && response.data.success === true) {
      return { success: true };
    }

    return {
      success: false,
      error: "Security verification failed. Please try again.",
    };
  } catch (err: unknown) {
    console.error("[Security] Turnstile verification network/server failure:", (err as Error)?.message || "Unknown error");
    return {
      success: false,
      error: "Unable to verify the security check. Please try again.",
    };
  }
}
