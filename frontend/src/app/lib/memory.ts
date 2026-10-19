import type { Category, HistoryItem, Sentiment } from "./types";

const VOICE_KEY = "inquiry-desk:voice";
const CUSTOMER_KEY = "inquiry-desk:customers";
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

function read<T>(key: string, fallback: T): T {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "null");
    return raw ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: nothing is remembered.
  }
}

export const loadVoice = (): VoiceStore => {
  const v = read<Partial<VoiceStore>>(VOICE_KEY, {});
  return {
    enabled: v.enabled !== false,
    examples: Array.isArray(v.examples) ? v.examples : [],
  };
};

export const saveVoice = (v: VoiceStore) => write(VOICE_KEY, v);

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

export const loadCustomers = () =>
  read<Record<string, CustomerRecord>>(CUSTOMER_KEY, {});

export function getCustomer(email: string | null): CustomerRecord | null {
  if (!email) return null;
  return loadCustomers()[email.toLowerCase()] ?? null;
}

export function recordCustomer(
  email: string | null,
  name: string | null,
  summary: string,
  mood: Sentiment,
  at: number,
) {
  if (!email) return;
  const all = loadCustomers();
  const key = email.toLowerCase();
  const prev = all[key];
  all[key] = {
    name: name ?? prev?.name ?? null,
    count: (prev?.count ?? 0) + 1,
    lastAt: at,
    summaries: [...(prev?.summaries ?? []), summary].slice(-3),
    moods: [...(prev?.moods ?? []), mood].slice(-5),
  };
  const keys = Object.keys(all);
  if (keys.length > MAX_CUSTOMERS) {
    keys
      .sort((a, b) => all[a].lastAt - all[b].lastAt)
      .slice(0, keys.length - MAX_CUSTOMERS)
      .forEach((k) => delete all[k]);
  }
  write(CUSTOMER_KEY, all);
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

export const clearAllMemory = () => {
  try {
    localStorage.removeItem(CUSTOMER_KEY);
  } catch {
    // Ignore.
  }
};
