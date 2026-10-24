"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/auth";
import { dueAt, formatDue, highlight, parseSignals, replyWarnings } from "../lib/guard";
import { isRepeatTrouble } from "../lib/memory";
import { canSpeak, speak, speechLang, stopSpeaking } from "../lib/voice";
import { Category, PriorContact, Sentiment, Simulation, Team, Triage } from "../lib/types";
import ProposalCard from "./ProposalCard";

const FEELING: Record<Simulation["feeling"], string> = {
  relieved: "😌",
  satisfied: "🙂",
  neutral: "😐",
  confused: "😕",
  annoyed: "😒",
  angry: "😠",
};

const CATEGORY: Record<Category, string> = {
  new_project: "New project",
  support: "Support request",
  bug_report: "Bug report",
  billing: "Billing",
  partnership: "Partnership",
  spam: "Likely spam",
};
const SENTIMENT: Record<Sentiment, string> = {
  positive: "bg-ok/15 text-ok",
  neutral: "bg-line text-muted",
  frustrated: "bg-warn/15 text-warn",
  angry: "bg-hot/15 text-hot",
};
const TEAM: Record<Team, string> = {
  sales: "Sales",
  support: "Support",
  billing: "Billing",
  management: "Management",
};
const LEVEL = ["", "Can wait", "Low", "Normal", "High", "Reply today"];
const DEADLINE = [
  "",
  "when you have time",
  "within 3 days",
  "within 1 business day",
  "within 4 hours",
  "within 1 hour",
];
const btn =
  "rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const REWRITES = [
  "Make it shorter",
  "Make it more formal",
  "Make it friendlier",
  "Add a clear call to action",
];

interface Props {
  data: Triage;
  context: { business: string; knowledge: string; language: string; tone: string };
  customerMessage: string;
  receivedAt: number;
  prior?: PriorContact;
  canSend?: boolean;
  onSend?: (reply: string) => Promise<string>;
  onLearn?: (original: string, edited: string) => void;
  onReplyChange?: (reply: string) => void;
}

const VARIANTS = [
  ["Short and direct", "Rewrite as short and direct, under 50 words"],
  ["Warm", "Rewrite in a warm, friendly and personal tone"],
  ["Formal", "Rewrite in a formal and professional tone"],
] as const;

const ordinal = (n: number) =>
  `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`;

