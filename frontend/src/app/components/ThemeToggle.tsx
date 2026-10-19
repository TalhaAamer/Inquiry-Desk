"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "inquiry-desk:theme";
const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "system", label: "System", icon: "M4 5h16v11H4zM9 20h6M12 16v4" },
  { value: "light", label: "Light", icon: "M12 3v2M12 19v2M5 12H3M21 12h-2M6 6 4.6 4.6M19.4 19.4 18 18M6 18l-1.4 1.4M19.4 4.6 18 6M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
  { value: "dark", label: "Dark", icon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" },
];

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  // Read the saved choice after mount so server and client markup match.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved === "light" || saved === "dark") setTheme(saved);
      } catch {
        // Storage blocked: stay on the system theme.
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // The choice still applies for this visit.
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-full border border-line bg-card p-1"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={`${o.label} theme`}
          title={`${o.label} theme`}
          onClick={() => choose(o.value)}
          className={`grid h-8 w-8 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
            theme === o.value ? "bg-accent text-on" : "text-muted hover:text-ink"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={o.icon} />
          </svg>
        </button>
      ))}
    </div>
  );
}
