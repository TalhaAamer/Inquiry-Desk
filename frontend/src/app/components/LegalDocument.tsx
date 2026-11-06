"use client";

import { useEffect, useRef, useState } from "react";

export type LegalSection = { title: string; paragraphs: string[] };

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const OFFSET = 112;

export default function LegalDocument({
  eyebrow,
  title,
  updated,
  sections,
  children,
}: {
  eyebrow?: string;
  title: string;
  updated: string;
  sections: LegalSection[];
  children?: React.ReactNode;
}) {
  const ids = sections.map((s) => slug(s.title));
  const [active, setActive] = useState(ids[0]);
  const mobileMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const update = () => {
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) return setActive(ids[ids.length - 1]);
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= OFFSET + 8) current = id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
    mobileMenu.current?.removeAttribute("open");
  }

  const links = (
    <ol className="space-y-0.5">
      {sections.map((section, index) => {
        const id = ids[index];
        const current = id === active;
        return (
          <li key={id}>
            <a
              href={`#${id}`}
              onClick={(event) => jump(event, id)}
              aria-current={current ? "true" : undefined}
              className={`block rounded-lg border-l-2 py-1.5 pl-3 pr-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                current
                  ? "border-accent bg-accent/10 font-semibold text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {section.title}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
      <header className="py-12 sm:py-16">
        <p className="text-sm font-semibold text-accent">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>
      </header>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Table of contents" className="mb-8 lg:mb-0">
          <details
            ref={mobileMenu}
            className="rounded-xl border border-line bg-card px-4 py-3 lg:hidden"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              Table of Contents
            </summary>
            <div className="mt-3">{links}</div>
          </details>
          <div className="sticky top-28 hidden lg:block">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Table of Contents
            </p>
            {links}
          </div>
        </nav>

        <div className="max-w-3xl">
          <div className="space-y-8">
            {sections.map((section, index) => (
              <section
                key={ids[index]}
                id={ids[index]}
                className="scroll-mt-28 border-t border-line pt-6"
              >
                <h2 className="font-display text-xl font-semibold">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed text-muted">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
