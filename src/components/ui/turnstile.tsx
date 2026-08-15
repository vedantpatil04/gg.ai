import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  type CSSProperties,
} from "react";

// Cloudflare Turnstile official testing site key for explicit development fallback:
// "1x00000000000000000000AA" (Always passes)
const DEV_FALLBACK_SITE_KEY = "1x00000000000000000000AA";

export interface TurnstileRef {
  reset: () => void;
  getResponse: () => string | undefined;
}

export interface TurnstileProps {
  siteKey?: string;
  onSuccess: (token: string) => void;
  onError?: (error?: unknown) => void;
  onExpire?: () => void;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "flexible";
  className?: string;
  style?: CSSProperties;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          action?: string;
          cData?: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error?: unknown) => void;
          "timeout-callback"?: () => void;
          size?: "normal" | "compact" | "flexible";
          execution?: "render" | "execute";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
    onTurnstileLoaded?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.turnstile) return resolve();

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.turnstile) {
        return resolve();
      }
      const prevOnload = existingScript.onload;
      existingScript.onload = (e) => {
        if (typeof prevOnload === "function") {
          prevOnload.call(existingScript, e);
        }
        resolve();
      };
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

export const TurnstileWidget = forwardRef<TurnstileRef, TurnstileProps>(
  function TurnstileWidget(
    {
      siteKey: propSiteKey,
      onSuccess,
      onError,
      onExpire,
      theme = "dark",
      size = "normal",
      className,
      style,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const onSuccessRef = useRef(onSuccess);
    const onErrorRef = useRef(onError);
    const onExpireRef = useRef(onExpire);

    useEffect(() => {
      onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    useEffect(() => {
      onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
      onExpireRef.current = onExpire;
    }, [onExpire]);

    const siteKey =
      propSiteKey ||
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_TURNSTILE_SITE_KEY) ||
      DEV_FALLBACK_SITE_KEY;

    const reset = useCallback(() => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }, []);

    const getResponse = useCallback(() => {
      if (widgetIdRef.current && window.turnstile) {
        return window.turnstile.getResponse(widgetIdRef.current);
      }
      return undefined;
    }, []);

    useImperativeHandle(ref, () => ({
      reset,
      getResponse,
    }));

    useEffect(() => {
      let isMounted = true;

      loadTurnstileScript().then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;

        // Clean up previous widget if any
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore cleanup errors
          }
          widgetIdRef.current = null;
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            size,
            callback: (token: string) => {
              if (isMounted && onSuccessRef.current) {
                onSuccessRef.current(token);
              }
            },
            "error-callback": (err?: unknown) => {
              if (isMounted && onErrorRef.current) {
                onErrorRef.current(err);
              }
            },
            "expired-callback": () => {
              if (isMounted && onExpireRef.current) {
                onExpireRef.current();
              }
            },
          });
          widgetIdRef.current = id;
        } catch (renderError) {
          console.error("Turnstile render error:", renderError);
        }
      });

      return () => {
        isMounted = false;
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore removal errors
          }
          widgetIdRef.current = null;
        }
      };
    }, [siteKey, theme, size]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          display: "flex",
          justifyContent: "center",
          minHeight: "65px",
          ...style,
        }}
      />
    );
  },
);
