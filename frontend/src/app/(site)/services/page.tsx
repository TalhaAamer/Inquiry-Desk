import type { Metadata } from "next";
import Link from "next/link";
import { SERVICES } from "../../lib/services";

export const metadata: Metadata = {
  title: "Services",
  description: "Everything Inquiry Desk does: triage, replies from your facts, safety checks, contact pages, email, memory, alerts and more.",
};

export default function Services() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <section className="py-12 text-center sm:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Our services</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Everything you need to sort, answer and keep track of customer messages. Open any service
          to see exactly what it does and how it works.
        </p>
      </section>

      <ul className="grid gap-5 md:grid-cols-2">
        {SERVICES.map((s, i) => (
          <li key={s.slug}>
            <Link
              href={`/services/${s.slug}`}
              className="flex h-full gap-4 rounded-[20px] border border-line bg-card p-6 shadow-sm transition hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 font-bold text-accent">
                {i + 1}
              </span>
              <span>
                <b className="block font-display text-lg font-semibold">{s.title}</b>
                <span className="mt-1 block text-sm text-muted">{s.short}</span>
                <span className="mt-3 block text-sm font-medium text-accent">See details →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="my-12 rounded-[20px] border border-line bg-card p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl font-semibold">Not sure which one you need?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Tell us what kind of messages you get and we will point you in the right direction.
        </p>
        <Link href="/contact" className="mt-5 inline-block rounded-xl bg-accent px-7 py-3.5 font-semibold text-on">
          Contact us
        </Link>
      </section>
    </main>
  );
}
