"use client";

import * as React from "react";

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export const TurnstileWidget = React.forwardRef<
  TurnstileWidgetRef,
  TurnstileWidgetProps
>(function TurnstileWidget({ onVerify, onError, onExpire, className }, ref) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      if (typeof window !== "undefined" && window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch {
          // ignore reset error
        }
      }
    },
  }));

  React.useEffect(() => {
    // If no site key is configured (local dev, test suite), bypass verification gracefully
    if (!siteKey || process.env.NODE_ENV === "test") {
      onVerify("bypass");
      return;
    }

    let isMounted = true;

    const renderWidget = () => {
      if (
        isMounted &&
        containerRef.current &&
        window.turnstile &&
        !widgetIdRef.current
      ) {
        try {
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token) => {
              if (isMounted) onVerify(token);
            },
            "error-callback": () => {
              if (isMounted && onError) onError();
            },
            "expired-callback": () => {
              if (isMounted && onExpire) onExpire();
            },
            theme: "light",
          });
        } catch (err) {
          console.error("Turnstile render error:", err);
        }
      }
    };

    if (typeof window !== "undefined") {
      if (window.turnstile) {
        renderWidget();
      } else {
        const existingScript = document.getElementById("turnstile-script");
        if (!existingScript) {
          window.onloadTurnstileCallback = renderWidget;
          const script = document.createElement("script");
          script.id = "turnstile-script";
          script.src =
            "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit";
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        } else {
          const interval = setInterval(() => {
            if (window.turnstile) {
              clearInterval(interval);
              renderWidget();
            }
          }, 100);
          return () => clearInterval(interval);
        }
      }
    }

    return () => {
      isMounted = false;
      if (
        typeof window !== "undefined" &&
        window.turnstile &&
        widgetIdRef.current
      ) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, [siteKey, onVerify, onError, onExpire]);

  if (!siteKey || process.env.NODE_ENV === "test") {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "my-3 flex justify-center"}
    />
  );
});
