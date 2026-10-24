"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, useAuth } from "../lib/auth";
import { Illustration } from "./AuthScreen";
import OtpInput, { OTP_LENGTH } from "./OtpInput";
import ThemeToggle from "./ThemeToggle";

interface OtpReply {
  verified?: boolean;
  email?: string;
  expiresIn?: number;
  resendIn?: number;
  detail?: string;
}

const clock = (secs: number) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

export default function VerifyScreen() {
  const { user, loading, verified, recheckVerified, signOut } = useAuth();
  const router = useRouter();
  const [masked, setMasked] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const [dead, setDead] = useState(false);
  const [code, setCode] = useState("");
  const [now, setNow] = useState(0);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const started = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (verified && !done) router.replace("/app");
  }, [user, loading, verified, done, router]);

  const apply = useCallback((r: OtpReply) => {
    const at = Date.now();
    if (r.email) setMasked(r.email);
    setExpiresAt(r.expiresIn ? at + r.expiresIn * 1000 : null);
    setResendAt(r.resendIn ? at + r.resendIn * 1000 : 0);
    setNow(at);
  }, []);

  const request = useCallback(
    async (fresh: boolean) => {
      setSending(true);
      setError("");
      try {
        const res = await apiFetch("/api/otp/send", { method: "POST" });
        const data: OtpReply = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || "Could not send the code. Please try again.");
        if (data.verified) {
          await recheckVerified();
          return;
        }
        apply(data);
        setDead(false);
        setCode("");
        if (fresh) setInfo(`A new code is on its way to ${data.email ?? "your email"}.`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not send the code. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [apply, recheckVerified],
  );

  // On arrival, keep a code that is still valid (for example after a refresh); otherwise send one.
  useEffect(() => {
    if (loading || !user || verified || started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await apiFetch("/api/otp/status");
        const data: OtpReply = await res.json().catch(() => ({}));
        if (res.ok && data.expiresIn) {
          apply(data);
          return;
        }
        if (res.ok && data.email) setMasked(data.email);
      } catch {
        // Falls through to sending a new code.
      }
      await request(false);
    })();
  }, [loading, user, verified, apply, request]);

  async function check(value: string) {
    if (checking || value.length !== OTP_LENGTH) return;
    setChecking(true);
    setError("");
    setInfo("");
    try {
      const res = await apiFetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const data: OtpReply = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.detail === "string" ? data.detail : "Could not check the code.";
        if (/request a new one/i.test(msg)) setDead(true);
        setError(msg);
        setCode("");
        return;
      }
      setDone(true);
      await recheckVerified();
      router.replace("/app");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setCode("");
    } finally {
      setChecking(false);
    }
  }

  async function switchAccount() {
    await signOut();
    window.location.replace("/login");
  }

  const left = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0;
  const expired = dead || (expiresAt !== null && left === 0);
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const canResend = !sending && !checking && !done && cooldown === 0;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Illustration />

      <main className="flex min-h-screen flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={switchAccount}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Use a different account
          </button>
          <ThemeToggle />
        </div>

        <div className="grid flex-1 place-items-center py-8">
          <div className="w-full max-w-md">
            <p className="mb-6 text-center font-display text-2xl font-bold tracking-tight">
              Inquiry Desk
            </p>
            <div className="rounded-[20px] border border-line bg-card p-6 shadow-sm sm:p-8">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </div>
              <h1 className="text-center font-display text-2xl font-semibold">Check your email</h1>
              <p className="mt-2 text-center text-sm text-muted">
                {masked ? (
                  <>
                    We sent a 6-digit code to <strong className="text-ink">{masked}</strong>.
                  </>
                ) : (
                  "We are sending you a 6-digit code."
                )}{" "}
                Enter it below to finish setting up your account.
              </p>

              <div className="mt-6">
                <OtpInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    if (error) setError("");
                  }}
                  onComplete={check}
                  disabled={expired || checking || done || (!expiresAt && !expired)}
                  invalid={!!error}
                />
              </div>

              <div aria-live="polite" className="mt-4 min-h-10 text-center text-sm">
                {done ? (
                  <p className="font-semibold text-ok">Verified. Taking you to your workspace…</p>
                ) : error ? (
                  <p role="alert" className="text-hot">
                    {error}
                  </p>
                ) : expired ? (
                  <p className="text-warn">This code has expired. Send a new one below.</p>
                ) : info ? (
                  <p className="text-ok">{info}</p>
                ) : null}
              </div>

              {!done && expiresAt && !expired && (
                <p className="text-center text-sm text-muted">
                  Code expires in <span className="font-semibold tabular-nums text-ink">{clock(left)}</span>
                </p>
              )}

              {!done && (
                <button
                  type="button"
                  onClick={() => check(code)}
                  disabled={code.length !== OTP_LENGTH || checking || expired}
                  className="mt-5 w-full rounded-xl bg-accent py-3 font-semibold text-on disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {checking ? "Checking…" : "Verify and continue"}
                </button>
              )}

              {!done && (
                <div className="mt-4 text-center text-sm">
                  <span className="text-muted">Did not get it? </span>
                  <button
                    type="button"
                    onClick={() => request(true)}
                    disabled={!canResend}
                    className="font-semibold text-accent hover:underline disabled:text-muted disabled:no-underline"
                  >
                    {sending
                      ? "Sending…"
                      : cooldown > 0
                        ? `Send a new code in ${cooldown}s`
                        : "Send a new code"}
                  </button>
                  <p className="mt-2 text-xs text-muted">
                    Check your spam folder too. A new code replaces the old one.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
