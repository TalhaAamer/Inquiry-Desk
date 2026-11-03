"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SERVICES, serviceTextKey } from "./services";

// Which company this website belongs to. Without it the backend uses its default company.
export function companyHeader(): Record<string, string> {
  const id = process.env.NEXT_PUBLIC_COMPANY_ID;
  return id ? { "X-Company-Id": id } : {};
}

export type ThemeName = "light" | "dark";
export type Colors = Partial<Record<string, string>>;
export type SiteConfig = {
  features: Record<string, boolean>;
  colors: { light: Colors; dark: Colors };
  texts: Record<string, string>;
  updatedAt: number;
};

export const EMPTY_CONFIG: SiteConfig = {
  features: {},
  colors: { light: {}, dark: {} },
  texts: {},
  updatedAt: 0,
};

export const FEATURES: { key: string; label: string; hint: string }[] = [
  { key: "screenshots", label: "Screenshot upload", hint: "Drop, paste or browse screenshots next to a customer message." },
  { key: "inboxMode", label: "Inbox mode", hint: "Paste several messages separated by --- and triage them all at once." },
  { key: "dictation", label: "Dictation", hint: "The microphone button that types what you say." },
  { key: "readAloud", label: "Read reply aloud", hint: "The button that reads a draft reply out loud." },
  { key: "writingStyle", label: "Writing-style learning", hint: "Learns from the edits people make to drafts." },
  { key: "emailInbox", label: "Email inbox", hint: "Connect Gmail, Outlook and others to read and reply from the app." },
  { key: "contactPages", label: "Contact pages and alerts", hint: "Shareable contact page, QR code, website button and Slack/Teams alerts." },
  { key: "proposals", label: "Instant proposals", hint: "Scope, timeline and offer for new-project messages." },
  { key: "simulator", label: "Customer reaction simulator", hint: "Predicts how the customer will feel about a reply." },
  { key: "knowledgeGaps", label: "Knowledge gaps", hint: "Lists questions the business facts cannot answer yet." },
  { key: "samples", label: "Sample messages", hint: "The “Try a sample” buttons for first-time users." },
  { key: "contactUs", label: "Public contact form", hint: "The form on the Contact us page. When off, visitors cannot send messages." },
];

export const COLOR_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "bg", label: "Page background", hint: "Behind everything" },
  { key: "card", label: "Cards and panels", hint: "Boxes, forms, dialogs" },
  { key: "ink", label: "Main text", hint: "Headings and body text" },
  { key: "muted", label: "Quiet text", hint: "Descriptions and hints" },
  { key: "line", label: "Borders", hint: "Lines around boxes" },
  { key: "accent", label: "Brand color", hint: "Buttons, links, highlights" },
  { key: "on", label: "Text on brand color", hint: "Writing inside buttons" },
  { key: "ok", label: "Success", hint: "Saved, connected, done" },
  { key: "warn", label: "Warning", hint: "Needs attention" },
  { key: "hot", label: "Error", hint: "Problems and urgent items" },
];

export const DEFAULT_COLORS: { light: Record<string, string>; dark: Record<string, string> } = {
  light: {
    bg: "#f5f0e8", card: "#fffcf7", ink: "#2e2825", muted: "#6e625c", line: "#ded2c7",
    accent: "#9b4632", on: "#ffffff", ok: "#685017", warn: "#8a5010", hot: "#9b302b",
  },
  dark: {
    bg: "#1d1917", card: "#29221f", ink: "#f2e9e1", muted: "#c2b3a8", line: "#4b3d36",
    accent: "#e3977a", on: "#291a16", ok: "#d6b66f", warn: "#e6a15b", hot: "#ff9384",
  },
};

type TextItem = { key: string; label: string; text: string; long?: boolean };
export type TextSection = { id: string; title: string; hint: string; items: TextItem[] };

