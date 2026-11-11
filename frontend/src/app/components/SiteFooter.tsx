import Link from "next/link";
import { SERVICES } from "../lib/services";
import { T } from "../lib/siteconfig";
import CurrentYear from "./CurrentYear";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-card/50">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight"
          >
            <T id="brand.name" />
          </Link>
          <p className="mt-2 max-w-xs text-sm text-muted">
            <T id="brand.tagline" />
          </p>
        </div>

        <nav aria-label="Services">
          <h2 className="text-sm font-semibold">Services</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {SERVICES.slice(0, 5).map((s) => (
              <li key={s.slug}>
                <Link href={`/services/${s.slug}`} className="hover:text-ink">
                  {s.title}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/services" className="font-medium text-accent">
                All services
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="text-sm font-semibold">Company</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/about" className="hover:text-ink">
                <T id="nav.about" />
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-ink">
                <T id="nav.contact" />
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-ink">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-ink">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ink">
                Terms and conditions
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted sm:px-6">
          <span>
            © <CurrentYear /> <T id="brand.name" />. All rights reserved.
          </span>
          <nav aria-label="Social media" className="flex items-center gap-3">
            <a
              href="#"
              aria-label="Facebook profile"
              title="Facebook"
              className="grid h-8 w-8 place-items-center rounded-full border border-line transition-colors hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877F2]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2v-2c0-.9.3-1.5 1.6-1.5h1.7V3.2c-.3 0-1.3-.2-2.5-.2-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="Instagram profile"
              title="Instagram"
              className="grid h-8 w-8 place-items-center rounded-full border border-line transition-colors hover:border-[#E4405F] hover:bg-[#E4405F] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4405F]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="1.8"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle
                  cx="17.7"
                  cy="6.5"
                  r="1"
                  className="fill-current stroke-none"
                />
              </svg>
            </a>
            <a
              href="#"
              aria-label="X profile"
              title="X"
              className="grid h-8 w-8 place-items-center rounded-full border border-line transition-colors hover:border-black hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M18.9 3H21l-6.8 7.8L22.2 21h-6.3L11 14.8 5.6 21H3.5l7.3-8.4L3 3h6.5l4.5 5.9L18.9 3Zm-1.1 16.2H19L7.5 4.7H6.2l11.6 14.5Z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="LinkedIn profile"
              title="LinkedIn"
              className="grid h-8 w-8 place-items-center rounded-full border border-line transition-colors hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A66C2]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M5.2 7.8a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6ZM3.7 9.2h3v9.6h-3V9.2Zm5 0h2.9v1.3h.1c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.5v5.4h-3v-4.8c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7v4.9h-3V9.2Z" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
