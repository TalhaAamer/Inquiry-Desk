"use client";

import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { apiFetch, useAuth } from "../lib/auth";
import { auth } from "../lib/firebase";
import OtpInput from "./OtpInput";

const card = "rounded-[20px] border border-line bg-card p-5 shadow-sm sm:p-6";
const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const button =
  "rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function explain(err: unknown): string {
  switch ((err as { code?: string })?.code) {
    case "auth/invalid-phone-number":
      return "That phone number is not valid. Include the country code, like +14155550123.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a while and try again.";
    case "auth/invalid-verification-code":
      return "That code is not correct.";
    case "auth/code-expired":
      return "That code has expired. Send a new one.";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "That number is already used by another account.";
    case "auth/operation-not-allowed":
      return "Phone verification is not turned on for this app yet.";
    case "auth/billing-not-enabled":
    case "auth/quota-exceeded":
      return "Text messages cannot be sent right now. Please try again later.";
    case "auth/requires-recent-login":
      return "Please sign out and sign in again, then retry.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "The security check failed. Refresh the page and try again.";
    case "auth/unauthorized-domain":
      return "This website address is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
    case "auth/provider-already-linked":
      return "This account already has a phone number.";
    default: {
      const code = (err as { code?: string })?.code;
      console.error("Phone verification failed", err);
      return code
        ? `Something went wrong (${code}). Please try again.`
        : "Something went wrong. Please try again.";
    }
  }
}

export default function ContactDetails() {
  const { user, refreshUser } = useAuth();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<ConfirmationResult | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(
    () => () => {
      verifier.current?.clear();
      verifier.current = null;
    },
    [],
  );

  if (!user) return null;

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setNameBusy(true);
    setNameError("");
    try {
      const res = await apiFetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: first.trim(), last_name: last.trim() }),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        setNameError(
          res.status === 400 && typeof detail === "string"
            ? detail
            : "Could not save your name. Please try again.",
        );
        return;
      }
      await refreshUser();
    } catch {
      setNameError("Could not save your name. Please try again.");
    } finally {
      setNameBusy(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const current = auth.currentUser;
    if (!current || !box.current) return;
    setPhoneBusy(true);
    setPhoneError("");
    try {
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(auth, box.current, { size: "invisible" });
      setSent(await linkWithPhoneNumber(current, phone.replace(/[\s()-]/g, ""), verifier.current));
      setCode("");
    } catch (err) {
      setPhoneError(explain(err));
      verifier.current?.clear();
      verifier.current = null;
    } finally {
      setPhoneBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!sent) return;
    setPhoneBusy(true);
    setPhoneError("");
    try {
      await sent.confirm(code);
      setSent(null);
      setPhone("");
      await refreshUser();
    } catch (err) {
      setPhoneError(explain(err));
    } finally {
      setPhoneBusy(false);
    }
  }

  const hasName = Boolean(user.displayName);
  const hasPhone = Boolean(user.phoneNumber);

  return (
    <section className={card} aria-label="Contact details">
      <h2 className="mb-4 font-display text-lg font-semibold">Name and phone number</h2>
      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Name</h3>
          {hasName ? (
            <p className="font-medium">{user.displayName}</p>
          ) : (
            <form onSubmit={saveName} className="space-y-3">
              <p className="text-sm text-muted">You have not added your name yet.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  className={field}
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  maxLength={50}
                  required
                  aria-label="First name"
                />
                <input
                  className={field}
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  maxLength={50}
                  required
                  aria-label="Last name"
                />
              </div>
              <button type="submit" disabled={nameBusy || !first.trim() || !last.trim()} className={button}>
                {nameBusy ? "Saving…" : "Save name"}
              </button>
              {nameError && (
                <p role="alert" className="text-sm text-hot">
                  {nameError}
                </p>
              )}
            </form>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Phone number</h3>
          {hasPhone ? (
            <p className="flex flex-wrap items-center gap-2 font-medium">
              {user.phoneNumber}
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                Verified
              </span>
            </p>
          ) : sent ? (
            <form onSubmit={confirm} className="space-y-3">
              <p className="text-sm text-muted">
                We texted a 6-digit code to {phone}. Enter it to verify your number.
              </p>
              <OtpInput value={code} onChange={setCode} disabled={phoneBusy} />
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={phoneBusy || code.length !== 6} className={button}>
                  {phoneBusy ? "Checking…" : "Verify number"}
                </button>
                <button
                  type="button"
                  disabled={phoneBusy}
                  onClick={() => {
                    setSent(null);
                    setPhoneError("");
                  }}
                  className={button}
                >
                  Use a different number
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={sendCode} className="space-y-3">
              <p className="text-sm text-muted">
                Add your number with the country code. We will text you a code to confirm it.
              </p>
              <input
                className={field}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+14155550123"
                autoComplete="tel"
                required
                aria-label="Phone number"
              />
              <button type="submit" disabled={phoneBusy || phone.trim().length < 8} className={button}>
                {phoneBusy ? "Sending…" : "Send code"}
              </button>
            </form>
          )}
          {phoneError && (
            <p role="alert" className="mt-3 text-sm text-hot">
              {phoneError}
            </p>
          )}
          <div ref={box} />
        </div>
      </div>
    </section>
  );
}