const CORE_TEXT_SECTIONS: TextSection[] = [
  {
    id: "brand",
    title: "Brand and menu",
    hint: "The name and the links at the top of every public page.",
    items: [
      { key: "brand.name", label: "Product name", text: "Inquiry Desk" },
      { key: "brand.tagline", label: "Footer description", text: "Sort customer messages by urgency, draft replies from your own facts and check them before you send.", long: true },
      { key: "nav.about", label: "Menu: About", text: "About us" },
      { key: "nav.services", label: "Menu: Services", text: "Services" },
      { key: "nav.contact", label: "Menu: Contact", text: "Contact us" },
      { key: "nav.signIn", label: "Button: Sign in", text: "Sign in" },
      { key: "nav.dashboard", label: "Button: Dashboard (signed in)", text: "Dashboard" },
    ],
  },
  {
    id: "home",
    title: "Home page",
    hint: "The first page visitors see.",
    items: [
      { key: "home.heroTitle", label: "Main headline", text: "A customer is waiting. Give your team a better first reply.", long: true },
      { key: "home.heroText", label: "Headline description", text: "Inquiry Desk flags the urgency, drafts from your business facts, and points out what it cannot confirm. Your team reviews and sends the reply.", long: true },
      { key: "home.ctaSignup", label: "Button: Get started", text: "Get started free" },
      { key: "home.ctaOpen", label: "Button: Open app (signed in)", text: "Open dashboard" },
      { key: "home.ctaServices", label: "Button: Services", text: "See our services" },
      { key: "home.howTitle", label: "Section: How it works", text: "How it works" },
      { key: "home.step1Title", label: "Step 1 title", text: "Add the facts your team relies on" },
      { key: "home.step1Text", label: "Step 1 text", text: "Save your services, prices and policies so reply drafts can use your information instead of making it up.", long: true },
      { key: "home.step2Title", label: "Step 2 title", text: "Bring customer messages together" },
      { key: "home.step2Text", label: "Step 2 text", text: "Paste a message, connect your email, or use a shareable contact page.", long: true },
      { key: "home.step3Title", label: "Step 3 title", text: "Review the draft before it goes out" },
      { key: "home.step3Text", label: "Step 3 text", text: "Check urgency and tone, edit the suggested reply, and send it only when your team is ready.", long: true },
      { key: "home.featuresTitle", label: "Section: What you get", text: "What you get" },
      { key: "home.learnMore", label: "Link: Learn more", text: "Learn more →" },
      { key: "home.readyTitle", label: "Bottom box title", text: "Try it with a real customer message" },
      { key: "home.readyText", label: "Bottom box text", text: "Add your business facts, review a draft, and decide what to send. Nothing is sent without your action.", long: true },
    ],
  },
  {
    id: "contact",
    title: "Contact us page",
    hint: "The page and form where visitors write to you.",
    items: [
      { key: "contact.title", label: "Page title", text: "Contact us" },
      { key: "contact.intro", label: "Page description", text: "Send us a message and we will reply. The more detail you give, the faster we can help.", long: true },
      { key: "contact.helpTitle", label: "Side heading", text: "What can we help with?" },
      { key: "contact.topic1Title", label: "Topic 1 title", text: "Questions" },
      { key: "contact.topic1Text", label: "Topic 1 text", text: "How a feature works, or whether Inquiry Desk fits your business.", long: true },
      { key: "contact.topic2Title", label: "Topic 2 title", text: "Problems" },
      { key: "contact.topic2Text", label: "Topic 2 text", text: "Something not working? Tell us what you saw and what you expected.", long: true },
      { key: "contact.topic3Title", label: "Topic 3 title", text: "Ideas" },
      { key: "contact.topic3Text", label: "Topic 3 text", text: "Missing a feature? Feature requests help us decide what to build next.", long: true },
      { key: "contact.topic4Title", label: "Topic 4 title", text: "Partnerships" },
      { key: "contact.topic4Text", label: "Topic 4 text", text: "Want to work with us or offer Inquiry Desk to your customers?", long: true },
      { key: "contact.labelName", label: "Form: name label", text: "Full name" },
      { key: "contact.labelEmail", label: "Form: email label", text: "Email" },
      { key: "contact.labelPhone", label: "Form: phone label", text: "Phone number" },
      { key: "contact.labelMethod", label: "Form: reply method label", text: "How should we reply?" },
      { key: "contact.labelAbout", label: "Form: topic label", text: "What is it about?" },
      { key: "contact.labelService", label: "Form: service label", text: "Which service?" },
      { key: "contact.labelMessage", label: "Form: message label", text: "Message" },
      { key: "contact.send", label: "Form: send button", text: "Send message" },
      { key: "contact.sending", label: "Form: button while sending", text: "Sending…" },
      { key: "contact.privacy", label: "Form: privacy note", text: "We use your details only to reply to this message.", long: true },
      { key: "contact.thanksTitle", label: "After sending: title", text: "Thank you, we got your message" },
      { key: "contact.off", label: "When the form is turned off", text: "Messages are paused right now. Please check back soon.", long: true },
    ],
  },
  {
    id: "auth",
    title: "Sign in and sign up",
    hint: "The login and registration screens.",
    items: [
      { key: "auth.heroTitle", label: "Side headline", text: "Never miss an urgent customer message.", long: true },
      { key: "auth.heroText", label: "Side description", text: "Every message is sorted by urgency, with a reply ready to review.", long: true },
      { key: "auth.signInTitle", label: "Sign in: title", text: "Welcome back" },
      { key: "auth.signUpTitle", label: "Sign up: title", text: "Create your account" },
      { key: "auth.intro", label: "Intro under the title", text: "Your messages, profile and contact pages are saved to your account, so nothing is lost when you switch device.", long: true },
      { key: "auth.google", label: "Google button", text: "Continue with Google" },
      { key: "auth.signInButton", label: "Sign in button", text: "Sign in" },
      { key: "auth.signUpButton", label: "Create account button", text: "Create account" },
      { key: "auth.toSignUp", label: "Link to sign up", text: "New here? Create an account" },
      { key: "auth.toSignIn", label: "Link to sign in", text: "Have an account? Sign in" },
    ],
  },
  {
    id: "app",
    title: "App screen",
    hint: "The main screen people use to triage messages.",
    items: [
      { key: "app.subtitle", label: "Header description", text: "Sort customer messages by urgency, then review a ready-made reply.", long: true },
      { key: "app.profileTitle", label: "Business profile box title", text: "Business profile" },
      { key: "app.emailTitle", label: "Email inbox box title", text: "Email inbox" },
      { key: "app.messageTitle", label: "Message box title", text: "Customer message" },
      { key: "app.messagePlaceholder", label: "Message box placeholder", text: "Paste an email or contact-form message here" },
      { key: "app.sampleLabel", label: "Samples label", text: "Try a sample:" },
      { key: "app.toneLabel", label: "Tone label", text: "Reply tone" },
      { key: "app.languageLabel", label: "Language label", text: "Reply language" },
      { key: "app.modeLabel", label: "Reply mode label", text: "Reply mode" },
      { key: "app.triageButton", label: "Main button", text: "Triage message" },
      { key: "app.triageLoading", label: "Main button while working", text: "Reading message…" },
      { key: "app.resultTitle", label: "Result title", text: "Triage result" },
      { key: "app.disclaimer", label: "Footer note", text: "Replies are drafts. Always review before sending." },
    ],
  },
];

