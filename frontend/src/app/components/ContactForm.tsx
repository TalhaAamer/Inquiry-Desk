"use client";

import { useEffect, useState } from "react";

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function ContactForm({ siteId }: { siteId: string }) {
  const [business, setBusiness] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/widget/${encodeURIComponent(siteId)}/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setBusiness(d?.name ?? null))
      .catch(() => alive && setBusiness(null));
    return () => {
      alive = false;
    };
  }, [siteId]);

  async function submit() {
    setError("");
    if (!email.includes("@")) {
      setError("Please enter a valid email so we can reply.");
      return;
    }
    if (message.trim().length < 5) {
      setError("Please write a message.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/widget/${encodeURIComponent(siteId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          website: trap,
          page_url: window.location.href.slice(0, 300),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Could not send. Please try again.",
        );
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (business === undefined) {
    return <p className="text-center text-muted">Loading…</p>;
  }
  if (business === null) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">This form is not available</h1>
        <p className="mt-2 text-muted">
          The link may be wrong or the form was removed. Please check with the business.
        </p>
      </div>
    );
  }
  if (sent) {
    return (
      <div className="text-center" role="status">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-ok/15 text-2xl text-ok">
          ✓
        </div>
        <h1 className="font-display text-2xl font-bold">Thank you!</h1>
        <p className="mt-2 text-muted">
          {business} got your message and will reply to {email} soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Contact {business}</h1>
      <p className="mb-5 mt-1.5 text-muted">
        Send a message and we will reply by email.
      </p>
      <label className="block text-sm font-medium text-muted">
        Your name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          maxLength={100}
          className={`${field} mt-1.5 font-normal`}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-muted">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          maxLength={254}
          required
          className={`${field} mt-1.5 font-normal`}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-muted">
        Message
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          required
          className={`${field} mt-1.5 min-h-36 resize-y font-normal`}
        />
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
        <p role="alert" className="mt-4 rounded-xl border border-hot px-3.5 py-3 text-hot">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-accent py-3.5 font-semibold text-on transition active:scale-[.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
