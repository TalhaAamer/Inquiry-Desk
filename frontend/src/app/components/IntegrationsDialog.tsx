"use client";

import { useEffect, useState, type RefObject } from "react";
import SiteCard from "./SiteCard";
import {
  DEFAULT_OPTIONS,
  alertPayload,
  type AlertSettings,
  type SiteConn,
} from "../lib/integrations";
import type { Triage } from "../lib/types";

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btn =
  "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  sites: SiteConn[];
  onSites: (next: SiteConn[]) => void;
  alerts: AlertSettings;
  onAlerts: (next: AlertSettings) => void;
}

const SAMPLE: Triage = {
  category: "support",
  urgency: 5,
  sentiment: "frustrated",
  team: "support",
  sender_name: "Test Customer",
  sender_email: "test@example.com",
  budget: null,
  summary: "This is a test alert from Inquiry Desk.",
  next_step: "Nothing to do. Your webhook is connected.",
  missing_info: [],
  image_notes: null,
  needs_review: false,
  review_reason: null,
  reply_draft: "",
};

export default function IntegrationsDialog({
  dialogRef,
  sites,
  onSites,
  alerts,
  onAlerts,
}: Props) {
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState<Record<string, number>>({});
  const [testNote, setTestNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOrigin(window.location.origin), 0);
    return () => clearTimeout(t);
  }, []);

  async function refreshCounts() {
    const entries = await Promise.all(
      sites.map(async (s) => {
        try {
          const res = await fetch("/api/sites/count", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id, secret: s.secret }),
          });
          const data = await res.json();
          return [s.id, res.ok ? (data.waiting as number) : -1] as const;
        } catch {
          return [s.id, -1] as const;
        }
      }),
    );
    setWaiting(Object.fromEntries(entries));
  }

  // Refresh the waiting counts whenever the dialog is opened.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    const obs = new MutationObserver(() => {
      if (d.open) refreshCounts();
    });
    obs.observe(d, { attributes: true, attributeFilter: ["open"] });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogRef, sites]);

  async function create() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.detail)
            ? data.detail[0].msg
            : (data.detail ?? "Could not create the contact page."),
        );
      }
      onSites([
        ...sites,
        {
          id: data.id,
          secret: data.secret,
          name: name.trim(),
          origins: data.origins,
          options: { ...DEFAULT_OPTIONS },
        },
      ]);
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the contact page.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: SiteConn) {
    if (
      !confirm(
        `Delete "${s.name}"? Its contact page and button stop working and waiting messages are deleted.`,
      )
    )
      return;
    try {
      await fetch("/api/sites/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, secret: s.secret }),
      });
    } finally {
      onSites(sites.filter((x) => x.id !== s.id));
    }
  }

  async function testAlert() {
    setTesting(true);
    setTestNote(null);
    try {
      const p = alertPayload(SAMPLE);
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: alerts.url.trim(), ...p }),
      });
      const data = await res.json();
      setTestNote(
        res.ok
          ? { ok: true, text: "Sent. Check your channel." }
          : { ok: false, text: typeof data.detail === "string" ? data.detail : "Could not send." },
      );
    } catch {
      setTestNote({ ok: false, text: "Could not reach the server." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[min(680px,94vw)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/50"
    >
      <div className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Contact page and alerts</h2>
            <p className="mt-1 text-sm text-muted">
              Let customers contact you from a link or your website, and get
              alerts in your team chat.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        <h3 className="mt-5 font-semibold">1. Customer contact page</h3>
        <p className="text-sm text-muted">
          Create a contact page for your business in one click. Customers write
          a message there and it arrives here, ready to triage like any other
          message. You do not need a website or any code.
        </p>

        {sites.map((s) => (
          <SiteCard
            key={s.id}
            site={s}
            appOrigin={origin}
            waiting={waiting[s.id]}
            onChange={(next) => onSites(sites.map((x) => (x.id === next.id ? next : x)))}
            onDelete={() => remove(s)}
          />
        ))}

        <form
          className="mt-3 rounded-xl border border-dashed border-line p-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <b className="text-sm font-semibold">
            {sites.length ? "Add another contact page" : "Create your contact page"}
          </b>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your business name, e.g. Cheezious"
              aria-label="Business name"
              maxLength={80}
              className={`${field} min-w-0 flex-1`}
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-accent disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-hot">
              {error}
            </p>
          )}
        </form>
        <p className="mt-2 text-xs text-muted">
          Keep this browser&apos;s data: the private key that lets you read the
          messages is stored here. Fetch new messages from the main screen.
        </p>

        <h3 className="mt-6 font-semibold">2. Alerts to Slack, Teams or Discord</h3>
        <p className="text-sm text-muted">
          Get a message in your team chat when an urgent inquiry arrives. Paste
          an incoming-webhook address from Slack, Microsoft Teams, Discord, or
          a tool like Zapier or Make.
        </p>
        <label className="mt-3 block text-sm font-medium text-muted">
          Webhook address
          <input
            value={alerts.url}
            onChange={(e) => onAlerts({ ...alerts, url: e.target.value })}
            placeholder="https://hooks.slack.com/services/…"
            autoComplete="off"
            className={`${field} mt-1.5 font-normal`}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={alerts.enabled}
              onChange={(e) => onAlerts({ ...alerts, enabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Send alerts
          </label>
          <label className="flex items-center gap-2">
            Urgency at least
            <select
              value={alerts.minUrgency}
              onChange={(e) =>
                onAlerts({ ...alerts, minUrgency: Number(e.target.value) })
              }
              className={`${field} w-auto py-1.5`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} of 5
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={alerts.onReview}
              onChange={(e) => onAlerts({ ...alerts, onReview: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Also when a human check is needed
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={testAlert}
            disabled={testing || !alerts.url.trim()}
            className={btn}
          >
            {testing ? "Sending…" : "Send a test alert"}
          </button>
          {testNote && (
            <span
              role="status"
              className={`text-sm ${testNote.ok ? "text-ok" : "text-hot"}`}
            >
              {testNote.text}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          Only https addresses are accepted. The alert has the summary, urgency,
          sender and next step, never the full message.
        </p>

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="mt-6 w-full rounded-xl bg-accent py-3 font-semibold text-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Done
        </button>
      </div>
    </dialog>
  );
}
