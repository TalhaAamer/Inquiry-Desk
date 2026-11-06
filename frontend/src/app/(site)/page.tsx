"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { SERVICES } from "../lib/services";
import { T, useText } from "../lib/siteconfig";
import NewsletterSignup from "../components/NewsletterSignup";

export default function Landing() {
  const { user } = useAuth();
  const open = useText("home.ctaOpen");
  const start = useText("home.ctaSignup");
  const cta = user ? { href: "/app", label: open } : { href: "/signup", label: start };
  const steps = [1, 2, 3];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 lg:py-20">
        <div className="text-center lg:text-left">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Customer messages, handled with care
          </p>
          <h1 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:mx-0">
            <T id="home.heroTitle" />
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
            <T id="home.heroText" />
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
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
            <T id="home.ctaServices" />
          </Link>
          </div>
          <p className="mt-4 text-sm text-muted">Your team reviews and sends every reply.</p>
        </div>

        <MessageWalkthrough />
      </section>

      <section aria-labelledby="how" className="py-8">
        <h2 id="how" className="mb-6 text-center font-display text-2xl font-semibold">
          <T id="home.howTitle" />
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((n) => (
            <li key={n} className="rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-on">
                {n}
              </span>
              <b className="mt-3 block font-semibold"><T id={`home.step${n}Title`} /></b>
              <span className="mt-1.5 block text-sm text-muted"><T id={`home.step${n}Text`} /></span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features" className="py-8">
        <h2 id="features" className="mb-6 text-center font-display text-2xl font-semibold">
          <T id="home.featuresTitle" />
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
                <span className="mt-3 block text-sm font-medium text-accent"><T id="home.learnMore" /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <NewsletterSignup />
    </main>
  );
}

function MessageWalkthrough() {
  return (
    <figure className="mx-auto w-full max-w-2xl" aria-label="Illustrative customer message and reviewed reply">
      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-[0_24px_70px_-35px_rgba(74,48,35,0.42)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5.5h16v13H4z" />
                <path d="m4.5 7 7.5 6 7.5-6" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">Message review</span>
              <span className="block text-xs text-muted">Website enquiry · Just now</span>
            </span>
          </div>
          <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted">
            EXAMPLE
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-xl border border-line bg-bg/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Customer message</p>
            <p className="mt-2 text-sm leading-relaxed">
              “I&apos;ve been waiting three days for an update on my order. Can someone tell me what&apos;s going on?”
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-warn/10 px-2.5 py-1 font-semibold text-warn">Urgency 4 / 5</span>
            <span className="rounded-full bg-hot/10 px-2.5 py-1 font-semibold text-hot">Frustrated</span>
            <span className="rounded-full border border-line px-2.5 py-1 font-semibold text-muted">Order status</span>
          </div>

          <div className="rounded-xl border-l-4 border-warn bg-warn/10 px-3.5 py-3">
            <p className="text-sm font-semibold">Needs a person to check</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              The current order status is not in the business facts, so the draft avoids guessing.
            </p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Reply draft · Not sent</p>
              <span className="text-xs font-medium text-accent">Review and edit</span>
            </div>
            <div className="rounded-xl border border-line bg-card px-4 py-3.5 text-sm leading-relaxed">
              I&apos;m sorry you&apos;ve been waiting. I don&apos;t want to guess about your order, so I&apos;m asking our team to check its latest status.
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <span className="flex items-center gap-2 text-xs text-muted">
              <span aria-hidden className="h-2 w-2 rounded-full bg-warn" />
              Human review before sending
            </span>
            <span className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-on">Edit reply</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted">
        Illustrative example. The customer message and business details are fictional.
      </figcaption>
    </figure>
  );
}
