"use client";

import { useEffect, useRef, useState } from "react";
import History from "./components/History";
import KnowledgeGaps from "./components/KnowledgeGaps";
import ResultCard from "./components/ResultCard";
import {
  download,
  HISTORY_LIMIT,
  loadHistory,
  loadSettings,
  looksNonEnglish,
  parseSettings,
  saveHistory,
  saveSettings,
} from "./lib/history";
import { redact, splitInbox, dueAt, formatDue } from "./lib/guard";
import {
  addExample,
  clearAllMemory,
  findEmail,
  getCustomer,
  isRealEdit,
  loadCustomers,
  loadVoice,
  pickExamples,
  priorOf,
  recordCustomer,
  saveVoice,
  toHistoryPayload,
  type VoiceStore,
} from "./lib/memory";
import { speechLang, useDictation } from "./lib/voice";
import { clearAccount, isRemembered, loadAccount, saveAccount, type EmailAccount } from "./lib/email";
import EmailConnect from "./components/EmailConnect";
import IntegrationsDialog from "./components/IntegrationsDialog";
import {
  DEFAULT_ALERTS,
  alertPayload,
  loadAlerts,
  loadSites,
  saveAlerts,
  saveSites,
  shouldAlert,
  type AlertSettings,
  type SiteConn,
} from "./lib/integrations";
import ThemeToggle from "./components/ThemeToggle";
import type { HistoryItem, Img, InboxEmail, PriorContact, Triage } from "./lib/types";

const SAMPLES: Record<string, string> = {
  "Website quote":
    "Hi, I'm Sara from Lumen Bakery (sara@lumenbakery.com). We need a new website with online ordering before the holidays. Budget is around $4,000. Could you send a quote this week?",
  "Broken checkout":
    "URGENT: our checkout page has shown a white screen since this morning and we're losing orders. Please call me ASAP. Ahmed, ahmed@shopnest.com",
  "Invoice question":
    "Hello, invoice #204 shows $450 but we agreed on $400. Could you check and send a corrected one? Thanks, Bilal",
};
const MAX_IMAGES = 3;
const nowMs = () => Date.now();
const MAX_BATCH = 10;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PREVIEW = [
  ["Category and urgency", "What it is, and how fast to reply"],
  ["Reply deadline", "The exact time to reply by, with an overdue alert in your history"],
  ["Sentiment and team", "How the customer feels, and who should handle it"],
  ["Questions to ask", "What is missing before your team can act"],
  ["Screenshot notes", "What the images show"],
  ["Draft reply", "In your tone and language, ready to edit"],
  ["Message X-ray", "The exact phrases that drove the urgency and mood score"],
  ["Reaction simulator", "How the customer will feel when they read your reply"],
  ["Reply guard", "Flags prices, dates and promises that are not in your facts"],
  ["Three versions", "Short, warm and formal replies to compare side by side"],
  ["Rewrite, email and team note", "Change the draft, open it in your email app, or copy a handoff note"],
  ["Privacy shield", "Card numbers and passwords are hidden before the AI sees them"],
  ["Returning customers", "Remembers who wrote before and warns you about repeat complaints"],
  ["Instant proposal", "For new projects: a scope, timeline and ready-to-send offer"],
  ["Your writing style", "Drafts get closer to how you write after every edit you make"],
  ["Voice and email", "Dictate a message, read replies aloud, or send from your own inbox"],
];
const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const card = "rounded-[20px] border border-line bg-card p-4 shadow-sm sm:p-6";

