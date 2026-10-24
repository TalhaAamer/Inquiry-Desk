import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  writeBatch,
} from "firebase/firestore";
import { getUid, later, put, userDoc } from "./cloud";
import { db } from "./firebase";
import type { HistoryItem, Settings } from "./types";

export const HISTORY_LIMIT = 25;

// What was last stored for each history item, so only changed items are written.
const stored = new Map<string, string>();

const historyCol = () => collection(db, "users", getUid() ?? "none", "history");

export async function loadHistory(): Promise<HistoryItem[]> {
  const snap = await getDocs(query(historyCol(), orderBy("at", "desc")));
  stored.clear();
  const items: HistoryItem[] = [];
  snap.forEach((d) => {
    const data = { ...d.data() };
    delete data.updatedAt;
    const item = { ...data, id: d.id } as HistoryItem;
    stored.set(d.id, JSON.stringify(item));
    items.push(item);
  });
  return items.slice(0, HISTORY_LIMIT);
}

export function saveHistory(items: HistoryItem[]) {
  later("history", 600, async () => {
    const uid = getUid();
    if (!uid) return;
    const batch = writeBatch(db);
    const keep = new Set<string>();
    let writes = 0;
    for (const item of items) {
      keep.add(item.id);
      const json = JSON.stringify(item);
      if (stored.get(item.id) === json) continue;
      const { id, ...data } = item;
      batch.set(doc(db, "users", uid, "history", id), { ...data, updatedAt: Date.now() });
      stored.set(id, json);
      writes += 1;
    }
    for (const id of [...stored.keys()]) {
      if (keep.has(id)) continue;
      batch.delete(doc(db, "users", uid, "history", id));
      stored.delete(id);
      writes += 1;
    }
    if (writes) await batch.commit();
  });
}

export async function loadSettings(): Promise<Partial<Settings>> {
  const snap = await getDoc(userDoc("settings", "main"));
  return snap.exists() ? (snap.data() as Partial<Settings>) : {};
}

export function saveSettings(s: Settings) {
  later("settings", 800, () => put(userDoc("settings", "main"), s));
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
