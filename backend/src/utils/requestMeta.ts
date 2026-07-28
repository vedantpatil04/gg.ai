import { Request } from "express";

/**
 * Security Center Phase 1 — lightweight User-Agent parsing.
 *
 * Deliberately not a new npm dependency: this covers the common
 * browsers/OSes well enough for a Security Center's session/login-history
 * display without pulling in a full parsing library. Unrecognized strings
 * degrade gracefully to "Unknown" / "Other" rather than throwing.
 */
export interface RequestMeta {
  device: string;
  browser: string;
  os: string;
  ip?: string;
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/crios\//i.test(ua)) return "Chrome";
  if (/fxios\//i.test(ua) || /firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua) && /version\//i.test(ua)) return "Safari";
  if (/msie |trident\//i.test(ua)) return "Internet Explorer";
  return "Other";
}

function parseOS(ua: string): string {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua) && !/iphone|ipad/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function parseDevice(ua: string): string {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android.*mobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

export function getRequestMeta(req: Request): RequestMeta {
  const ua = req.headers["user-agent"] || "";
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(",")[0].trim()) ||
    req.ip ||
    req.socket?.remoteAddress ||
    undefined;

  return {
    device: parseDevice(ua),
    browser: parseBrowser(ua),
    os: parseOS(ua),
    ip,
  };
}
