import type { Triage } from "./types";

export interface WidgetOptions {
  title: string;
  greeting: string;
  button: string;
  color: string;
  position: "right" | "left";
}

export interface SiteConn {
  id: string;
  secret: string;
  name: string;
  origins: string[];
  options: WidgetOptions;
}

export interface AlertSettings {
  url: string;
  enabled: boolean;
  minUrgency: number;
  onReview: boolean;
}

export const DEFAULT_OPTIONS: WidgetOptions = {
  title: "Contact us",
  greeting: "Send us a message and we will reply by email.",
  button: "Message us",
  color: "#3340f5",
  position: "right",
};

export const DEFAULT_ALERTS: AlertSettings = {
  url: "",
  enabled: false,
  minUrgency: 4,
  onReview: true,
};

const SITES_KEY = "inquiry-desk:sites";
const ALERTS_KEY = "inquiry-desk:alerts";

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: changes last only for this visit.
  }
}

export function loadSites(): SiteConn[] {
  const raw = read<SiteConn[]>(SITES_KEY, []);
  return Array.isArray(raw)
    ? raw
        .filter((s) => s?.id && s?.secret)
        .map((s) => ({ ...s, options: { ...DEFAULT_OPTIONS, ...s.options } }))
    : [];
}

export const saveSites = (sites: SiteConn[]) => write(SITES_KEY, sites);

export const loadAlerts = (): AlertSettings => ({
  ...DEFAULT_ALERTS,
  ...read<Partial<AlertSettings>>(ALERTS_KEY, {}),
});

export const saveAlerts = (a: AlertSettings) => write(ALERTS_KEY, a);

const attr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Only attributes the owner changed are written, to keep the snippet short.
export function embedSnippet(site: SiteConn, appOrigin: string): string {
  const o = site.options;
  const extra = (
    [
      ["data-title", o.title, DEFAULT_OPTIONS.title],
      ["data-greeting", o.greeting, DEFAULT_OPTIONS.greeting],
      ["data-button", o.button, DEFAULT_OPTIONS.button],
      ["data-color", o.color, DEFAULT_OPTIONS.color],
      ["data-position", o.position, DEFAULT_OPTIONS.position],
    ] as const
  )
    .filter(([, value, def]) => value !== def)
    .map(([name, value]) => `\n  ${name}="${attr(value)}"`)
    .join("");
  return `<script src="${appOrigin}/widget.js"\n  data-site="${site.id}"${extra}\n  async></script>`;
}

export const contactLink = (site: SiteConn, appOrigin: string) =>
  `${appOrigin}/contact/${site.id}`;

export interface Platform {
  id: string;
  name: string;
  steps: string[];
}

// Plain steps for people who build their site with a website builder.
export const PLATFORMS: Platform[] = [
  {
    id: "wordpress",
    name: "WordPress",
    steps: [
      "In WordPress, go to Plugins, then Add New, and install the free plugin called WPCode. Activate it.",
      "Go to Code Snippets, then Add Snippet, and choose Add Your Custom Code.",
      "Set the type to HTML Snippet and paste the code below.",
      "Set Insert Location to Site Wide Footer, turn the snippet on and click Save.",
    ],
  },
  {
    id: "shopify",
    name: "Shopify",
    steps: [
      "In Shopify, go to Online Store, then Themes.",
      "Click the three dots next to your theme and choose Edit code.",
      "Open the file theme.liquid.",
      "Paste the code below on the line just above </body>, then click Save.",
    ],
  },
  {
    id: "wix",
    name: "Wix",
    steps: [
      "In your Wix dashboard, go to Settings, then Custom Code.",
      "Click Add Custom Code and paste the code below.",
      "Choose All pages and place it in Body - end.",
      "Click Apply.",
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    steps: [
      "In Squarespace, go to Settings, then Advanced, then Code Injection.",
      "Paste the code below into the Footer box.",
      "Click Save.",
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    steps: [
      "In Webflow, open Project Settings, then Custom Code.",
      "Paste the code below into Footer Code.",
      "Click Save, then publish your site.",
    ],
  },
  {
    id: "other",
    name: "Something else or custom code",
    steps: [
      "Open the page template your whole site shares (often called footer, layout or master page).",
      "Paste the code below on the line just above </body>.",
      "Save and publish. If you are not sure, use the email button below to send these steps to the person who looks after your website.",
    ],
  },
];

export function developerMailto(site: SiteConn, snippet: string): string {
  const body = [
    "Hi,",
    "",
    `Please add a small "contact us" button to our website (${site.origins[0] ?? "our site"}).`,
    "It needs one line of code pasted just before the closing </body> tag on every page (or in the footer / site-wide custom code area of our website builder):",
    "",
    snippet,
    "",
    "A message button then appears in the corner of the site. Messages go straight into our Inquiry Desk, nothing else on the site changes.",
    "",
    "Thank you!",
  ].join("\n");
  return `mailto:?subject=${encodeURIComponent("Please add our contact button to the website")}&body=${encodeURIComponent(body)}`;
}

const CATEGORY_NAME: Record<string, string> = {
  new_project: "New project",
  support: "Support",
  bug_report: "Bug report",
  billing: "Billing",
  partnership: "Partnership",
  spam: "Likely spam",
};

export function shouldAlert(a: AlertSettings, r: Triage): boolean {
  if (!a.enabled || !a.url.trim()) return false;
  return r.urgency >= a.minUrgency || (a.onReview && r.needs_review);
}

export function alertPayload(r: Triage) {
  const who = [r.sender_name, r.sender_email && `<${r.sender_email}>`]
    .filter(Boolean)
    .join(" ");
  const text = [
    `${r.urgency >= 4 ? "🔴" : r.urgency === 3 ? "🟠" : "🟢"} ${CATEGORY_NAME[r.category] ?? r.category} · urgency ${r.urgency}/5 · ${r.sentiment}`,
    r.summary,
    who && `From: ${who}`,
    `Next step: ${r.next_step}`,
    r.needs_review && r.review_reason ? `Needs review: ${r.review_reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    text,
    data: {
      category: r.category,
      urgency: r.urgency,
      sentiment: r.sentiment,
      team: r.team,
      summary: r.summary,
      next_step: r.next_step,
      sender_name: r.sender_name,
      sender_email: r.sender_email,
      needs_review: r.needs_review,
    },
  };
}
