"use client";

import { useEffect, useRef, useState } from "react";

type TurnstileConfig = { enabled: boolean; siteKey: string };
type TurnstileAPI = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

let scriptPromise: Promise<TurnstileAPI> | null = null;

function loadTurnstile(): Promise<TurnstileAPI> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  const loading = new Promise<TurnstileAPI>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile did not initialize."));
    };
    script.onerror = () => reject(new Error("Turnstile could not be loaded."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });
  scriptPromise = loading;
  return loading;
}

export default function TurnstileWidget({
  action,
  onToken,
  resetKey,
}: {
  action: "auth" | "contact";
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const [config, setConfig] = useState<TurnstileConfig | null>(null);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const lastResetKey = useRef(resetKey);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let active = true;
    fetch("/api/security/turnstile", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body || typeof body.enabled !== "boolean" || typeof body.siteKey !== "string") {
          throw new Error("Could not load human verification settings.");
        }
        if (active) setConfig(body as TurnstileConfig);
      })
      .catch(() => {
        if (active) setError("Human verification could not be configured. Please refresh and try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.siteKey) return;
    let active = true;
    void loadTurnstile()
      .then((api) => {
        if (!active || !container.current) return;
        widgetId.current = api.render(container.current, {
          sitekey: config.siteKey,
          action,
          theme: "auto",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => {
            onTokenRef.current("");
            if (active) setError("Human verification failed to load. Please refresh and try again.");
          },
        });
      })
      .catch(() => {
        if (active) setError("Human verification could not be loaded. Please refresh and try again.");
      });
    return () => {
      active = false;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [config, action]);

  useEffect(() => {
    if (lastResetKey.current === resetKey) return;
    lastResetKey.current = resetKey;
    onTokenRef.current("");
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (error) return <p className="text-sm text-hot" role="alert">{error}</p>;
  if (!config) return <p className="text-sm text-muted" role="status">Loading human verification…</p>;
  if (!config.enabled) return null;
  if (!config.siteKey) {
    return <p className="text-sm text-hot" role="alert">Human verification is not configured. Please contact the site administrator.</p>;
  }
  return <div ref={container} className="min-h-[65px]" aria-label="Human verification" />;
}
