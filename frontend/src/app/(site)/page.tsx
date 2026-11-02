"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { SERVICES } from "../lib/services";
import { T, useText } from "../lib/siteconfig";

export default function Landing() {
  const { user } = useAuth();
  const open = useText("home.ctaOpen");
  const start = useText("home.ctaSignup");
  const cta = user ? { href: "/app", label: open } : { href: "/signup", label: start };
  const steps = [1, 2, 3];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <section className="py-12 text-center sm:py-20">
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          <T id="home.heroTitle" />
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          <T id="home.heroText" />
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
            <T id="home.ctaServices" />
          </Link>
        </div>
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

      <section className="my-10 rounded-[20px] border border-line bg-card p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl font-semibold"><T id="home.readyTitle" /></h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          <T id="home.readyText" />
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
