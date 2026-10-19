"use client";

import { useEffect, useMemo, useState } from "react";
import type { HistoryItem, Status } from "../lib/types";
import { download, toCsv } from "../lib/history";
import { dueAt, formatDue } from "../lib/guard";

const btn =
  "rounded-lg border border-line px-3 py-1 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const STATUSES: Status[] = ["new", "replied", "resolved"];
const label = (s: string) => s[0].toUpperCase() + s.slice(1);
const field =
  "rounded-xl border border-line bg-transparent px-3.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface Props {
  items: HistoryItem[];
  onOpen: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onStatus: (id: string, status: Status) => void;
}

export default function History({
  items,
  onOpen,
  onDelete,
  onClear,
  onStatus,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [now, setNow] = useState(0);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const overdue = (i: HistoryItem) =>
    now > 0 &&
    (i.status ?? "new") === "new" &&
    now > dueAt(i.at, i.result.urgency);
  const overdueCount = items.filter(overdue).length;

  const stats = useMemo(() => {
    const open = items.filter((i) => (i.status ?? "new") !== "resolved");
    return {
      total: items.length,
      open: open.length,
      urgent: open.filter((i) => i.result.urgency >= 4).length,
    };
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((i) => filter === "all" || (i.status ?? "new") === filter)
      .filter(
        (i) =>
          !q ||
          [
            i.result.summary,
            i.result.sender_name,
            i.result.sender_email,
            i.result.category,
            i.message,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => b.result.urgency - a.result.urgency || b.at - a.at);
  }, [items, query, filter]);

  if (items.length === 0) return null;

  return (
    <section className="mt-4 rounded-[20px] border border-line bg-card p-4 shadow-sm sm:mt-6 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Recent inquiries</h2>
          <p className="text-sm text-muted">
            Saved in this browser only. Most urgent first.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={btn}
            onClick={() =>
              download(
                `inquiries-${new Date().toISOString().slice(0, 10)}.csv`,
                toCsv(shown),
                "text/csv;charset=utf-8",
              )
            }
          >
            Export CSV
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => confirm("Delete all saved inquiries?") && onClear()}
          >
            Clear all
          </button>
        </div>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(
          [
            ["Total", stats.total],
            ["Open", stats.open],
            ["Urgent (open)", stats.urgent],
            ["Overdue", overdueCount],
          ] as const
        ).map(([name, n]) => (
          <div key={name} className="rounded-xl border border-line px-3 py-2.5">
            <dt className="text-xs text-muted">{name}</dt>
            <dd className="text-xl font-semibold">{n}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-2 flex flex-wrap gap-2">
        <input
          type="search"
          aria-label="Search inquiries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or text"
          className={`${field} min-w-0 flex-1`}
        />
        <select
          aria-label="Filter by status"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Status | "all")}
          className={field}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </div>

      {shown.length === 0 && (
        <p className="py-4 text-sm text-muted">No inquiries match.</p>
      )}
      <ul className="divide-y divide-line">
        {shown.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span
              aria-hidden
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                it.result.urgency >= 4
                  ? "bg-hot/15 text-hot"
                  : it.result.urgency === 3
                    ? "bg-warn/15 text-warn"
                    : "bg-ok/15 text-ok"
              }`}
            >
              {it.result.urgency}
            </span>
            <button
              type="button"
              onClick={() => onOpen(it)}
              className="min-w-0 basis-[55%] flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <b
                className={`block truncate font-semibold ${
                  it.status === "resolved" ? "text-muted line-through" : ""
                }`}
              >
                {it.result.summary}
              </b>
              <span className="text-xs text-muted">
                {it.result.sender_name ?? "Unknown sender"} ·{" "}
                {new Date(it.at).toLocaleString()}
                {it.result.needs_review && " · needs review"}
                {overdue(it) && (
                  <b className="text-hot"> · Overdue since {formatDue(dueAt(it.at, it.result.urgency))}</b>
                )}
              </span>
            </button>
            <select
              aria-label={`Status: ${it.result.summary}`}
              value={it.status ?? "new"}
              onChange={(e) => onStatus(it.id, e.target.value as Status)}
              className={`${field} py-1`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={`Delete: ${it.result.summary}`}
              onClick={() => onDelete(it.id)}
              className="rounded-lg px-2 py-1 text-muted hover:text-hot focus-visible:outline-2 focus-visible:outline-accent"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