const ABOUT_TEXT_SECTION: TextSection = {
  id: "about",
  title: "About page",
  hint: "The story, values and call to action on the About page.",
  items: [
    { key: "about.title", label: "Page title", text: "About Inquiry Desk" },
    { key: "about.intro", label: "Intro", text: "A calm place to handle customer messages, built for businesses that do not have a support team.", long: true },
    { key: "about.whyTitle", label: "Why section heading", text: "Why we built it" },
    { key: "about.why1", label: "Why paragraph 1", text: "Small businesses get messages everywhere: email, contact forms, social media and chat. The urgent ones are easy to miss, and the answers take time because every reply needs the right price, the right policy and the right tone.", long: true },
    { key: "about.why2", label: "Why paragraph 2", text: "Inquiry Desk puts those messages in one place, shows which need an answer first, and writes a draft from your own business facts. Then it checks the draft, so a wrong price or an invented promise does not reach your customer.", long: true },
    { key: "about.whatTitle", label: "What it does heading", text: "What it does" },
    { key: "about.whatText", label: "What it does text", text: "It reads each message and labels its category, urgency, mood and the team that should handle it. It drafts a reply in your tone and language, remembers returning customers, gives you a contact page and QR code, and can alert your team in Slack, Teams or Discord. You can see every service in detail on the", long: true },
    { key: "about.servicesLink", label: "Services link", text: "services page." },
    { key: "about.valuesTitle", label: "Values heading", text: "What we stand for" },
    { key: "about.value1Title", label: "Value 1 title", text: "You stay in charge" },
    { key: "about.value1Text", label: "Value 1 description", text: "Replies are drafts. Nothing is sent without you, and email sending asks you to confirm every time.", long: true },
    { key: "about.value2Title", label: "Value 2 title", text: "Facts, not guesses" },
    { key: "about.value2Text", label: "Value 2 description", text: "Replies are written from the prices, hours and policies you give it, and checked against them.", long: true },
    { key: "about.value3Title", label: "Value 3 title", text: "Privacy first" },
    { key: "about.value3Text", label: "Value 3 description", text: "Card numbers, ID numbers and passwords are hidden before the AI sees a message.", long: true },
    { key: "about.value4Title", label: "Value 4 title", text: "Your data is yours" },
    { key: "about.value4Text", label: "Value 4 description", text: "Everything is saved to your own account. Only you can read it, and you can delete what is kept.", long: true },
    { key: "about.limitsTitle", label: "Limits heading", text: "Honest about the limits" },
    { key: "about.limitsText", label: "Limits text", text: "The AI can be wrong. That is why every result has a needs-review flag, every reply is a draft, and the reply guard points at anything it cannot find in your facts. Please read a reply before you send it.", long: true },
    { key: "about.ctaTitle", label: "Contact call-to-action heading", text: "Want to talk to us?" },
    { key: "about.ctaText", label: "Contact call-to-action text", text: "Questions, ideas or problems are all welcome.", long: true },
    { key: "about.ctaButton", label: "Contact button", text: "Contact us" },
  ],
};

