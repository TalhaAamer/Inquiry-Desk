"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  "General question",
  "How a feature works",
  "Help with my account",
  "Report a problem",
  "Feature request",
  "Pricing and plans",
  "Partnership",
  "Feedback",
  "Other",
];
const SERVICES = [
  "Not sure yet",
  "Smart triage",
  "Replies from your facts",
  "Reply guard and privacy shield",
  "Contact page and QR code",
  "Email inbox",
  "Customer memory",
  "Alerts",
  "Writing style and voice",
];
const METHODS = ["Email", "Phone", "WhatsApp"];

const MIN_MESSAGE = 10;
const MAX_MESSAGE = 4000;

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const label = "block text-sm font-medium text-muted";

export default function EnquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [service, setService] = useState("Not sure yet");
  const [method, setMethod] = useState("Email");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  const needsPhone = method !== "Email";

  // After the thank-you message, bring the empty form back on its own.
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => {
      setName("");
      setEmail("");
      setPhone("");
      setCategory("");
      setService("Not sure yet");
      setMethod("Email");
      setMessage("");
      setSent("");
    }, 5000);
    return () => clearTimeout(t);
  }, [sent]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (!/^\S+@\S+\.\S{2,}$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (needsPhone && !phone.trim()) return setError(`Please add your phone number so we can reach you by ${method}.`);
    if (!category) return setError("Please choose what your message is about.");
    if (message.trim().length < MIN_MESSAGE) return setError("Please write a little more so we can help.");

    setBusy(true);
    try {
      const res = await fetch("/api/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, category, service, method, message, website: trap,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Could not send. Please try again.";
        throw new Error(detail);
      }
      setSent(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div role="status" className="py-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-ok/15 text-2xl text-ok">✓</div>
        <h2 className="font-display text-2xl font-bold">Thank you, we got your message</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          We will reply to {sent}
          {needsPhone ? ` or by ${method}` : ""} soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Full name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} required className={`${field} mt-1.5 font-normal`} />
        </label>
        <label className={label}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required className={`${field} mt-1.5 font-normal`} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Phone number {needsPhone ? "" : <span className="font-normal">(optional)</span>}
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} placeholder="+92 300 1234567" className={`${field} mt-1.5 font-normal`} />
        </label>
        <label className={label}>
          How should we reply?
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${field} mt-1.5 font-normal`}>
            {METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          What is it about?
          <select value={category} onChange={(e) => setCategory(e.target.value)} required className={`${field} mt-1.5 font-normal`}>
            <option value="" disabled>Choose one…</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className={label}>
          Which service? <span className="font-normal">(optional)</span>
          <select value={service} onChange={(e) => setService(e.target.value)} className={`${field} mt-1.5 font-normal`}>
            {SERVICES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <label className={`${label} block`}>
        Message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={MAX_MESSAGE} required placeholder="Tell us a bit more so we can help properly." className={`${field} mt-1.5 min-h-36 resize-y font-normal`} />
        <span className="mt-1 flex justify-between gap-3 text-xs font-normal">
          <span>Write at least {MIN_MESSAGE} characters (up to {MAX_MESSAGE.toLocaleString("en-US")}).</span>
          <span className={message.trim().length > 0 && message.trim().length < MIN_MESSAGE ? "text-hot" : ""}>
            {message.length.toLocaleString("en-US")} / {MAX_MESSAGE.toLocaleString("en-US")}
          </span>
        </span>
      </label>

      <input
        value={trap}
        onChange={(e) => setTrap(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      {error && (
        <p role="alert" className="rounded-xl border border-hot px-3.5 py-3 text-hot">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-accent py-3.5 font-semibold text-on transition active:scale-[.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
      <p className="text-center text-xs text-muted">
        We use your details only to reply to this message.
      </p>
    </form>
  );
}