async function shrink(file: File): Promise<Img> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

  const type =
    file.type === "image/jpeg" || file.type === "image/webp"
      ? file.type
      : "image/png";
  let url = canvas.toDataURL(type, 0.85);
  if (url.length > 3_000_000) url = canvas.toDataURL("image/jpeg", 0.8);
  const media_type = url.slice(5, url.indexOf(";")) as Img["media_type"];
  return { name: file.name, preview: url, data: url.split(",")[1], media_type };
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [business, setBusiness] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("same as the customer");

  const [mode, setMode] = useState<"human" | "auto">("human");
  const [result, setResult] = useState<Triage | null>(null);
  const [run, setRun] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDialogElement>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [ready, setReady] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [translation, setTranslation] = useState<{
    text: string;
    from: string;
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [meta, setMeta] = useState<{
    message: string;
    at: number;
    prior?: PriorContact;
  }>({ message: "", at: 0 });
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [batchView, setBatchView] = useState<HistoryItem[] | null>(null);
  const [shieldNote, setShieldNote] = useState("");
  const [sites, setSites] = useState<SiteConn[]>([]);
  const [alerts, setAlerts] = useState<AlertSettings>(DEFAULT_ALERTS);
  const [siteFetching, setSiteFetching] = useState(false);
  const [alertNote, setAlertNote] = useState("");
  const intRef = useRef<HTMLDialogElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [voice, setVoice] = useState<VoiceStore>({ enabled: true, examples: [] });
  const [customerCount, setCustomerCount] = useState(0);
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [remembered, setRemembered] = useState(false);
  const emailRef = useRef<HTMLDialogElement>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [siteInput, setSiteInput] = useState("");
  const [siteBusy, setSiteBusy] = useState(false);
  const [siteNote, setSiteNote] = useState("");
  const dictBase = useRef("");
  const dict = useDictation(speechLang(language), (final, interim) => {
    dictBase.current += final;
    setMessage(dictBase.current + interim);
  });

  // Restore saved settings and history after mount to avoid a hydration mismatch.
  useEffect(() => {
    const t = setTimeout(() => {
      const s = loadSettings();
      if (typeof s.business === "string") setBusiness(s.business);
      if (typeof s.knowledge === "string") setKnowledge(s.knowledge);
      if (typeof s.tone === "string") setTone(s.tone);
      if (typeof s.language === "string") setLanguage(s.language);
      setHistory(loadHistory());
      setVoice(loadVoice());
      setCustomerCount(Object.keys(loadCustomers()).length);
      setAccount(loadAccount());
      setSites(loadSites());
      setAlerts(loadAlerts());
      setRemembered(isRemembered());
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) saveSettings({ business, knowledge, tone, language });
  }, [ready, business, knowledge, tone, language]);

  useEffect(() => {
    if (ready) saveHistory(history);
  }, [ready, history]);

  useEffect(() => {
    if (ready) saveSites(sites);
  }, [ready, sites]);

  useEffect(() => {
    if (ready) saveAlerts(alerts);
  }, [ready, alerts]);

  function patchHistory(id: string, patch: Partial<HistoryItem>) {
    setHistory((cur) => cur.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  function updateVoice(next: VoiceStore) {
    setVoice(next);
    saveVoice(next);
  }

  // Remembers how the owner rewrote a draft, so later drafts sound like them.
  function learnVoice(original: string, edited: string) {
    if (!voice.enabled || !result || !isRealEdit(original, edited)) return;
    const next = addExample(voice, { category: result.category, original, edited });
    if (next !== voice) updateVoice(next);
  }

  function openFromHistory(item: HistoryItem, fromBatch = false) {
    if (!fromBatch) setBatchView(null);
    setMessage(item.message);
    setResult({
      ...item.result,
      reply_draft: item.reply ?? item.result.reply_draft,
    });
    setCurrentId(item.id);
    setMeta({ message: item.message, at: item.at, prior: item.prior });
    setTranslation(null);
    setRun((n) => n + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function translateMessage() {
    if (!message.trim()) return;
    setTranslating(true);
    setError("");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, target: "English" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Could not translate.",
        );
      }
      setTranslation({ text: data.text, from: data.detected_language });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not translate.");
    } finally {
      setTranslating(false);
    }
  }

  function exportSettings() {
    download(
      "inquiry-desk-profile.json",
      JSON.stringify({ business, knowledge, tone, language }, null, 2),
      "application/json",
    );
  }

  async function importSettings(file: File | undefined) {
    if (!file) return;
    const s = parseSettings(await file.text());
    if (!s) {
      alert("That file is not a valid profile backup.");
      return;
    }
    setBusiness(s.business);
    setKnowledge(s.knowledge);
    setTone(s.tone);
    setLanguage(s.language);
  }

  async function addFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type));
    if (files.length && !valid.length) {
      setError("Use PNG, JPG, WebP or GIF images.");
      return;
    }
    const pics = valid.slice(0, MAX_IMAGES - images.length);
    if (!pics.length) return;
    try {
      const done = await Promise.all(pics.map(shrink));
      setImages((cur) => [...cur, ...done].slice(0, MAX_IMAGES));
    } catch {
      setError("Could not read that image. Try a PNG or JPG.");
    }
  }

  // Triage one message, using what we remember about the sender and the owner's past edits.
  async function callTriage(
    text: string,
    imgs: Img[],
  ): Promise<{ result: Triage; prior?: PriorContact }> {
    const known = getCustomer(findEmail(text));
    const res = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        images: imgs.map(({ media_type, data }) => ({ media_type, data })),
        business,
        knowledge,
        tone,
        language,
        style_examples: pickExamples(voice).map(({ original, edited }) => ({
          original,
          edited,
        })),
        customer_history: toHistoryPayload(known),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        Array.isArray(data.detail)
          ? data.detail[0].msg.replace("Value error, ", "")
          : (data.detail ?? "Something went wrong."),
      );
    }
    const result = data as Triage;
    maybeAlert(result);
    const email = result.sender_email?.toLowerCase() ?? findEmail(text);
    const prior = priorOf(getCustomer(email));
    recordCustomer(email, result.sender_name, result.summary, result.sentiment, nowMs());
    setCustomerCount(Object.keys(loadCustomers()).length);
    return { result, prior };
  }

  function describeShield(count: number, kinds: string[]) {
    setShieldNote(
      count
        ? `Privacy shield hid ${count} sensitive item${count > 1 ? "s" : ""} (${kinds.join(", ")}) before sending to the AI.`
        : "",
    );
  }

  async function triage() {
    if (mode === "auto") return;
    setError("");
    if (message.trim().length < 10 && images.length === 0) {
      setError("Add a message of at least 10 characters or a screenshot.");
      return;
    }
    setLoading(true);
    try {
      const shield = redact(message);
      const { result: data, prior } = await callTriage(shield.text, images);
      describeShield(shield.count, shield.kinds);
      const id = crypto.randomUUID();
      const at = nowMs();
      setResult(data);
      setBatchView(null);
      setMeta({ message: shield.text, at, prior });
      setRun((n) => n + 1);
      setCurrentId(id);
      setHistory((cur) =>
        [
          { id, at, message: shield.text, result: data, status: "new" as const, prior },
          ...cur,
        ].slice(0, HISTORY_LIMIT),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const inboxParts = splitInbox(message);
  const isBatch = inboxParts.length >= 2;

  async function triageAll() {
    if (mode === "auto" || batch) return;
    const list = inboxParts.slice(0, MAX_BATCH);
    setError("");
    setBatch({ done: 0, total: list.length });
    const found: (HistoryItem | undefined)[] = [];
    const kinds = new Set<string>();
    let hidden = 0;
    let failed = 0;
    let next = 0;
    const worker = async () => {
      while (next < list.length) {
        const i = next++;
        const shield = redact(list[i]);
        hidden += shield.count;
        shield.kinds.forEach((k) => kinds.add(k));
        try {
          const { result: r, prior } = await callTriage(shield.text, []);
          found[i] = {
            id: crypto.randomUUID(),
            at: Date.now(),
            message: shield.text,
            result: r,
            status: "new",
            prior,
          };
        } catch {
          failed++;
        }
        setBatch((b) => (b ? { ...b, done: b.done + 1 } : b));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const ok = found.filter((x): x is HistoryItem => Boolean(x));
    setBatch(null);
    describeShield(hidden, [...kinds]);
    if (ok.length) {
      setHistory((cur) => [...ok, ...cur].slice(0, HISTORY_LIMIT));
      setBatchView(ok);
      setResult(null);
      setCurrentId(null);
    }
    if (failed) {
      setError(
        `${failed} of ${list.length} messages could not be triaged. Try those again.`,
      );
    }
  }

  // Shared by the email and website message loaders: turns messages into inbox-mode text.
  function loadIntoInbox(emails: InboxEmail[]) {
    setMessage(
      emails
        .map((e) => {
          const from = e.from_email ? `${e.from_name} <${e.from_email}>` : e.from_name || "Website visitor";
          const id = e.message_id ? `Message-ID: ${e.message_id}\n` : "";
          return (
            `From: ${from}\nSubject: ${e.subject}\n${id}\n` +
            e.body.slice(0, 3200).replace(/^\s*(?:-{3,}|={3,})\s*$/gm, "—")
          );
        })
        .join("\n---\n"),
    );
    setImages([]);
    setTranslation(null);
  }

  async function fetchEmails() {
    if (!account) return;
    setEmailBusy(true);
    setError("");
    try {
      const res = await fetch("/api/inbox/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, limit: MAX_BATCH }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Could not read the inbox.",
        );
      }
      const emails = data.emails as InboxEmail[];
      if (!emails.length) {
        setError("No unread emails found.");
        return;
      }
      loadIntoInbox(emails);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the inbox.");
    } finally {
      setEmailBusy(false);
    }
  }

  // Pulls waiting website messages, filling the batch from each connected site in turn.
  async function fetchWebsite() {
    setSiteFetching(true);
    setError("");
    try {
      const all: InboxEmail[] = [];
      for (const s of sites) {
        if (all.length >= MAX_BATCH) break;
        const res = await fetch("/api/sites/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id, secret: s.secret, limit: MAX_BATCH - all.length }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof data.detail === "string" ? data.detail : "Could not read website messages.",
          );
        }
        all.push(...(data.emails as InboxEmail[]));
      }
      if (!all.length) {
        setError("No new customer messages.");
        return;
      }
      loadIntoInbox(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read website messages.");
    } finally {
      setSiteFetching(false);
    }
  }

  // Posts a short alert to the owner's webhook when an inquiry is urgent. Never blocks triage.
  function maybeAlert(r: Triage) {
    if (!shouldAlert(alerts, r)) return;
    const p = alertPayload(r);
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: alerts.url.trim(), ...p }),
    })
      .then((res) => res.json().then((d) => ({ ok: res.ok, d })))
      .then(({ ok, d }) =>
        setAlertNote(
          ok
            ? "Alert sent to your webhook."
            : `Alert not sent: ${typeof d.detail === "string" ? d.detail : "unknown error"}`,
        ),
      )
      .catch(() => setAlertNote("Alert not sent: could not reach the server."));
  }

  // Returns an error message, or an empty string when the email was sent.
  async function sendReply(reply: string): Promise<string> {
    const to = result?.sender_email;
    if (!to || !account) return "Connect your email first.";
    const subject = meta.message.match(/^Subject:\s*(.+)$/im)?.[1]?.trim();
    const messageId = meta.message.match(/^Message-ID:\s*(<[^>\s]+>)/im)?.[1] ?? "";
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          to,
          subject: subject
            ? /^re:/i.test(subject)
              ? subject
              : `Re: ${subject}`
            : `Re: ${result.summary}`.slice(0, 190),
          body: reply,
          in_reply_to: messageId,
          confirm: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return typeof data.detail === "string" ? data.detail : "Could not send.";
      }
      if (currentId) patchHistory(currentId, { status: "replied", reply });
      return "";
    } catch {
      return "Could not reach the server.";
    }
  }

  // "cheezious" or "cheezious.com" become a web address; anything with spaces is pasted text.
  function siteAddress(value: string): string | null {
    if (/^https?:\/\//i.test(value)) return value;
    if (/\s/.test(value)) return null;
    return `https://${value.includes(".") ? value : `www.${value}.com`}`;
  }

  async function importSite() {
    const value = siteInput.trim();
    if (!value) return;
    const address = siteAddress(value);
    if (!address && value.length < 20) {
      setSiteNote(
        "Enter your website address (like yourcompany.com) or paste your menu, prices and policies.",
      );
      return;
    }
    setSiteBusy(true);
    setSiteNote(address ? `Reading ${address} …` : "");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address ? { url: address } : { text: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.detail)
            ? data.detail[0].msg.replace("Value error, ", "")
            : (data.detail ?? "Could not build the profile."),
        );
      }
      if (!business.trim()) setBusiness(data.business);
      setKnowledge((k) =>
        (k.trim() ? `${k.trim()}\n\n${data.knowledge}` : data.knowledge).slice(0, 6000),
      );
      setSiteInput("");
      setSiteNote(
        `Added from ${address ? address.replace(/^https?:\/\//, "") : "your text"}. Review the facts below and fix anything that is wrong.`,
      );
    } catch (e) {
      setSiteNote(e instanceof Error ? e.message : "Could not build the profile.");
    } finally {
      setSiteBusy(false);
    }
  }

  function addGapLabel(label: string) {
    setKnowledge((k) =>
      k.includes(label) ? k : `${k.trim()}${k.trim() ? "\n" : ""}${label} `.slice(0, 6000),
    );
    profileRef.current?.showModal();
  }

  function toggleMic() {
    if (dict.listening) {
      dict.stop();
      return;
    }
    dictBase.current = message + (message && !/\s$/.test(message) ? " " : "");
    dict.start();
  }

  const profileSet = business.trim() !== "" || knowledge.trim() !== "";

  return (
    <div className="relative isolate">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-accent/15 to-transparent"
    />
    <main className="mx-auto w-full max-w-[1760px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 2xl:px-14">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-9 sm:gap-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-on">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold leading-none tracking-tight sm:text-4xl">
              Inquiry Desk
            </h1>
            <p className="mt-1.5 text-muted">
              Sort customer messages by urgency, then review a ready-made reply.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ul className="flex flex-wrap gap-2 text-sm font-medium text-muted">
            {[
              "Reads screenshots",
              "Replies from your facts",
              "Flags what needs a human",
              "Hides card numbers and passwords",
              "Catches invented prices",
              "Learns your writing style",
              "Remembers returning customers",
            ].map((t) => (
              <li
                key={t}
                className="rounded-full border border-line bg-card px-3.5 py-1.5"
              >
                {t}
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>
      </header>

      <div
        className={`grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] ${
          result || batchView ? "lg:items-start" : ""
        }`}
      >
        <section
          className={`${card} ${
            result || batchView
              ? "lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"
              : ""
          }`}
        >
          <button
            type="button"
            onClick={() => profileRef.current?.showModal()}
            className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${profileSet ? "bg-ok" : "bg-warn"}`}
              />
              <span>
                <b className="block text-sm font-semibold">Business profile</b>
                <span className="text-sm text-muted">
                  {profileSet
                    ? "Set. Replies use your business facts."
                    : "Not set. Add your prices, hours and policies first."}
                </span>
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent">
              {profileSet ? "Edit" : "Set up"}
            </span>
          </button>

          <div className="mb-5 rounded-xl border border-line px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <b className="block text-sm font-semibold">Email inbox</b>
                <span className="break-words text-sm text-muted">
                  {account
                    ? `Connected as ${account.email}`
                    : "Connect your email to read and reply from here."}
                </span>
              </span>
              {account ? (
                <span className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={fetchEmails}
                    disabled={emailBusy}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent disabled:opacity-60"
                  >
                    {emailBusy ? "Fetching…" : "Fetch unread emails"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearAccount();
                      setAccount(null);
                    }}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-accent"
                  >
                    Disconnect
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => emailRef.current?.showModal()}
                  className="rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent"
                >
                  Connect email
                </button>
              )}
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-line px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <b className="block text-sm font-semibold">Contact page and alerts</b>
                <span className="break-words text-sm text-muted">
                  {sites.length
                    ? `${sites.length} contact page${sites.length > 1 ? "s" : ""} ready${alerts.enabled && alerts.url ? " · alerts on" : ""}`
                    : "Get a link customers can use to contact you, and alerts in Slack or Teams."}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                {sites.length > 0 && (
                  <button
                    type="button"
                    onClick={fetchWebsite}
                    disabled={siteFetching}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent disabled:opacity-60"
                  >
                    {siteFetching ? "Fetching…" : "Fetch customer messages"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => intRef.current?.showModal()}
                  className={
                    sites.length
                      ? "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-accent"
                      : "rounded-lg border border-accent px-3 py-1.5 text-sm font-semibold text-accent"
                  }
                >
                  {sites.length ? "Manage" : "Set up"}
                </button>
              </span>
            </div>
          </div>

          <h2 className="mb-4 font-display text-lg font-semibold">
            Customer message
          </h2>
          <textarea
            aria-label="Customer message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setTranslation(null);
            }}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length) {
                e.preventDefault();
                addFiles(files);
              }
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !loading && !batch) {
                e.preventDefault();
                if (isBatch) triageAll();
                else triage();
              }
            }}
            placeholder="Paste an email or contact-form message here"
            maxLength={MAX_BATCH * 4000}
            className={`${field} min-h-36 resize-y`}
          />
          {isBatch && (
            <div
              role="status"
              className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 border-accent bg-accent/10 px-3.5 py-2.5 text-sm"
            >
              <span>
                <b className="font-semibold">
                  Found {inboxParts.length} messages
                </b>{" "}
                separated by ---.{" "}
                {inboxParts.length > MAX_BATCH &&
                  `Only the first ${MAX_BATCH} will be read. `}
                Screenshots are ignored in inbox mode.
              </span>
              <button
                type="button"
                onClick={triageAll}
                disabled={!!batch || mode === "auto"}
                className="rounded-lg bg-accent px-3.5 py-1.5 font-semibold text-on disabled:opacity-60"
              >
                {batch
                  ? `Reading ${batch.done}/${batch.total}…`
                  : `Triage all ${Math.min(inboxParts.length, MAX_BATCH)}`}
              </button>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-3">
              <span>Ctrl+Enter to triage</span>
              {dict.supported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-pressed={dict.listening}
                  className={`rounded-full border px-2.5 py-1 font-semibold ${
                    dict.listening
                      ? "border-hot text-hot"
                      : "border-line text-ink hover:border-accent"
                  }`}
                >
                  {dict.listening ? "● Listening… tap to stop" : "🎤 Dictate"}
                </button>
              )}
            </span>
            <span className="flex items-center gap-3">
              {looksNonEnglish(message) && (
                <button
                  type="button"
                  onClick={translateMessage}
                  disabled={translating}
                  className="font-semibold text-accent underline disabled:opacity-50 disabled:no-underline"
                >
                  {translating ? "Translating…" : "Translate to English"}
                </button>
              )}
              {isBatch ? `${inboxParts.length} messages` : `${message.length}/4000`}
            </span>
          </div>
          {dict.error && (
            <p role="alert" className="mt-1 text-xs text-hot">
              {dict.error}
            </p>
          )}
          {translation && (
            <div className="mt-2 rounded-xl border border-line px-3.5 py-2.5 text-sm">
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>English translation (from {translation.from})</span>
                <button
                  type="button"
                  onClick={() => setTranslation(null)}
                  className="font-semibold hover:text-ink"
                >
                  Hide
                </button>
              </div>
              <p className="whitespace-pre-wrap">{translation.text}</p>
            </div>
          )}

          <div
            className="my-2 flex flex-wrap items-center gap-2"
            aria-label="Sample messages"
          >
            <span className="w-full text-sm text-muted sm:w-auto">Try a sample:</span>
            {Object.entries(SAMPLES).map(([name, text]) => (
              <button
                key={name}
                type="button"
                onClick={() => setMessage(text)}
                className="rounded-full border border-line shrink-0 px-3 py-1.5 text-[13px] hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMessage(Object.values(SAMPLES).join("\n---\n"))}
              title="Loads 3 sample messages at once so you can try triaging a whole inbox"
              className="shrink-0 rounded-full border border-accent px-3 py-1.5 text-[13px] font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Try inbox mode
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            className={`rounded-xl border border-dashed p-3 text-center text-sm text-muted transition ${
              drag ? "border-accent bg-accent/10" : "border-line"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              hidden
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            Drop screenshots here, paste with Ctrl+V, or{" "}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="font-semibold text-accent underline"
            >
              browse
            </button>
            <span className="block text-xs">
              Up to {MAX_IMAGES} images: PNG, JPG, WebP or GIF
            </span>
          </div>

          {images.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {images.map((im, i) => (
                <li key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.preview}
                    alt={im.name}
                    className="h-16 w-16 rounded-lg border border-line object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${im.name}`}
                    onClick={() =>
                      setImages((c) => c.filter((_, j) => j !== i))
                    }
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-bg"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              Reply tone
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className={`${field} mt-1.5 font-normal`}
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="short">Short and direct</option>
              </select>
            </label>
            <label className="text-sm font-medium text-muted">
              Reply language
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`${field} mt-1.5 font-normal`}
              >
                <option value="same as the customer">
                  Same as the customer
                </option>
                <option>English</option>
                <option>Urdu</option>
                <option>Arabic</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            <span
              id="mode-label"
              className="mb-1.5 block text-sm font-medium text-muted"
            >
              Reply mode
            </span>
            <div
              role="radiogroup"
              aria-labelledby="mode-label"
              className="grid grid-cols-1 gap-1 rounded-xl border border-line bg-bg p-1 sm:grid-cols-2"
            >
              {(["human", "auto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    mode === m
                      ? "bg-accent text-on"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {m === "human" ? (
                    "Human review"
                  ) : (
                    <>
                      AI auto-reply
                      <span className="whitespace-nowrap rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                        In progress
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
            {mode === "human" ? (
              <p className="mt-2 text-xs text-muted">
                The AI writes a draft. A person reviews and sends it.
              </p>
            ) : (
              <p
                role="status"
                className="mt-2 rounded-xl border-l-4 border-warn bg-warn/10 px-3.5 py-2.5 text-sm"
              >
                <b className="font-semibold">AI auto-reply is in progress.</b>{" "}
                Triage is disabled while this mode is selected. Switch back to
                Human review to triage a message.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-hot px-3.5 py-3 text-hot"
            >
              {error}
            </p>
          )}

          <button
            onClick={triage}
            disabled={loading || !!batch || mode === "auto"}
            title={
              mode === "auto"
                ? "Unavailable while AI auto-reply is in progress"
                : undefined
            }
            className="mt-5 w-full rounded-xl bg-accent py-3.5 font-semibold text-on transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {loading ? "Reading message…" : "Triage message"}
          </button>
        </section>

        <section aria-live="polite" className={`${card} flex flex-col`}>
          <h2 className="mb-4 font-display text-lg font-semibold">
            Triage result
          </h2>
          {alertNote && (
            <p
              role="status"
              className="mb-4 rounded-xl border-l-4 border-accent bg-accent/10 px-3.5 py-2.5 text-sm"
            >
              🔔 {alertNote}
            </p>
          )}
          {shieldNote && (
            <p
              role="status"
              className="mb-4 rounded-xl border-l-4 border-ok bg-ok/10 px-3.5 py-2.5 text-sm"
            >
              🛡️ {shieldNote}
            </p>
          )}
          {loading || batch ? (
            <div className="space-y-4">
              {batch && (
                <p className="text-sm text-muted">
                  Reading inbox: {batch.done} of {batch.total} done…
                </p>
              )}
              {[
                "h-7 w-2/5",
                "h-5 w-full",
                "h-5 w-4/5",
                "h-24 w-full",
                "h-40 w-full",
              ].map((c) => (
                <div
                  key={c}
                  className={`animate-pulse rounded-lg bg-line motion-reduce:animate-none ${c}`}
                />
              ))}
            </div>
          ) : result ? (
            <>
              {batchView && (
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="mb-4 self-start text-sm font-semibold text-accent underline"
                >
                  ← Back to inbox results ({batchView.length})
                </button>
              )}
              {mode === "auto" && (
                <p
                  role="status"
                  className="mb-4 rounded-xl border-l-4 border-warn bg-warn/10 px-3.5 py-2.5 text-sm"
                >
                  Auto-reply is in progress, so nothing was sent. Review this
                  draft before replying.
                </p>
              )}
              <ResultCard
                key={run}
                data={result}
                context={{ business, knowledge, language, tone }}
                customerMessage={meta.message}
                receivedAt={meta.at}
                prior={meta.prior}
                canSend={!!account}
                onSend={sendReply}
                onLearn={learnVoice}
                onReplyChange={(reply) =>
                  currentId && patchHistory(currentId, { reply })
                }
              />
            </>
          ) : batchView ? (
            <div>
              <p className="mb-2 text-sm text-muted">
                Inbox sorted by urgency. Open one to review its reply.
              </p>
              <ul className="divide-y divide-line">
                {[...batchView]
                  .sort((a, b) => b.result.urgency - a.result.urgency)
                  .map((it, rank) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => openFromHistory(it, true)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-line/40 focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                            it.result.urgency >= 4
                              ? "bg-hot/15 text-hot"
                              : it.result.urgency === 3
                                ? "bg-warn/15 text-warn"
                                : "bg-ok/15 text-ok"
                          }`}
                        >
                          {rank + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate font-semibold">
                            {it.result.summary}
                          </b>
                          <span className="text-xs text-muted">
                            {it.result.sender_name ?? "Unknown sender"} · urgency{" "}
                            {it.result.urgency}/5 · reply by{" "}
                            {formatDue(dueAt(it.at, it.result.urgency))}
                            {it.result.needs_review && " · needs review"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              <p className="mb-3 text-sm text-muted">
                Add a message or screenshot, or paste a whole inbox with
                messages separated by <code className="whitespace-nowrap">---</code>. This panel will show:
              </p>
              <ul className="grid flex-1 auto-rows-fr gap-2.5 sm:grid-cols-2 2xl:grid-cols-3">
                {PREVIEW.map(([title, text]) => (
                  <li
                    key={title}
                    className="rounded-xl border border-line px-3 py-2.5"
                  >
                    <b className="flex items-center gap-2 text-sm font-semibold">
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full bg-accent"
                      />
                      {title}
                    </b>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <History
        items={history}
        onOpen={openFromHistory}
        onDelete={(id) => {
          setHistory((cur) => cur.filter((h) => h.id !== id));
          if (id === currentId) setCurrentId(null);
        }}
        onClear={() => {
          setHistory([]);
          setCurrentId(null);
        }}
        onStatus={(id, status) => patchHistory(id, { status })}
      />

      <KnowledgeGaps items={history} knowledge={knowledge} onAdd={addGapLabel} />

      <IntegrationsDialog
        dialogRef={intRef}
        sites={sites}
        onSites={setSites}
        alerts={alerts}
        onAlerts={setAlerts}
      />

      <EmailConnect
        dialogRef={emailRef}
        remembered={remembered}
        onConnected={(acc, remember) => {
          saveAccount(acc, remember);
          setAccount(acc);
          setRemembered(remember);
        }}
      />

      <p className="mt-6 text-center text-sm text-muted">
        Replies are drafts. Always review before sending.
      </p>

      <dialog
        ref={profileRef}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[min(560px,92vw)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/50"
      >
        <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <h2 className="font-display text-lg font-semibold">
            Business profile
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Set this once. Replies only use what you write here.
          </p>
          <div className="mb-4 rounded-xl border border-line px-3.5 py-3">
            <label className="block text-sm font-medium text-muted">
              Auto-fill from your website or price list
              <span className="mt-1.5 flex gap-2">
                <input
                  value={siteInput}
                  onChange={(e) => setSiteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      importSite();
                    }
                  }}
                  placeholder="yourcompany.com, or paste your menu and prices"
                  className={`${field} min-w-0 flex-1 font-normal`}
                />
                <button
                  type="button"
                  onClick={importSite}
                  disabled={siteBusy || !siteInput.trim()}
                  className="shrink-0 rounded-xl border border-accent px-3.5 text-sm font-semibold text-accent disabled:opacity-60"
                >
                  {siteBusy ? "Reading…" : "Auto-fill"}
                </button>
              </span>
            </label>
            {siteNote && (
              <p role="status" className="mt-2 text-xs text-muted">
                {siteNote}
              </p>
            )}
          </div>
          <label className="block text-sm font-medium text-muted">
            About your business
            <input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              maxLength={300}
              placeholder="Example: a small web design agency"
              className={`${field} mt-1.5 font-normal`}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-muted">
            Business facts (prices, hours, policies)
            <textarea
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              maxLength={6000}
              placeholder="Example: Websites start at $1,500. Support hours: Mon-Fri 9-5. Refunds within 14 days."
              className={`${field} mt-1.5 min-h-32 resize-y font-normal`}
            />
            <span className="mt-1 block text-xs font-normal">
              Optional. Replies only state prices and policies that appear here.
            </span>
          </label>
          <div className="mt-4 rounded-xl border border-line px-3.5 py-3 text-sm">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={voice.enabled}
                onChange={(e) => updateVoice({ ...voice, enabled: e.target.checked })}
                className="mt-1 h-4 w-4 accent-[var(--accent)]"
              />
              <span>
                <b className="block font-semibold">Learn my writing style</b>
                <span className="text-muted">
                  When you edit a draft and copy or send it, the AI studies your
                  changes and writes future drafts the way you do. Learned from{" "}
                  {voice.examples.length} edit{voice.examples.length === 1 ? "" : "s"}.
                </span>
              </span>
            </label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={voice.examples.length === 0}
                onClick={() => confirm("Forget how you write?") && updateVoice({ ...voice, examples: [] })}
                className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent disabled:opacity-50"
              >
                Forget my style
              </button>
              <button
                type="button"
                disabled={customerCount === 0}
                onClick={() => {
                  if (confirm("Forget all returning customers?")) {
                    clearAllMemory();
                    setCustomerCount(0);
                  }
                }}
                className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent disabled:opacity-50"
              >
                Forget {customerCount} customer{customerCount === 1 ? "" : "s"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportSettings}
              className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent"
            >
              Back up profile
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent"
            >
              Restore from file
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                importSettings(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => profileRef.current?.close()}
            className="mt-5 w-full rounded-xl bg-accent py-3 font-semibold text-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Done
          </button>
        </div>
      </dialog>
    </main>
    </div>
  );
}
