import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "Terms for using the Inquiry Desk website and app.",
};

const sections = [
  {
    title: "Using the service",
    paragraphs: [
      "Inquiry Desk provides tools to organize customer enquiries, assess urgency, and prepare AI-assisted reply drafts. By using the website or app, you agree to these terms. If you use the service for a company, you confirm that you are allowed to accept these terms for that company.",
      "You are responsible for keeping your sign-in details secure, maintaining accurate account information, and ensuring that anyone using your account is authorized.",
    ],
  },
  {
    title: "Your content and customer information",
    paragraphs: [
      "You retain responsibility for the messages, business facts, images, email content and other material you submit or connect. You must have the rights and permissions needed to provide that content and to use it with the service.",
      "You are responsible for providing any notices or obtaining any consent required before submitting customer information, connecting a mailbox, or sending a reply. Do not submit unlawful content, credentials, payment-card information, or sensitive information that is not necessary for your use of the service.",
    ],
  },
  {
    title: "AI results and human review",
    paragraphs: [
      "Triage labels, urgency scores, translations, summaries and reply drafts are generated with AI. They may be wrong, incomplete, out of date or unsuitable for the situation. They are provided as assistance, not as professional, legal, medical or financial advice.",
      "You must independently check important facts and review every draft before sending it. The app does not guarantee that it will detect every urgent or sensitive enquiry. Unless a feature explicitly says otherwise, a draft is not sent to a customer until you choose to send it.",
    ],
  },
  {
    title: "Integrations and external services",
    paragraphs: [
      "The service may connect with third-party providers such as Firebase, Anthropic, Vercel, Cloudflare, email providers, Slack, Microsoft Teams, Discord, Zapier or Make. Your use of those providers is also subject to their own terms and policies.",
      "You are responsible for choosing the correct destination for webhook alerts, protecting webhook URLs and email credentials, and checking any content sent through an integration. Third-party services may be unavailable or change their features independently of Inquiry Desk.",
    ],
  },
  {
    title: "Acceptable use and availability",
    paragraphs: [
      "You may not use the service to break the law, violate another person’s rights, send spam, interfere with the service, bypass security controls, or attempt to access another user’s data or account.",
      "We may change, suspend or discontinue features, or restrict access where reasonably necessary to protect the service, users or others. We aim to keep the service available but do not promise uninterrupted or error-free operation.",
    ],
  },
  {
    title: "Disclaimers and liability",
    paragraphs: [
      "To the extent permitted by applicable law, the service is provided “as is” and “as available,” without a guarantee that AI output, triage, delivery, integrations or availability will meet your needs.",
      "To the extent permitted by law, Inquiry Desk is not responsible for indirect or consequential loss, or for decisions made using AI output without appropriate review. Nothing in these terms excludes rights or liability that cannot legally be excluded.",
    ],
  },
  {
    title: "Updates and contact",
    paragraphs: [
      "We may update these terms as the service changes. Continued use after an updated version is published means you accept the revised terms, to the extent allowed by applicable law.",
      "If you have questions about these terms, contact us through the Contact page.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-10 sm:px-6">
      <header className="py-12 sm:py-16">
        <p className="text-sm font-semibold text-accent">Using Inquiry Desk</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">Terms and conditions</h1>
        <p className="mt-3 text-sm text-muted">Last updated: November 4, 2026</p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="border-t border-line pt-6">
            <h2 className="font-display text-xl font-semibold">{section.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted">
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-line pt-6 text-sm text-muted">
        Questions? <Link href="/contact" className="font-medium text-accent hover:underline">Contact us</Link>.
      </p>
    </main>
  );
}
