import Link from "next/link";
import { SERVICES } from "../lib/services";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-card/50">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            Inquiry Desk
          </Link>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Sort customer messages by urgency, draft replies from your own facts and check them
            before you send.
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
            <li><Link href="/about" className="hover:text-ink">About us</Link></li>
            <li><Link href="/contact" className="hover:text-ink">Contact us</Link></li>
          </ul>
        </nav>

        <nav aria-label="Account">
          <h2 className="text-sm font-semibold">Account</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/login" className="hover:text-ink">Sign in</Link></li>
            <li><Link href="/signup" className="hover:text-ink">Create an account</Link></li>
            <li><Link href="/app" className="hover:text-ink">Dashboard</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:px-6">
          <span>© Inquiry Desk. All rights reserved.</span>
          <span>Replies are drafts. Always review before sending.</span>
        </div>
      </div>
    </footer>
  );
}
