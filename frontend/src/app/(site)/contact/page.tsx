import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "../../components/EnquiryForm";
import { T } from "../../lib/siteconfig";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Ask a question, report a problem or tell us what you need. We read every message.",
};

const TOPICS = [1, 2, 3, 4];

export default function Contact() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <header className="py-12 text-center sm:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl"><T id="contact.title" /></h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          <T id="contact.intro" />
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        <aside aria-label="What to write to us about" className="space-y-4">
          <h2 className="font-display text-xl font-semibold"><T id="contact.helpTitle" /></h2>
          <ul className="space-y-3">
            {TOPICS.map((n) => (
              <li key={n} className="rounded-[20px] border border-line bg-card p-4 shadow-sm">
                <b className="block font-semibold"><T id={`contact.topic${n}Title`} /></b>
                <span className="mt-1 block text-sm text-muted"><T id={`contact.topic${n}Text`} /></span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            Looking for how something works? Browse the{" "}
            <Link href="/services" className="font-medium text-accent">services pages</Link> first.
          </p>
        </aside>

        <section aria-label="Contact form" className="rounded-[20px] border border-line bg-card p-5 shadow-sm sm:p-8">
          <EnquiryForm />
        </section>
      </div>
    </main>
  );
}
