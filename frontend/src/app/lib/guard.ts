const HOUR = 3_600_000;
// Reply window in hours per urgency level (1 to 5).
const REPLY_HOURS = [0, 168, 72, 24, 4, 1];

export const dueAt = (at: number, urgency: number) =>
  at + (REPLY_HOURS[urgency] ?? 24) * HOUR;

export function formatDue(due: number): string {
  const d = new Date(due);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? `today ${time}`
    : `${d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

function luhn(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (dbl && (n *= 2) > 9) n -= 9;
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export interface Redaction {
  text: string;
  count: number;
  kinds: string[];
}

// Hides card numbers, ID numbers, passwords and API keys before text leaves the browser.
export function redact(input: string): Redaction {
  const kinds = new Set<string>();
  let count = 0;
  const hit = (kind: string, replacement: string) => {
    kinds.add(kind);
    count++;
    return replacement;
  };
  const text = input
    .replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.length >= 13 && digits.length <= 19 && luhn(digits)
        ? hit("card number", "[card number hidden]")
        : m;
    })
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, () => hit("ID number", "[ID number hidden]"))
    .replace(/\b(?:sk|pk|api|key|token)[-_][A-Za-z0-9_-]{16,}\b/gi, () =>
      hit("secret key", "[secret hidden]"),
    )
    .replace(
      /\b(password|passcode|passwd|pwd)\b(\s*(?:is|:|=)\s*)\S+/gi,
      (_m, word: string, sep: string) => hit("password", `${word}${sep}[hidden]`),
    );
  return { text, count, kinds: [...kinds] };
}

const norm = (s: string) => s.toLowerCase().replace(/[\s,]/g, "");

const CLAIMS = [
  /[$€£]\s?\d[\d,]*(?:\.\d+)?/g,
  /\b\d+(?:\.\d+)?\s?%/g,
  /\b\d+\s?(?:business\s)?(?:days?|hours?|weeks?|months?)\b/gi,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s\d{1,2}\b/gi,
];

// Finds prices, percentages, durations and dates in the reply that appear nowhere in the source text.
export function replyWarnings(reply: string, source: string): string[] {
  const src = norm(source);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const re of CLAIMS) {
    for (const m of reply.match(re) ?? []) {
      const key = norm(m);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!src.includes(key)) out.push(m.trim());
    }
  }
  return out;
}

export interface Signal {
  quote: string;
  why: string;
}

export interface Segment {
  text: string;
  note?: number;
}

export function parseSignals(signals: string[] = []): Signal[] {
  return signals
    .map((s) => {
      const [quote, ...rest] = s.split("||");
      return {
        quote: quote.trim().replace(/^["“'‘]+|["”'’]+$/g, ""),
        why: rest.join("||").trim(),
      };
    })
    .filter((s) => s.quote.length > 1);
}

// Marks where each quoted clue appears in the message; clues not found verbatim are left out.
export function highlight(message: string, signals: Signal[]): Segment[] {
  const lower = message.toLowerCase();
  const ranges = signals
    .map((s, note) => {
      const start = lower.indexOf(s.quote.toLowerCase());
      return { start, end: start + s.quote.length, note };
    })
    .filter((r) => r.start >= 0)
    .sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.start < pos) continue;
    if (r.start > pos) out.push({ text: message.slice(pos, r.start) });
    out.push({ text: message.slice(r.start, r.end), note: r.note });
    pos = r.end;
  }
  if (pos < message.length) out.push({ text: message.slice(pos) });
  return out;
}

// Splits pasted text on lines made of --- or === into separate customer messages.
export function splitInbox(text: string): string[] {
  return text
    .split(/^\s*(?:-{3,}|={3,})\s*$/m)
    .map((p) => p.trim())
    .filter((p) => p.length >= 10);
}
