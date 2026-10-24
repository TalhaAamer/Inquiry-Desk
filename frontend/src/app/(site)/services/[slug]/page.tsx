import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES, bySlug } from "../../../lib/services";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = bySlug(slug);
  return s ? { title: s.title, description: s.short } : {};
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = bySlug(slug);
  if (!service) notFound();

  const index = SERVICES.findIndex((s) => s.slug === slug);
  const others = SERVICES.filter((s) => s.slug !== slug).slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="pt-8 text-sm text-muted">
        <Link href="/services" className="hover:text-ink">Services</Link>
        <span aria-hidden> / </span>
        <span className="text-ink">{service.title}</span>
      </nav>

      <header className="py-8 sm:py-12">
        <p className="text-sm font-semibold text-accent">Service {index + 1} of {SERVICES.length}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">{service.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{service.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-xl bg-accent px-6 py-3 font-semibold text-on">
            Get started free
          </Link>
          <Link href="/contact" className="rounded-xl border border-line bg-card px-6 py-3 font-semibold hover:border-accent">
            Ask a question
          </Link>
        </div>
      </header>

      <section aria-labelledby="gets" className="py-6">
        <h2 id="gets" className="mb-4 font-display text-2xl font-semibold">What you get</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {service.gets.map(([title, text]) => (
            <li key={title} className="rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <b className="block font-semibold">{title}</b>
              <span className="mt-1.5 block text-sm text-muted">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="py-6">
        <h2 id="how" className="mb-4 font-display text-2xl font-semibold">How it works</h2>
        <ol className="space-y-3">
          {service.steps.map((step, i) => (
            <li key={step} className="flex gap-4 rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on">
                {i + 1}
              </span>
              <span className="pt-1">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="fit" className="py-6">
        <h2 id="fit" className="mb-3 font-display text-2xl font-semibold">Who it is for</h2>
        <p className="text-muted">{service.fit}</p>
        {service.note && (
          <p className="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
            <b className="text-ink">Good to know: </b>
            {service.note}
          </p>
        )}
      </section>

      <section aria-labelledby="more" className="py-8">
        <h2 id="more" className="mb-4 font-display text-2xl font-semibold">More services</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="block h-full rounded-[20px] border border-line bg-card p-5 shadow-sm transition hover:border-accent"
              >
                <b className="block font-semibold">{s.title}</b>
                <span className="mt-1.5 block text-sm text-muted">{s.short}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
