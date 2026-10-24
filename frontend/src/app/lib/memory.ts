import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { getUid, later, put, track, userDoc } from "./cloud";
import { db } from "./firebase";
import type { Category, HistoryItem, Sentiment } from "./types";

const MAX_EXAMPLES = 20;
const MAX_CUSTOMERS = 300;

export interface StyleExample {
  category: Category;
  original: string;
  edited: string;
}

export interface VoiceStore {
  enabled: boolean;
  examples: StyleExample[];
}

export interface CustomerRecord {
  name: string | null;
  count: number;
  lastAt: number;
  summaries: string[];
  moods: Sentiment[];
}

// Customer memory is loaded once after sign-in and kept here for quick lookups.
let customers: Record<string, CustomerRecord> = {};

const customerKey = (email: string) => encodeURIComponent(email.toLowerCase());

export async function loadVoice(): Promise<VoiceStore> {
  const snap = await getDoc(userDoc("settings", "voice"));
  const v = (snap.data() ?? {}) as Partial<VoiceStore>;
  return {
    enabled: v.enabled !== false,
    examples: Array.isArray(v.examples) ? v.examples : [],
  };
}

export const saveVoice = (v: VoiceStore) =>
  later("voice", 800, () => put(userDoc("settings", "voice"), v));

const words = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean);

// Counts a rewrite only if the owner changed more than a few words.
export function isRealEdit(original: string, edited: string): boolean {
  if (!edited.trim() || original.trim() === edited.trim()) return false;
  const a = new Set(words(original));
  const b = words(edited);
  const changed = b.filter((w) => !a.has(w)).length;
  return changed >= 3 || Math.abs(original.length - edited.length) > 40;
}

export function addExample(
  store: VoiceStore,
  ex: StyleExample,
): VoiceStore {
  const trimmed = {
    ...ex,
    original: ex.original.slice(0, 1500),
    edited: ex.edited.slice(0, 1500),
  };
  const dup = store.examples.some((e) => e.edited === trimmed.edited);
  if (dup) return store;
  return { ...store, examples: [...store.examples, trimmed].slice(-MAX_EXAMPLES) };
}

// Newest examples for the same category first, then the newest of any category.
export function pickExamples(store: VoiceStore, category?: Category): StyleExample[] {
  if (!store.enabled) return [];
  const newest = [...store.examples].reverse();
  const same = newest.filter((e) => e.category === category);
  const rest = newest.filter((e) => e.category !== category);
  return [...same, ...rest].slice(0, 3);
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
export const findEmail = (text: string) =>
  text.match(EMAIL)?.[0].toLowerCase() ?? null;

export async function loadCustomers(): Promise<Record<string, CustomerRecord>> {
  const snap = await getDocs(collection(db, "users", getUid() ?? "none", "customers"));
  customers = {};
  snap.forEach((d) => {
    const { email, name, count, lastAt, summaries, moods } = d.data();
    if (typeof email === "string") {
      customers[email.toLowerCase()] = { name, count, lastAt, summaries, moods };
    }
  });
  return customers;
}

export const customerTotal = () => Object.keys(customers).length;

export function getCustomer(email: string | null): CustomerRecord | null {
  if (!email) return null;
  return customers[email.toLowerCase()] ?? null;
}

export function recordCustomer(
  email: string | null,
  name: string | null,
  summary: string,
  mood: Sentiment,
  at: number,
) {
  if (!email) return;
  const key = email.toLowerCase();
  const prev = customers[key];
  const next: CustomerRecord = {
    name: name ?? prev?.name ?? null,
    count: (prev?.count ?? 0) + 1,
    lastAt: at,
    summaries: [...(prev?.summaries ?? []), summary].slice(-3),
    moods: [...(prev?.moods ?? []), mood].slice(-5),
  };
  customers[key] = next;
  const uid = getUid();
  if (!uid) return;
  const jobs = [put(userDoc("customers", customerKey(key)), { email: key, ...next })];
  const keys = Object.keys(customers);
  if (keys.length > MAX_CUSTOMERS) {
    // Forget the customers who wrote longest ago.
    keys
      .sort((a, b) => customers[a].lastAt - customers[b].lastAt)
      .slice(0, keys.length - MAX_CUSTOMERS)
      .forEach((k) => {
        delete customers[k];
        jobs.push(deleteDoc(userDoc("customers", customerKey(k))));
      });
  }
  void track(Promise.all(jobs));
}

export const toHistoryPayload = (c: CustomerRecord | null) =>
  c
    ? {
        count: c.count,
        last_summary: c.summaries[c.summaries.length - 1] ?? "",
        moods: c.moods,
      }
    : null;

// Customer facts shown on the result card, kept with each saved inquiry.
export function priorOf(c: CustomerRecord | null): HistoryItem["prior"] {
  return c
    ? {
        count: c.count,
        lastAt: c.lastAt,
        summaries: c.summaries,
        moods: c.moods,
      }
    : undefined;
}

export const isRepeatTrouble = (p: HistoryItem["prior"]) =>
  !!p &&
  p.moods.slice(-2).some((m) => m === "angry" || m === "frustrated");

export async function clearAllMemory() {
  const uid = getUid();
  customers = {};
  if (!uid) return;
  const snap = await getDocs(collection(db, "users", uid, "customers"));
  const batch = writeBatch(db);
  snap.forEach((d) => batch.delete(doc(db, "users", uid, "customers", d.id)));
  await track(batch.commit());
}
