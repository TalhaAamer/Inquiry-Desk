"use client";

import { useEffect, useRef } from "react";

// Sign out after this long without any activity, and never keep one sign-in longer than the maximum.
const IDLE_MS = 30 * 60 * 1000;
const MAX_MS = 12 * 60 * 60 * 1000;
const KEY = "inquiryDeskLastActive";

function lastActive(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function useSessionTimeout(signedIn: boolean, signOut: () => Promise<void>, signedInAt?: string) {
  const out = useRef(signOut);
  useEffect(() => {
    out.current = signOut;
  });

  useEffect(() => {
    if (!signedIn) return;
    const started = signedInAt ? new Date(signedInAt).getTime() : 0;
    const touch = () => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {}
    };
    const check = () => {
      const now = Date.now();
      const la = lastActive();
      // A timestamp from before this sign-in belongs to an earlier session.
      const idle = la >= started && la > 0 && now - la > IDLE_MS;
      const old = started && now - started > MAX_MS;
      if (idle || old) {
        try {
          localStorage.removeItem(KEY);
        } catch {}
        void out.current();
      }
    };
    // A fresh page load counts as activity only if the saved session is still within its idle limit.
    check();
    if (lastActive() < started || !lastActive()) touch();
    let last = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - last > 15_000) {
        last = now;
        touch();
      }
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [signedIn, signedInAt]);
}
