"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { SERVICES } from "../lib/services";

const STEPS = [
  ["Tell it about your business", "Add your prices, hours and policies once, or fill them in from a website link."],
  ["Get messages in", "Paste them, connect your email, or share your contact page link or QR code."],
  ["Review and send", "See each message ranked by urgency, check the draft reply, and send it yourself."],
];

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? { href: "/app", label: "Open dashboard" } : { href: "/signup", label: "Get started free" };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <section className="py-12 text-center sm:py-20">
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Answer every customer message faster, and never drop one.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Inquiry Desk sorts incoming messages by urgency, drafts replies from your own
          business facts, and checks them before you send.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={cta.href}
            className="rounded-xl bg-accent px-7 py-3.5 font-semibold text-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {cta.label}
          </Link>
          <Link
            href="/services"
            className="rounded-xl border border-line bg-card px-7 py-3.5 font-semibold hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            See our services
          </Link>
        </div>
      </section>

      <section aria-labelledby="how" className="py-8">
        <h2 id="how" className="mb-6 text-center font-display text-2xl font-semibold">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-on">
                {i + 1}
              </span>
              <b className="mt-3 block font-semibold">{title}</b>
              <span className="mt-1.5 block text-sm text-muted">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features" className="py-8">
        <h2 id="features" className="mb-6 text-center font-display text-2xl font-semibold">
          What you get
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="block h-full rounded-[20px] border border-line bg-card p-5 shadow-sm transition hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <b className="block font-semibold">{s.title}</b>
                <span className="mt-1.5 block text-sm text-muted">{s.short}</span>
                <span className="mt-3 block text-sm font-medium text-accent">Learn more →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="my-10 rounded-[20px] border border-line bg-card p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl font-semibold">Ready to try it?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Create a free account, add your business facts, and triage your first message in minutes.
        </p>
        <Link
          href={cta.href}
          className="mt-5 inline-block rounded-xl bg-accent px-7 py-3.5 font-semibold text-on"
        >
          {cta.label}
        </Link>
      </section>
    </main>
  );
}
