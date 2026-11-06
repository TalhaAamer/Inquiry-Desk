"use client";

import { useState } from "react";
import Link from "next/link";
import { T } from "../lib/siteconfig";
import TurnstileWidget from "./TurnstileWidget";

const field =
  "min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 py-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!consent) {
      setError("Please agree to receive newsletter emails.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          consent,
          website,
          turnstile_token: turnstileToken,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Could not save your signup. Please try again.",
        );
      }
      setJoined(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your signup. Please try again.");
    } finally {
      setBusy(false);
      setTurnstileToken("");
      setTurnstileReset((current) => current + 1);
    }
  }

  return (
    <section aria-labelledby="newsletter" className="my-10 rounded-[20px] border border-line bg-card p-6 shadow-sm sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">Newsletter</p>
        <h2 id="newsletter" className="font-display text-2xl font-semibold"><T id="home.readyTitle" /></h2>
        <p className="mx-auto mt-2 max-w-xl text-muted"><T id="home.readyText" /></p>
      </div>

      {joined ? (
        <p role="status" className="mx-auto mt-6 max-w-xl rounded-xl bg-ok/10 px-4 py-3 text-center text-ok">
          Thanks — your email has been added to the list. We’ll let you know when newsletter emails begin.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mx-auto mt-6 max-w-xl">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              required
              className={field}
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-xl bg-accent px-6 py-3 font-semibold text-on disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {busy ? "Joining…" : "Join the newsletter"}
            </button>
          </div>
          <label className="mt-4 flex items-start gap-2 text-left text-sm text-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 accent-accent"
            />
            <span>
              I agree to receive occasional product updates and customer-service tips by email. I can request removal through{" "}
              <Link href="/contact" className="font-medium text-accent underline underline-offset-2">Contact us</Link>.
            </span>
          </label>
          <input
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-px w-px opacity-0"
          />
          <div className="mt-3 flex justify-center">
            <TurnstileWidget
              action="newsletter"
              onToken={setTurnstileToken}
              resetKey={turnstileReset}
            />
          </div>
          {error && <p role="alert" className="mt-3 text-left text-sm text-hot">{error}</p>}
        </form>
      )}
    </section>
  );
}