const SERVICES_PAGE_TEXT_SECTION: TextSection = {
  id: "services",
  title: "Services pages",
  hint: "The service directory and shared service-detail labels.",
  items: [
    { key: "services.title", label: "Directory title", text: "Our services" },
    { key: "services.intro", label: "Directory intro", text: "Everything you need to sort, answer and keep track of customer messages. Open any service to see exactly what it does and how it works.", long: true },
    { key: "services.seeDetails", label: "Details link", text: "See details →" },
    { key: "services.ctaTitle", label: "Call-to-action title", text: "Not sure which one you need?" },
    { key: "services.ctaText", label: "Call-to-action text", text: "Tell us what kind of messages you get and we will point you in the right direction.", long: true },
    { key: "services.ctaButton", label: "Contact button", text: "Contact us" },
    { key: "service.breadcrumb", label: "Breadcrumb", text: "Services" },
    { key: "service.countPrefix", label: "Detail count prefix", text: "Service" },
    { key: "service.countOf", label: "Detail count separator", text: "of" },
    { key: "service.getStarted", label: "Get-started button", text: "Get started free" },
    { key: "service.askQuestion", label: "Question button", text: "Ask a question" },
    { key: "service.whatYouGet", label: "Benefits heading", text: "What you get" },
    { key: "service.howItWorks", label: "Steps heading", text: "How it works" },
    { key: "service.whoFor", label: "Audience heading", text: "Who it is for" },
    { key: "service.goodToKnow", label: "Note label", text: "Good to know:" },
    { key: "service.more", label: "Related services heading", text: "More services" },
  ],
};

const SERVICE_TEXT_SECTIONS: TextSection[] = SERVICES.map((service) => {
  return {
    id: `service-${service.slug}`,
    title: service.title,
    hint: `Editable copy for the ${service.title} directory card and detail page.`,
    items: [
      { key: serviceTextKey(service.slug, "title"), label: "Title", text: service.title },
      { key: serviceTextKey(service.slug, "short"), label: "Short description", text: service.short, long: true },
      { key: serviceTextKey(service.slug, "intro"), label: "Detail introduction", text: service.intro, long: true },
      { key: serviceTextKey(service.slug, "fit"), label: "Who it is for", text: service.fit, long: true },
      ...(service.note ? [{ key: serviceTextKey(service.slug, "note"), label: "Good-to-know note", text: service.note, long: true }] : []),
      ...service.gets.flatMap(([title, text], index) => [
        { key: serviceTextKey(service.slug, `benefit${index + 1}Title`), label: `Benefit ${index + 1} title`, text: title },
        { key: serviceTextKey(service.slug, `benefit${index + 1}Text`), label: `Benefit ${index + 1} description`, text, long: true },
      ]),
      ...service.steps.map((text, index) => ({
        key: serviceTextKey(service.slug, `step${index + 1}`),
        label: `Step ${index + 1}`,
        text,
        long: true,
      })),
    ],
  };
});

export const TEXT_SECTIONS: TextSection[] = [
  ...CORE_TEXT_SECTIONS,
  ABOUT_TEXT_SECTION,
  SERVICES_PAGE_TEXT_SECTION,
  ...SERVICE_TEXT_SECTIONS,
];

