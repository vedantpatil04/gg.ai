/**
 * msg91.ts — MSG91 Custom UI Web SDK Integration
 *
 * Integrates MSG91's Web SDK for Custom UI:
 * SDK URL: https://verify.msg91.com/otp-provider.js
 *
 * Exposes sendOtp, verifyOtp, and retryOtp behind GreenGuard's existing UI.
 * Never exposes the MSG91 AuthKey on the frontend.
 */

declare global {
  interface Window {
    initSendOTP?: (config: Msg91Config) => void;
    sendOtp?: (
      identifier: string,
      success?: (data: any) => void,
      failure?: (error: any) => void,
    ) => void;
    verifyOtp?: (
      otp: string | number,
      success?: (data: any) => void,
      failure?: (error: any) => void,
    ) => void;
    retryOtp?: (
      channel: string | number | null,
      success?: (data: any) => void,
      failure?: (error: any) => void,
      retryToken?: string,
    ) => void;
    ENV?: Record<string, string>;
  }
}

export interface Msg91Config {
  widgetId: string;
  tokenAuth?: string;
  exposeMethods: boolean;
  success?: (data: any) => void;
  failure?: (error: any) => void;
}

export interface Msg91VerifyResult {
  accessToken: string;
  raw: any;
}

let scriptLoadingPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Reads the MSG91 Widget ID from Vite environment or runtime window.ENV.
 */
export function getMsg91WidgetId(): string {
  const envVal =
    (import.meta as any).env?.VITE_MSG91_WIDGET_ID ||
    (typeof window !== "undefined" ? window.ENV?.VITE_MSG91_WIDGET_ID : "") ||
    "";

  if (
    !envVal ||
    envVal === "your_msg91_widget_id_here" ||
    envVal.includes("<use the widget ID")
  ) {
    return "";
  }
  return envVal.trim();
}

/**
 * Returns true if an MSG91 Widget ID is configured in the environment.
 */
export function isMsg91Configured(): boolean {
  return Boolean(getMsg91WidgetId());
}

/**
 * Normalizes phone numbers for MSG91 (digits only, country code included, no leading +).
 */
