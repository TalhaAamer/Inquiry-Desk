import type { Metadata } from "next";
import Link from "next/link";
import EnquiryForm from "../../components/EnquiryForm";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Ask a question, report a problem or tell us what you need. We read every message.",
};

const TOPICS = [
  ["Questions", "How a feature works, or whether Inquiry Desk fits your business."],
  ["Problems", "Something not working? Tell us what you saw and what you expected."],
  ["Ideas", "Missing a feature? Feature requests help us decide what to build next."],
  ["Partnerships", "Want to work with us or offer Inquiry Desk to your customers?"],
];

export default function Contact() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <header className="py-12 text-center sm:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Contact us</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          Send us a message and we will reply. The more detail you give, the faster we can help.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        <aside aria-label="What to write to us about" className="space-y-4">
          <h2 className="font-display text-xl font-semibold">What can we help with?</h2>
          <ul className="space-y-3">
            {TOPICS.map(([title, text]) => (
              <li key={title} className="rounded-[20px] border border-line bg-card p-4 shadow-sm">
                <b className="block font-semibold">{title}</b>
                <span className="mt-1 block text-sm text-muted">{text}</span>
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
