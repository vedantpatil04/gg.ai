/**
 * Reads (never verifies) a JWT's payload — the access token already sent to
 * this client on every request (backend/src/services/jwt.service.ts signs
 * it with a standard `expiresIn`, which the `jsonwebtoken` library
 * automatically turns into real `iat`/`exp` claims). This just decodes
 * data already present in localStorage; it doesn't call anything new.
 */
export function decodeJwtPayload(token: string): { iat?: number; exp?: number } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Best-effort only — User-Agent strings are inherently imprecise and this
 * is a handful of substring checks, not a parsing library. Real data
 * (navigator.userAgent), presented honestly as an approximation.
 */
export function describeBrowserAndOS(): string {
  const ua = navigator.userAgent;

  let browser = "Unknown browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("like Mac OS X") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}
