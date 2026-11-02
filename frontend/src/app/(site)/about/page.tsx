import type { Metadata } from "next";
import Link from "next/link";
import { T } from "../../lib/siteconfig";

export const metadata: Metadata = {
  title: "About us",
  description: "Why Inquiry Desk exists and how it is built to help small businesses answer customers well.",
};

export default function About() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6">
      <header className="py-12 text-center sm:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl"><T id="about.title" /></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          <T id="about.intro" />
        </p>
      </header>

      <section aria-labelledby="why" className="space-y-4 py-4">
        <h2 id="why" className="font-display text-2xl font-semibold"><T id="about.whyTitle" /></h2>
        <p className="text-muted">
          <T id="about.why1" />
        </p>
        <p className="text-muted">
          <T id="about.why2" />
        </p>
      </section>

      <section aria-labelledby="what" className="space-y-4 py-6">
        <h2 id="what" className="font-display text-2xl font-semibold"><T id="about.whatTitle" /></h2>
        <p className="text-muted">
          <T id="about.whatText" />{" "}
          <Link href="/services" className="font-medium text-accent"><T id="about.servicesLink" /></Link>
        </p>
      </section>

      <section aria-labelledby="values" className="py-6">
        <h2 id="values" className="mb-4 font-display text-2xl font-semibold"><T id="about.valuesTitle" /></h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className="rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <b className="block font-semibold"><T id={`about.value${n}Title`} /></b>
              <span className="mt-1.5 block text-sm text-muted"><T id={`about.value${n}Text`} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="honest" className="py-6">
        <h2 id="honest" className="mb-3 font-display text-2xl font-semibold"><T id="about.limitsTitle" /></h2>
        <p className="text-muted">
          <T id="about.limitsText" />
        </p>
      </section>

      <section className="my-10 rounded-[20px] border border-line bg-card p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl font-semibold"><T id="about.ctaTitle" /></h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          <T id="about.ctaText" />
        </p>
        <Link href="/contact" className="mt-5 inline-block rounded-xl bg-accent px-7 py-3.5 font-semibold text-on">
          <T id="about.ctaButton" />
        </Link>
      </section>
    </main>
  );
}
