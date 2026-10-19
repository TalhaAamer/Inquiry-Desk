import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "../../components/ContactForm";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Send a message and get a reply by email.",
};

async function Form({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return <ContactForm siteId={siteId} />;
}

export default function ContactPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="relative w-full max-w-lg rounded-[20px] border border-line bg-card p-5 shadow-sm sm:p-8">
        <Suspense fallback={<p className="text-center text-muted">Loading…</p>}>
          <Form params={params} />
        </Suspense>
      </div>
    </main>
  );
}
