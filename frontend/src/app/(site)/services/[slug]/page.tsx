import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SERVICES, bySlug, serviceTextKey } from "../../../lib/services";
import { T } from "../../../lib/siteconfig";

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
        <Link href="/services" className="hover:text-ink"><T id="service.breadcrumb" /></Link>
        <span aria-hidden> / </span>
        <span className="text-ink"><T id={serviceTextKey(service.slug, "title")} /></span>
      </nav>

      <header className="py-8 sm:py-12">
        <p className="text-sm font-semibold text-accent"><T id="service.countPrefix" /> {index + 1} <T id="service.countOf" /> {SERVICES.length}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl"><T id={serviceTextKey(service.slug, "title")} /></h1>
        <p className="mt-4 max-w-2xl text-lg text-muted"><T id={serviceTextKey(service.slug, "intro")} /></p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="rounded-xl bg-accent px-6 py-3 font-semibold text-on">
            <T id="service.getStarted" />
          </Link>
          <Link href="/contact" className="rounded-xl border border-line bg-card px-6 py-3 font-semibold hover:border-accent">
            <T id="service.askQuestion" />
          </Link>
        </div>
      </header>

      <section aria-labelledby="gets" className="py-6">
        <h2 id="gets" className="mb-4 font-display text-2xl font-semibold"><T id="service.whatYouGet" /></h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {service.gets.map(([title], i) => (
            <li key={title} className="rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <b className="block font-semibold"><T id={serviceTextKey(service.slug, `benefit${i + 1}Title`)} /></b>
              <span className="mt-1.5 block text-sm text-muted"><T id={serviceTextKey(service.slug, `benefit${i + 1}Text`)} /></span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how" className="py-6">
        <h2 id="how" className="mb-4 font-display text-2xl font-semibold"><T id="service.howItWorks" /></h2>
        <ol className="space-y-3">
          {service.steps.map((_, i) => (
            <li key={i} className="flex gap-4 rounded-[20px] border border-line bg-card p-5 shadow-sm">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on">
                {i + 1}
              </span>
              <span className="pt-1"><T id={serviceTextKey(service.slug, `step${i + 1}`)} /></span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="fit" className="py-6">
        <h2 id="fit" className="mb-3 font-display text-2xl font-semibold"><T id="service.whoFor" /></h2>
        <p className="text-muted"><T id={serviceTextKey(service.slug, "fit")} /></p>
        {service.note && (
          <p className="mt-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
            <b className="text-ink"><T id="service.goodToKnow" /> </b>
            <T id={serviceTextKey(service.slug, "note")} />
          </p>
        )}
      </section>

      <section aria-labelledby="more" className="py-8">
        <h2 id="more" className="mb-4 font-display text-2xl font-semibold"><T id="service.more" /></h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="block h-full rounded-[20px] border border-line bg-card p-5 shadow-sm transition hover:border-accent"
              >
                <b className="block font-semibold"><T id={serviceTextKey(s.slug, "title")} /></b>
                <span className="mt-1.5 block text-sm text-muted"><T id={serviceTextKey(s.slug, "short")} /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