export default function ResultCard({
  data,
  context,
  customerMessage,
  receivedAt,
  prior,
  canSend,
  onSend,
  onLearn,
  onReplyChange,
}: Props) {
  const [reply, setReplyState] = useState(data.reply_draft);
  const setReply = (r: string) => {
    setReplyState(r);
    onReplyChange?.(r);
  };
  const [speaking, setSpeaking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const learn = () => onLearn?.(data.reply_draft, reply);

  useEffect(() => () => stopSpeaking(), []);

  async function sendEmail() {
    if (!onSend || !data.sender_email) return;
    if (!confirm(`Send this reply to ${data.sender_email} now?`)) return;
    setSending(true);
    setSendMsg(null);
    const err = await onSend(reply);
    setSending(false);
    if (err) setSendMsg({ ok: false, text: err });
    else {
      learn();
      setSendMsg({ ok: true, text: `Sent to ${data.sender_email}` });
    }
  }
  const [variants, setVariants] = useState<{ label: string; text: string }[] | null>(null);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const warnings = replyWarnings(
    reply,
    `${context.knowledge}\n${customerMessage}`,
  );
  const xray = parseSignals(data.signals).filter(
    (s) =>
      !customerMessage ||
      customerMessage.toLowerCase().includes(s.quote.toLowerCase()),
  );
  const segments = highlight(customerMessage, xray);
  const [sim, setSim] = useState<{ result: Simulation; reply: string } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError] = useState("");

  async function simulate() {
    setSimulating(true);
    setSimError("");
    try {
      const sent = reply;
      const res = await apiFetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customerMessage || data.summary,
          reply: sent,
          business: context.business,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof body.detail === "string" ? body.detail : "Could not simulate.",
        );
      }
      setSim({ result: body as Simulation, reply: sent });
    } catch (e) {
      setSimError(e instanceof Error ? e.message : "Could not simulate.");
    } finally {
      setSimulating(false);
    }
  }

  async function compare() {
    setLoadingVariants(true);
    setRewriteError("");
    try {
      const out = await Promise.all(
        VARIANTS.map(async ([label, instruction]) => {
          const res = await apiFetch("/api/refine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reply, instruction, ...context }),
          });
          const body = await res.json();
          if (!res.ok) throw new Error("Could not build the versions.");
          return { label, text: body.reply_draft as string };
        }),
      );
      setVariants(out);
    } catch (e) {
      setRewriteError(e instanceof Error ? e.message : "Could not build the versions.");
    } finally {
      setLoadingVariants(false);
    }
  }
  const [filled, setFilled] = useState(0); 
  const [toast, setToast] = useState(""); 
  const [custom, setCustom] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  async function rewrite(instruction: string) {
    if (instruction.trim().length < 3 || !reply.trim()) return;
    setRewriting(true);
    setRewriteError("");
    try {
      const res = await apiFetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply, instruction, ...context }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof body.detail === "string" ? body.detail : "Could not rewrite.",
        );
      }
      setReply(body.reply_draft);
      setCustom("");
    } catch (e) {
      setRewriteError(e instanceof Error ? e.message : "Could not rewrite.");
    } finally {
      setRewriting(false);
    }
  }

  const mailto = data.sender_email
    ? `mailto:${encodeURIComponent(data.sender_email)}?subject=${encodeURIComponent(
        `Re: ${data.summary}`.slice(0, 120),
      )}&body=${encodeURIComponent(reply)}`
    : null;

  const handoff = [
    `${CATEGORY[data.category]} · ${LEVEL[data.urgency]} · ${TEAM[data.team]}`,
    data.summary,
    `From: ${[data.sender_name, data.sender_email].filter(Boolean).join(" ") || "unknown"}`,
    data.budget ? `Budget: ${data.budget}` : "",
    `Next step: ${data.next_step}`,
    data.needs_review && data.review_reason
      ? `Needs review: ${data.review_reason}`
      : "",
    data.missing_info.length
      ? `Ask the customer:\n${data.missing_info.map((q) => `- ${q}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  useEffect(() => {
    const t = setTimeout(() => setFilled(data.urgency), 60);
    return () => clearTimeout(t);
  }, [data.urgency]);

  const tone =
    data.urgency <= 2 ? "bg-ok" : data.urgency === 3 ? "bg-warn" : "bg-hot";

  // Copies text, then shows a message for 1.8 seconds.
  async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  }

  const review = data.needs_review
    ? "border-warn bg-warn/10"
    : "border-ok bg-ok/10";

  const facts = [
    ["Name", data.sender_name],
    ["Email", data.sender_email],
    ["Budget", data.budget],
    ["Send to", TEAM[data.team]],
  ] as const;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-accent/15 px-3.5 py-1 text-accent">
            {CATEGORY[data.category] ?? data.category}
          </span>
          <span
            className={`rounded-full px-3.5 py-1 capitalize ${SENTIMENT[data.sentiment]}`}
          >
            {data.sentiment}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{ transitionDelay: `${i * 80}ms` }}
                className={`h-2.5 w-6 rounded-[3px] transition-colors duration-300 motion-reduce:transition-none ${
                  i < filled ? tone : "bg-line"
                }`}
              />
            ))}
          </div>
          {LEVEL[data.urgency]}
        </div>
      </div>

      <p className="mb-1 mt-5 font-display text-xl font-semibold leading-snug">
        {data.summary}
      </p>
      <p className="mb-3 text-muted">Next step: {data.next_step}</p>

      {prior && (
        <div
          className={`mb-4 rounded-xl border-l-4 px-3.5 py-2.5 text-sm ${
            isRepeatTrouble(prior)
              ? "border-hot bg-hot/10"
              : "border-accent bg-accent/10"
          }`}
        >
          <b className="font-semibold">
            Returning customer: this is their {ordinal(prior.count + 1)} inquiry
          </b>
          <p className="text-muted">
            Last contact {new Date(prior.lastAt).toLocaleDateString()}:{" "}
            {prior.summaries[prior.summaries.length - 1]}
          </p>
          <p className="text-muted">
            Earlier mood: {prior.moods.join(" → ")}
            {isRepeatTrouble(prior) &&
              ". They were unhappy before, so reply personally."}
          </p>
        </div>
      )}

      <div className={`mb-5 rounded-xl border-l-4 px-3.5 py-3 ${review}`}>
        <b className="block font-semibold">
          {data.needs_review
            ? "Needs a human check"
            : "Ready to send after a quick read"}
        </b>
        {data.needs_review && data.review_reason && <p>{data.review_reason}</p>}
        <p className="text-sm text-muted">
          Reply by {formatDue(dueAt(receivedAt, data.urgency))} (
          {DEADLINE[data.urgency]})
        </p>
      </div>

      <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-line px-3 py-2.5"
          >
            <span className="text-sm text-muted">{label}</span>
            <b className="block font-semibold wrap-break-word">{value ?? "—"}</b>
          </div>
        ))}
      </div>

      {data.missing_info.length > 0 && (
        <div className="mb-5">
          <p className="mb-1.5 text-sm font-medium text-muted">
            Ask the customer
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {data.missing_info.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {xray.length > 0 && (
        <details open className="mb-5 rounded-xl border border-line px-3.5 py-3">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            Message X-ray: why the AI scored it this way
          </summary>
          {segments.some((s) => s.note !== undefined) && (
            <p className="mt-2.5 whitespace-pre-wrap rounded-lg bg-bg px-3 py-2.5 text-sm leading-relaxed">
              {segments.map((s, i) =>
                s.note === undefined ? (
                  <span key={i}>{s.text}</span>
                ) : (
                  <mark
                    key={i}
                    title={xray[s.note].why}
                    className="rounded bg-warn/30 px-0.5 text-ink"
                  >
                    {s.text}
                    <sup className="ml-0.5 font-bold">{s.note + 1}</sup>
                  </mark>
                ),
              )}
            </p>
          )}
          <ol className="mt-2.5 space-y-1 text-sm">
            {xray.map((s, i) => (
              <li key={i} className="flex gap-2">
                <b className="w-4 shrink-0 text-warn">{i + 1}</b>
                <span>
                  <i>&ldquo;{s.quote}&rdquo;</i>
                  {s.why && <span className="text-muted"> — {s.why}</span>}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}

      {data.image_notes && (
        <div className="mb-5 rounded-xl border border-line px-3 py-2.5">
          <span className="text-sm text-muted">What the screenshots show</span>
          <p>{data.image_notes}</p>
        </div>
      )}

      {(data.category === "new_project" || data.category === "partnership") &&
        customerMessage.trim().length >= 10 && (
          <ProposalCard message={customerMessage} context={context} />
        )}

      <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="reply" className="whitespace-nowrap text-sm font-medium text-muted">
          Draft reply
        </label>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            onClick={() => {
              learn();
              copy(reply, "Reply copied");
            }}
            className={btn}
          >
            Copy reply
          </button>
          {canSpeak() && (
            <button
              type="button"
              onClick={() => {
                if (speaking) {
                  stopSpeaking();
                  setSpeaking(false);
                } else {
                  speak(reply, speechLang(context.language));
                  setSpeaking(true);
                  const poll = setInterval(() => {
                    if (!window.speechSynthesis.speaking) {
                      setSpeaking(false);
                      clearInterval(poll);
                    }
                  }, 400);
                }
              }}
              className={btn}
            >
              {speaking ? "Stop" : "Read aloud"}
            </button>
          )}
          <button
            onClick={() => copy(handoff, "Team note copied")}
            className={btn}
          >
            Copy team note
          </button>
          <button
            onClick={() => copy(JSON.stringify(data, null, 2), "JSON copied")}
            className={btn}
          >
            Copy JSON
          </button>
        </div>
      </div>
      <textarea
        id="reply"
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        disabled={rewriting}
        className="min-h-44 w-full resize-y rounded-xl border border-line bg-transparent p-3.5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />

      <div
        className={`mt-2 rounded-xl border-l-4 px-3.5 py-2.5 text-sm ${
          warnings.length ? "border-warn bg-warn/10" : "border-ok bg-ok/10"
        }`}
      >
        <b className="font-semibold">Reply guard: </b>
        {warnings.length ? (
          <>
            check these before sending. They are not in your business facts or
            the customer&apos;s message:{" "}
            <b className="font-semibold">{warnings.join(", ")}</b>
          </>
        ) : (
          "every price, date and time in this reply comes from your facts or the customer."
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <b className="block text-sm font-semibold">
              Customer reaction simulator
            </b>
            <span className="text-xs text-muted">
              The AI reads your reply as the customer and predicts how it lands.
            </span>
          </div>
          <button
            type="button"
            onClick={simulate}
            disabled={simulating || !reply.trim()}
            className={`${btn} border-accent text-accent disabled:opacity-60`}
          >
            {simulating
              ? "Reading as the customer…"
              : sim
                ? "Run again"
                : "Simulate reaction"}
          </button>
        </div>
        {simError && (
          <p role="alert" className="mt-2 text-sm text-hot">
            {simError}
          </p>
        )}
        {sim && (
          <div className="mt-3 space-y-2.5 text-sm">
            {sim.reply !== reply && (
              <p className="text-xs text-warn">
                You edited the reply since this ran. Run it again to refresh.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-accent/15 px-3 py-1 font-semibold capitalize text-accent">
                {FEELING[sim.result.feeling]} {sim.result.feeling}
              </span>
              <span className="flex items-center gap-2">
                Escalation risk
                <span className="flex gap-1" aria-label={`${sim.result.escalation_risk} of 5`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={`h-2 w-5 rounded-[3px] ${
                        i <= sim.result.escalation_risk
                          ? sim.result.escalation_risk <= 2
                            ? "bg-ok"
                            : sim.result.escalation_risk === 3
                              ? "bg-warn"
                              : "bg-hot"
                          : "bg-line"
                      }`}
                    />
                  ))}
                </span>
              </span>
            </div>
            <p className="border-l-2 border-line pl-3 italic">
              &ldquo;{sim.result.first_reaction}&rdquo;
            </p>
            {sim.result.confusing_parts.length > 0 && (
              <div>
                <span className="text-muted">May confuse them:</span>
                <ul className="list-disc pl-5">
                  {sim.result.confusing_parts.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2">
              <span>
                <b className="font-semibold">Suggested fix:</b> {sim.result.fix}
              </span>
              <button
                type="button"
                disabled={rewriting}
                onClick={() => rewrite(sim.result.fix)}
                className={`${btn} disabled:opacity-60`}
              >
                Apply fix
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Rewrite:</span>
        {REWRITES.map((r) => (
          <button
            key={r}
            type="button"
            disabled={rewriting}
            onClick={() => rewrite(r)}
            className={`${btn} disabled:opacity-60`}
          >
            {r}
          </button>
        ))}
        <button
          type="button"
          disabled={rewriting || loadingVariants}
          onClick={compare}
          className={`${btn} border-accent text-accent disabled:opacity-60`}
        >
          {loadingVariants ? "Writing 3 versions…" : "Compare 3 versions"}
        </button>
      </div>
      {variants && (
        <div className="mt-3 grid gap-2.5 md:grid-cols-3">
          {variants.map((v) => (
            <div
              key={v.label}
              className="flex flex-col rounded-xl border border-line p-3"
            >
              <b className="mb-1 text-sm font-semibold">{v.label}</b>
              <p className="mb-2 flex-1 whitespace-pre-wrap text-sm text-muted">
                {v.text}
              </p>
              <button
                type="button"
                onClick={() => {
                  setReply(v.text);
                  setVariants(null);
                }}
                className={btn}
              >
                Use this
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setVariants(null)}
            className="text-left text-sm text-muted underline md:col-span-3"
          >
            Close comparison
          </button>
        </div>
      )}
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          rewrite(custom);
        }}
      >
        <input
          aria-label="Custom rewrite instruction"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={300}
          placeholder="Or tell the AI what to change"
          className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-3.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={rewriting || custom.trim().length < 3}
          className={`${btn} disabled:opacity-60`}
        >
          {rewriting ? "Rewriting…" : "Apply"}
        </button>
      </form>
      {rewriteError && (
        <p role="alert" className="mt-2 text-sm text-hot">
          {rewriteError}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mailto ? (
          <a
            href={mailto}
            onClick={learn}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open in email app
          </a>
        ) : (
          <span className="text-sm text-muted">
            No sender email found, so email can&apos;t be pre-filled.
          </span>
        )}
        {canSend && data.sender_email && (
          <button
            type="button"
            onClick={sendEmail}
            disabled={sending || !reply.trim() || sendMsg?.ok === true}
            className="rounded-lg border border-accent px-3.5 py-2 text-sm font-semibold text-accent disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {sending ? "Sending…" : sendMsg?.ok ? "Sent" : "Send from my email"}
          </button>
        )}
        {sendMsg && (
          <span
            role="status"
            className={`text-sm ${sendMsg.ok ? "text-ok" : "text-hot"}`}
          >
            {sendMsg.text}
          </span>
        )}
      </div>

      <div
        role="status"
        className={`pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-bg transition duration-300 ${
          toast ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        {toast || "Copied"}
      </div>
    </>
  );
}
