"use client";

import { useState } from "react";
import type { Gap, HistoryItem } from "../lib/types";

const btn =
  "rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface Props {
  items: HistoryItem[];
  knowledge: string;
  onAdd: (label: string) => void;
}

export default function KnowledgeGaps({ items, knowledge, onAdd }: Props) {
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<string[]>([]);

  const questions = items
    .filter((i) => (i.status ?? "new") !== "resolved")
    .flatMap((i) => i.result.missing_info)
    .filter((q) => q.trim().length > 3)
    .slice(0, 80);

  async function scan() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, knowledge }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof body.detail === "string" ? body.detail : "Could not scan.",
        );
      }
      setGaps(body.gaps as Gap[]);
      setAdded([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not scan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-4 rounded-[20px] border border-line bg-card p-4 shadow-sm sm:mt-6 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Knowledge gaps
          </h2>
          <p className="text-sm text-muted">
            Finds what customers keep asking that your business facts cannot
            answer yet.
          </p>
        </div>
        <button
          type="button"
          onClick={scan}
          disabled={loading || questions.length === 0}
          className={`${btn} border-accent text-accent disabled:opacity-60`}
        >
          {loading
            ? "Scanning…"
            : questions.length === 0
              ? "No open questions yet"
              : `Scan ${questions.length} open question${questions.length > 1 ? "s" : ""}`}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-hot">
          {error}
        </p>
      )}
      {gaps && gaps.length === 0 && (
        <p className="mt-3 text-sm text-ok">
          No gaps found. Your business facts cover the questions so far.
        </p>
      )}
      {gaps && gaps.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {gaps.map((g) => (
            <li
              key={g.topic}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warn/15 text-sm font-bold text-warn">
                {g.count}
              </span>
              <span className="min-w-0 basis-[55%] flex-1">
                <b className="block font-semibold">{g.topic}</b>
                <span className="text-xs text-muted">
                  e.g. &ldquo;{g.example}&rdquo;
                </span>
              </span>
              <button
                type="button"
                disabled={added.includes(g.topic)}
                onClick={() => {
                  onAdd(g.fact_label);
                  setAdded((a) => [...a, g.topic]);
                }}
                className={`${btn} disabled:opacity-60`}
              >
                {added.includes(g.topic) ? "Added to facts" : "Add to facts"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
