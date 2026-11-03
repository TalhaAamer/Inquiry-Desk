import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "How Inquiry Desk handles customer messages, reply drafts, business facts, email and privacy.",
};

const FAQS = [
  {
    question: "What does Inquiry Desk do?",
    answer:
      "Inquiry Desk helps you sort customer messages by urgency and mood, then drafts a response using the business facts you provide. It can also flag messages that need a person to check them.",
  },
  {
    question: "Does Inquiry Desk send replies automatically?",
    answer:
      "No. Replies are drafts for your team to review, edit and send. Nothing is sent to a customer unless a team member takes that action.",
  },
  {
    question: "How does it avoid making up prices or policies?",
    answer:
      "The draft is based on the business facts you add, such as services, prices and policies. If the message asks for something those facts do not answer, Inquiry Desk can flag it for review instead of filling in the missing detail. You should still check every draft before sending.",
  },
  {
    question: "What happens when a message is urgent or sensitive?",
    answer:
      "Inquiry Desk provides an urgency score and can flag topics such as refunds, legal or safety concerns, or an angry customer for human review. The score is a decision aid, not a guarantee that every urgent message will be detected.",
  },
  {
    question: "Where can customer messages come from?",
    answer:
      "You can paste a message into the app, connect a supported email account, or collect messages through a shareable contact page or website form. Available tools can depend on the features enabled for your account.",
  },
  {
    question: "Can I change a suggested reply?",
    answer:
      "Yes. Review and edit the draft in the app before sending. You can also ask for a different tone or rewrite, and use the reply checks to spot details that may not be supported by your business facts.",
  },
  {
    question: "Can it reply in another language?",
    answer:
      "You can set a preferred language or ask for a translation. Check translated text before sending, especially for legal, financial or other sensitive messages.",
  },
  {
    question: "Can I connect my email?",
    answer:
      "The app supports email inbox connections using provider settings. You enter your mailbox details in the app, and should use an app password where your email provider requires one. Disconnect the account in the app when you no longer want it connected.",
  },
  {
    question: "Who can see contact-form entries?",
    answer:
      "Entries are scoped to the company website that received them. The company's authorized admins can view and manage those entries in their admin dashboard. Entries are not meant to be shared with admins from other companies.",
  },
  {
    question: "Does Inquiry Desk guarantee correct triage or replies?",
    answer:
      "No. AI-generated classifications and drafts can be incomplete or wrong. Use them as assistance, verify important details against your own records, and have a person handle sensitive or uncertain cases.",
  },
  {
    question: "How do I get help?",
    answer:
      "Use the Contact us page to send a question to the Inquiry Desk team.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6">
      <header className="py-12 sm:py-16">
        <p className="text-sm font-semibold text-accent">A practical guide</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          How message triage and reply drafts work, what your team needs to review, and where customer enquiries go.
        </p>
      </header>

      <section aria-label="Frequently asked questions" className="divide-y divide-line border-y border-line">
        {FAQS.map((item) => (
          <details key={item.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-5 font-display text-base font-semibold sm:text-lg [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45 group-open:border-accent group-open:text-accent"
              >
                +
              </span>
            </summary>
            <p className="max-w-3xl pr-10 pt-3 leading-relaxed text-muted">{item.answer}</p>
          </details>
        ))}
      </section>

      <section className="my-10 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-line bg-card p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="font-display text-xl font-semibold">Still have a question?</h2>
          <p className="mt-1 text-sm text-muted">Send us the details and we’ll point you in the right direction.</p>
        </div>
        <Link href="/contact" className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-on">
          Contact us
        </Link>
      </section>
    </main>
  );
}
