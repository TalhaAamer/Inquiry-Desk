"use client";

import { useEffect, useState } from "react";
import { Category, Sentiment, Team, Triage } from "../lib/types";

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

export default function ResultCard({ data }: { data: Triage }) {
  const [reply, setReply] = useState(data.reply_draft);
  const [filled, setFilled] = useState(0); 
  const [toast, setToast] = useState(""); 

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

      <div className={`mb-5 rounded-xl border-l-4 px-3.5 py-3 ${review}`}>
        <b className="block font-semibold">
          {data.needs_review
            ? "Needs a human check"
            : "Ready to send after a quick read"}
        </b>
        {data.needs_review && data.review_reason && <p>{data.review_reason}</p>}
        <p className="text-sm text-muted">
          Suggested reply time: {DEADLINE[data.urgency]}
        </p>
      </div>

      <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 rounded-xl border border-line px-3 py-2.5"
          >
            <span className="text-sm text-muted">{label}</span>
            <b className="block break-words font-semibold">{value ?? "—"}</b>
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

      {data.image_notes && (
        <div className="mb-5 rounded-xl border border-line px-3 py-2.5">
          <span className="text-sm text-muted">What the screenshots show</span>
          <p>{data.image_notes}</p>
        </div>
      )}

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor="reply" className="text-sm font-medium text-muted">
          Draft reply
        </label>
        <div className="flex gap-2">
          <button onClick={() => copy(reply, "Reply copied")} className={btn}>
            Copy reply
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
        className="min-h-44 w-full resize-y rounded-xl border border-line bg-transparent p-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      />

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
