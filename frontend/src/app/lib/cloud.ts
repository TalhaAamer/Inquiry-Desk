import { deleteDoc, doc, setDoc, type DocumentData } from "firebase/firestore";
import { db } from "./firebase";

type Listener = (state: SaveState) => void;
export type SaveState = "saved" | "saving" | "error";

let uid: string | null = null;
let pending = 0;
let failed = false;
let current: SaveState = "saved";
const listeners = new Set<Listener>();
const timers = new Map<string, { t: ReturnType<typeof setTimeout>; run: () => Promise<unknown> }>();

function publish() {
  current = failed ? "error" : pending > 0 ? "saving" : "saved";
  listeners.forEach((l) => l(current));
}

export function setUid(next: string | null) {
  uid = next;
  failed = false;
  timers.forEach((e) => clearTimeout(e.t));
  timers.clear();
  publish();
}

export const getUid = () => uid;

export function subscribeSave(l: Listener): () => void {
  listeners.add(l);
  l(current);
  return () => {
    listeners.delete(l);
  };
}

// Tracks a write so the page can show "Saving…" or a warning if it failed.
export async function track<T>(job: Promise<T>): Promise<T | undefined> {
  pending += 1;
  publish();
  try {
    const out = await job;
    failed = false;
    return out;
  } catch (e) {
    console.warn("Could not save to your account", e);
    failed = true;
    return undefined;
  } finally {
    pending -= 1;
    publish();
  }
}

// Waits for typing to pause before saving, and only the newest value is written.
export function later(key: string, ms: number, run: () => Promise<unknown>) {
  const old = timers.get(key);
  if (old) clearTimeout(old.t);
  const t = setTimeout(() => {
    timers.delete(key);
    void track(run());
  }, ms);
  timers.set(key, { t, run });
}

// Saves anything still waiting, for example right before signing out.
export async function flushAll() {
  const waiting = [...timers.values()];
  timers.forEach((e) => clearTimeout(e.t));
  timers.clear();
  await Promise.all(waiting.map((e) => track(e.run())));
}

export function userDoc(...path: string[]) {
  if (!uid) throw new Error("Not signed in");
  return doc(db, "users", uid, ...(path as [string, ...string[]]));
}

export const put = (ref: ReturnType<typeof userDoc>, data: DocumentData) =>
  setDoc(ref, { ...data, updatedAt: Date.now() });

export const remove = (ref: ReturnType<typeof userDoc>) => deleteDoc(ref);