export function formatPhoneForMsg91(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If 10 digits (e.g. Indian standard mobile), prepend country code 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Dynamically loads the MSG91 SDK script from https://verify.msg91.com/otp-provider.js
 * and initializes window.initSendOTP with exposeMethods: true.
 */
export function loadMsg91Sdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (typeof window.initSendOTP === "function" && isInitialized) return Promise.resolve();

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    if (typeof window.initSendOTP === "function") {
      initSdk();
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="verify.msg91.com/otp-provider.js"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        initSdk();
        resolve();
      });
      existingScript.addEventListener("error", () => {
        scriptLoadingPromise = null;
        reject(new Error("Failed to load MSG91 SDK script."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://verify.msg91.com/otp-provider.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
      initSdk();
      resolve();
    };
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("Failed to load MSG91 OTP SDK from https://verify.msg91.com/otp-provider.js"));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

function initSdk(): void {
  const widgetId = getMsg91WidgetId();
  if (!widgetId) return;

  if (typeof window.initSendOTP === "function") {
    try {
      window.initSendOTP({
        widgetId,
        exposeMethods: true,
        success: (data: any) => {
          // Global SDK callback (optional hook)
          if (process.env.NODE_ENV !== "production") {
            console.debug("[MSG91 SDK] Global success:", data);
          }
        },
        failure: (error: any) => {
          if (process.env.NODE_ENV !== "production") {
            console.debug("[MSG91 SDK] Global failure:", error);
          }
        },
      });
      isInitialized = true;
    } catch (err) {
      console.warn("[MSG91 SDK] initSendOTP error:", err);
    }
  }
}

/**
 * Triggers MSG91 sendOtp for the given phone number using the Custom UI SDK.
 */
export async function sendMsg91Otp(phone: string): Promise<any> {
  const widgetId = getMsg91WidgetId();
  if (!widgetId) {
    throw new Error("MSG91 Widget ID is not configured (VITE_MSG91_WIDGET_ID missing).");
  }

  await loadMsg91Sdk();

  if (typeof window.sendOtp !== "function") {
    initSdk();
    if (typeof window.sendOtp !== "function") {
      throw new Error("MSG91 sendOtp method not exposed by SDK.");
    }
  }

  const identifier = formatPhoneForMsg91(phone);
  if (!identifier) {
    throw new Error("Please enter a valid phone number.");
  }

  return new Promise((resolve, reject) => {
    try {
      window.sendOtp!(
        identifier,
        (data: any) => resolve(data),
        (error: any) => {
          const msg = extractMsg91ErrorMessage(error);
          reject(new Error(msg));
        },
      );
    } catch (err: any) {
      reject(new Error(err?.message || "Failed to trigger sendOtp with MSG91."));
    }
  });
}

/**
 * Verifies the user-entered OTP with MSG91 and retrieves the verification access token.
 */
export async function verifyMsg91Otp(otp: string): Promise<Msg91VerifyResult> {
  const widgetId = getMsg91WidgetId();
  if (!widgetId) {
    throw new Error("MSG91 Widget ID is not configured.");
  }

  await loadMsg91Sdk();

  if (typeof window.verifyOtp !== "function") {
    initSdk();
    if (typeof window.verifyOtp !== "function") {
      throw new Error("MSG91 verifyOtp method not exposed by SDK.");
    }
  }

  const cleanOtp = otp.replace(/\D/g, "").trim();
  if (cleanOtp.length !== 6) {
    throw new Error("Please enter a valid 6-digit verification code.");
  }

  return new Promise((resolve, reject) => {
    try {
      window.verifyOtp!(
        cleanOtp,
        (data: any) => {
          let token = "";
          if (typeof data === "string") {
            token = data;
          } else if (data && typeof data === "object") {
            token =
              data["access-token"] ||
              data.accessToken ||
              data.token ||
              data.jwt ||
              data.data?.["access-token"] ||
              data.data?.token ||
              (typeof data.message === "string" && data.message.length > 20 ? data.message : "") ||
              "";
          }

          if (!token && typeof data?.message === "string") {
            token = data.message;
          } else if (!token && data) {
            token = JSON.stringify(data);
          }

          resolve({ accessToken: token, raw: data });
        },
        (error: any) => {
          const msg = extractMsg91ErrorMessage(error);
          reject(new Error(msg));
        },
      );
    } catch (err: any) {
      reject(new Error(err?.message || "Failed to verify OTP with MSG91."));
    }
  });
}

/**
 * Triggers MSG91 retryOtp to resend verification code.
 */
export async function retryMsg91Otp(phone?: string, channel?: string): Promise<any> {
  await loadMsg91Sdk();

  return new Promise((resolve, reject) => {
    try {
      if (typeof window.retryOtp === "function") {
        window.retryOtp(
          channel || null,
          (data: any) => resolve(data),
          (error: any) => {
            // If retryOtp fails and phone is provided, fallback to sendOtp
            if (phone) {
              sendMsg91Otp(phone).then(resolve).catch(reject);
            } else {
              reject(new Error(extractMsg91ErrorMessage(error)));
            }
          },
        );
      } else if (phone) {
        sendMsg91Otp(phone).then(resolve).catch(reject);
      } else {
        reject(new Error("Resend method unavailable."));
      }
    } catch (err: any) {
      if (phone) {
        sendMsg91Otp(phone).then(resolve).catch(reject);
      } else {
        reject(new Error(err?.message || "Failed to resend code."));
      }
    }
  });
}

function extractMsg91ErrorMessage(err: any): string {
  if (!err) return "Verification failed. Please check the code and try again.";
  if (typeof err === "string") return err;
  if (err.message) return String(err.message);
  if (err.error) return String(err.error);
  if (err.description) return String(err.description);
  return "Verification code is incorrect or expired. Please try again.";
}
