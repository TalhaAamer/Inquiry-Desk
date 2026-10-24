import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About us",
  description: "Why Inquiry Desk exists and how it is built to help small businesses answer customers well.",
};

const VALUES = [
  ["You stay in charge", "Replies are drafts. Nothing is sent without you, and email sending asks you to confirm every time."],
  ["Facts, not guesses", "Replies are written from the prices, hours and policies you give it, and checked against them."],
  ["Privacy first", "Card numbers, ID numbers and passwords are hidden before the AI sees a message."],
  ["Your data is yours", "Everything is saved to your own account. Only you can read it, and you can delete what is kept."],
];

export default function About() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6">
      <header className="py-12 text-center sm:py-16">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">About Inquiry Desk</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
          A calm place to handle customer messages, built for businesses that do not have a support team.
        </p>
      </header>

      <section aria-labelledby="why" className="space-y-4 py-4">
        <h2 id="why" className="font-display text-2xl font-semibold">Why we built it</h2>
        <p className="text-muted">
          Small businesses get messages everywhere: email, contact forms, social media and chat. The
          urgent ones are easy to miss, and the answers take time because every reply needs the right
          price, the right policy and the right tone.
        </p>
        <p className="text-muted">
          Inquiry Desk puts those messages in one place, shows which need an answer first, and writes a
          draft from your own business facts. Then it checks the draft, so a wrong price or an invented
          promise does not reach your customer.
        </p>
      </section>

      <section aria-labelledby="what" className="space-y-4 py-6">
        <h2 id="what" className="font-display text-2xl font-semibold">What it does</h2>
        <p className="text-muted">
          It reads each message and labels its category, urgency, mood and the team that should handle
          it. It drafts a reply in your tone and language, remembers returning customers, gives you a
          contact page and QR code, and can alert your team in Slack, Teams or Discord. You can see
          every service in detail on the{" "}
          <Link href="/services" className="font-medium text-accent">services page</Link>.
        </p>
      </section>

      <section aria-labelledby="values" className="py-6">
        <h2 id="values" className="mb-4 font-display text-2xl font-semibold">What we stand for</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {VALUES.map(([title, text]) => (
            <li key={title} className="rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <b className="block font-semibold">{title}</b>
              <span className="mt-1.5 block text-sm text-muted">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="honest" className="py-6">
        <h2 id="honest" className="mb-3 font-display text-2xl font-semibold">Honest about the limits</h2>
        <p className="text-muted">
          The AI can be wrong. That is why every result has a needs-review flag, every reply is a draft,
          and the reply guard points at anything it cannot find in your facts. Please read a reply
          before you send it.
        </p>
      </section>

      <section className="my-10 rounded-[20px] border border-line bg-card p-8 text-center shadow-sm">
        <h2 className="font-display text-2xl font-semibold">Want to talk to us?</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Questions, ideas or problems are all welcome.
        </p>
        <Link href="/contact" className="mt-5 inline-block rounded-xl bg-accent px-7 py-3.5 font-semibold text-on">
          Contact us
        </Link>
      </section>
    </main>
  );
}