export const TEXT_DEFAULTS: Record<string, string> = Object.fromEntries(
  TEXT_SECTIONS.flatMap((s) => s.items.map((i) => [i.key, i.text])),
);

const HEX = /^#[0-9a-fA-F]{6}$/;
const CACHE_KEY = "siteConfig";

const vars = (c: Colors) =>
  Object.entries(c)
    .filter(([k, v]) => /^[a-z]{1,8}$/.test(k) && typeof v === "string" && HEX.test(v))
    .map(([k, v]) => `--${k}:${v}`)
    .join(";");

/** CSS that mirrors the selectors in globals.css, so admin colors win in every theme mode. */
export function themeCss(colors: { light: Colors; dark: Colors }): string {
  const l = vars(colors.light ?? {});
  const d = vars(colors.dark ?? {});
  let css = "";
  if (l) css += `:root{${l}}`;
  if (d) css += `@media (prefers-color-scheme: dark){:root[data-theme="system"]{${d}}}`;
  if (l) css += `:root[data-theme="light"]{${l}}`;
  if (d) css += `:root[data-theme="dark"]{${d}}`;
  return css;
}

function paint(css: string) {
  let el = document.getElementById("site-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "site-theme";
    document.head.appendChild(el);
  }
  el.textContent = css;
}

// Runs before the first paint so a saved palette never flashes the default one.
export const THEME_BOOT_SCRIPT =
  "try{var c=localStorage.getItem('siteThemeCss');if(c&&c.length<3000&&/^[A-Za-z0-9 :;#,{}()\\-\"\\[\\]=@.]+$/.test(c)){var s=document.createElement('style');s.id='site-theme';s.textContent=c;document.head.appendChild(s)}}catch(e){}";

type Ctx = {
  config: SiteConfig;
  loaded: boolean;
  setConfig: (c: SiteConfig) => void;
  /** Shows unsaved colors on the whole site (admin dashboard). Pass null to go back to the saved ones. */
  preview: (colors: { light: Colors; dark: Colors } | null) => void;
};

const SiteContext = createContext<Ctx>({
  config: EMPTY_CONFIG,
  loaded: false,
  setConfig: () => {},
  preview: () => {},
});

function normalize(raw: unknown): SiteConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<SiteConfig>;
  const obj = <T,>(v: unknown): Record<string, T> => (v && typeof v === "object" ? (v as Record<string, T>) : {});
  return {
    features: obj<boolean>(r.features),
    colors: { light: obj<string>(r.colors?.light), dark: obj<string>(r.colors?.dark) },
    texts: obj<string>(r.texts),
    updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : 0,
  };
}

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<SiteConfig>(EMPTY_CONFIG);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((c: SiteConfig) => {
    setConfigState(c);
    const css = themeCss(c.colors);
    paint(css);
    try {
      if (css) localStorage.setItem("siteThemeCss", css);
      else localStorage.removeItem("siteThemeCss");
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {
      // Storage can be blocked; the site still works without the cache.
    }
  }, []);

  useEffect(() => {
    let live = true;
    let cachedConfig: SiteConfig | null = null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) cachedConfig = normalize(JSON.parse(cached));
    } catch {
      // A broken cache is ignored.
    }
    const fromCache = cachedConfig ? Promise.resolve(cachedConfig) : Promise.resolve(null);
    fromCache.then((c) => {
      if (live && c) setConfigState(c);
    });
    fetch("/api/config", { cache: "no-store", headers: companyHeader() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (live && data) apply(normalize(data));
      })
      .catch(() => {})
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [apply]);

  const preview = useCallback(
    (colors: { light: Colors; dark: Colors } | null) => {
      paint(themeCss(colors ?? config.colors));
    },
    [config.colors],
  );

  const value = useMemo(
    () => ({ config, loaded, setConfig: apply, preview }),
    [config, loaded, apply, preview],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSiteConfig = () => useContext(SiteContext);

/** Features are on unless the admin turned them off. */
export function useFeature(key: string): boolean {
  return useContext(SiteContext).config.features[key] !== false;
}

export function useText(key: string): string {
  return useContext(SiteContext).config.texts[key] || TEXT_DEFAULTS[key] || "";
}

/** Renders an admin-editable text. */
export function T({ id }: { id: string }) {
  return <>{useText(id)}</>;
}
