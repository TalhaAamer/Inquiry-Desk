"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/about", label: "About us" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact us" },
];

export default function SiteHeader() {
  const { user } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string) => path.startsWith(href);
  const account = user
    ? { href: "/app", label: "Dashboard" }
    : { href: "/login", label: "Sign in" };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight"
        >
          Inquiry Desk
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition hover:text-ink ${
                active(l.href) ? "bg-accent/10 text-accent" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href={account.href}
            className="hidden rounded-full border border-line bg-card px-4 py-1.5 text-sm font-semibold hover:border-accent sm:inline-block"
          >
            {account.label}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-card text-muted md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path
                d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-line bg-bg px-4 py-3 md:hidden"
        >
          <ul className="space-y-1">
            {[...LINKS, account].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={`block rounded-xl px-3 py-2.5 font-medium ${
                    active(l.href) ? "bg-accent/10 text-accent" : "text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
