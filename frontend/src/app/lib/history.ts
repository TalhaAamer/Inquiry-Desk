import type { HistoryItem, Settings } from "./types";

const HISTORY_KEY = "inquiry-desk:history";
const SETTINGS_KEY = "inquiry-desk:settings";
export const HISTORY_LIMIT = 25;

export function loadHistory(): HistoryItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // Storage full or blocked: history just won't persist.
  }
}

export function loadSettings(): Partial<Settings> {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Ignore: settings just won't persist.
  }
}

const ENGLISH_WORDS = new Set(
  "the a an and or but is are was were be to of in on for with at by from this that it i we you he she they my our your please can could would hi hello thanks thank need want have has not do does how what when where why will just as if so me us".split(
    " ",
  ),
);

// Cheap guess so the translate link only appears for messages that are probably not English.
export function looksNonEnglish(text: string): boolean {
  const t = text.trim();
  if (t.length < 10) return false;
  if (/[^\u0000-\u024F\s\p{P}\p{S}\p{N}]/u.test(t)) return true;
  const words = t.toLowerCase().match(/[a-z\u00C0-\u024F']+/g) ?? [];
  if (words.length < 4) return false;
  const hits = words.filter((w) => ENGLISH_WORDS.has(w)).length;
  return hits / words.length < 0.15;
}

export function parseSettings(text: string): Settings | null {
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== "object") return null;
    const str = (v: unknown, max: number) =>
      typeof v === "string" ? v.slice(0, max) : "";
    return {
      business: str(raw.business, 300),
      knowledge: str(raw.knowledge, 6000),
      tone: ["friendly", "professional", "short"].includes(raw.tone)
        ? raw.tone
        : "friendly",
      language: str(raw.language, 40) || "same as the customer",
    };
  } catch {
    return null;
  }
}

const csvCell = (v: unknown) => {
  let s = String(v ?? "").replace(/\r?\n/g, " ");
  // Stop spreadsheet apps from running customer text as a formula.
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function toCsv(items: HistoryItem[]): string {
  const head = [
    "Date",
    "Category",
    "Urgency",
    "Sentiment",
    "Team",
    "Name",
    "Email",
    "Budget",
    "Needs review",
    "Status",
    "Summary",
    "Next step",
    "Message",
  ];
  const rows = items.map(({ at, message, result: r, status }) =>
    [
      new Date(at).toISOString(),
      r.category,
      r.urgency,
      r.sentiment,
      r.team,
      r.sender_name,
      r.sender_email,
      r.budget,
      r.needs_review ? "yes" : "no",
      status ?? "new",
      r.summary,
      r.next_step,
      message,
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.map(csvCell).join(","), ...rows].join("\r\n");
}

export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
