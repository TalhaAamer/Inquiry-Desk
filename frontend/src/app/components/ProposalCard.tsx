"use client";

import { useState } from "react";
import type { Proposal } from "../lib/types";

const btn =
  "rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface Props {
  message: string;
  context: { business: string; knowledge: string; language: string; tone: string };
}

function asText(p: Proposal): string {
  return [
    p.title,
    "",
    p.summary,
    "",
    "Scope:",
    ...p.scope.map((s) => `- ${s}`),
    `Timeline: ${p.timeline ?? "To be confirmed"}`,
    `Price: ${p.price ?? "To be confirmed"}`,
    ...(p.assumptions.length
      ? ["", "Assumptions:", ...p.assumptions.map((s) => `- ${s}`)]
      : []),
  ].join("\n");
}

export default function ProposalCard({ message, context }: Props) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  async function build() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, ...context }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof body.detail === "string" ? body.detail : "Could not draft the proposal.",
        );
      }
      setProposal(body as Proposal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not draft the proposal.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 1800);
  }

  return (
    <div className="mb-5 rounded-xl border border-line px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <b className="block text-sm font-semibold">Instant proposal</b>
          <span className="text-xs text-muted">
            Turns this inquiry into a scope, timeline and ready-to-send offer.
          </span>
        </div>
        <button
          type="button"
          onClick={build}
          disabled={loading}
          className={`${btn} border-accent text-accent disabled:opacity-60`}
        >
          {loading ? "Drafting…" : proposal ? "Redraft" : "Draft proposal"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-hot">
          {error}
        </p>
      )}
      {proposal && (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <b className="font-display text-base font-semibold">{proposal.title}</b>
            <p className="text-muted">{proposal.summary}</p>
          </div>
          <div>
            <span className="text-muted">Scope</span>
            <ul className="list-disc pl-5">
              {proposal.scope.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["Timeline", proposal.timeline],
                ["Price", proposal.price],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line px-3 py-2">
                <span className="text-xs text-muted">{label}</span>
                <b className={`block font-semibold ${value ? "" : "text-warn"}`}>
                  {value ?? "Not stated. You need to add it."}
                </b>
              </div>
            ))}
          </div>
          {proposal.assumptions.length > 0 && (
            <div>
              <span className="text-muted">Assumptions</span>
              <ul className="list-disc pl-5">
                {proposal.assumptions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {proposal.open_questions.length > 0 && (
            <div className="rounded-lg border-l-4 border-warn bg-warn/10 px-3 py-2">
              <b className="font-semibold">Confirm before sending</b>
              <ul className="list-disc pl-5">
                {proposal.open_questions.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <span className="text-muted">Proposal email</span>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-bg px-3 py-2.5">
              {proposal.email_body}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btn}
              onClick={() => copy(proposal.email_body, "email")}
            >
              {copied === "email" ? "Copied" : "Copy email"}
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => copy(asText(proposal), "outline")}
            >
              {copied === "outline" ? "Copied" : "Copy outline"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
