"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import {
  PLATFORMS,
  contactLink,
  developerMailto,
  embedSnippet,
  type SiteConn,
  type WidgetOptions,
} from "../lib/integrations";

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btn =
  "rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60";

interface Props {
  site: SiteConn;
  appOrigin: string;
  waiting: number | undefined;
  onChange: (site: SiteConn) => void;
  onDelete: () => void;
}

export default function SiteCard({ site, appOrigin, waiting, onChange, onDelete }: Props) {
  const link = contactLink(site, appOrigin || "https://your-app-address");
  const snippet = embedSnippet(site, appOrigin || "https://your-app-address");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState("");
  const [address, setAddress] = useState(site.origins.join(" "));
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [platform, setPlatform] = useState("wordpress");
  const steps = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  useEffect(() => {
    if (!appOrigin) return;
    let alive = true;
    QRCode.toDataURL(link, { width: 360, margin: 2 })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(""));
    return () => {
      alive = false;
    };
  }, [link, appOrigin]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1800);
  }

  async function saveAddress() {
    setSaving(true);
    setNote(null);
    try {
      const res = await fetch("/api/sites/origins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: site.id, secret: site.secret, origins: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.detail)
            ? data.detail[0].msg
            : (data.detail ?? "Could not save the address."),
        );
      }
      onChange({ ...site, origins: data.origins });
      setAddress(data.origins.join(" "));
      setNote({ ok: true, text: data.origins.length ? "Saved." : "Removed." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not save." });
    } finally {
      setSaving(false);
    }
  }

  function setOption<K extends keyof WidgetOptions>(key: K, value: WidgetOptions[K]) {
    onChange({ ...site, options: { ...site.options, [key]: value } });
  }

  return (
    <div className="mt-3 rounded-xl border border-line p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <b className="block truncate font-semibold">{site.name}</b>
          <span className="text-xs text-muted">
            {waiting !== undefined && waiting >= 0
              ? `${waiting} new message${waiting === 1 ? "" : "s"} waiting`
              : "Messages arrive here"}
          </span>
        </div>
        <button type="button" onClick={onDelete} className={btn}>
          Delete
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-bg p-3">
        <b className="text-sm font-semibold">Your contact page</b>
        <p className="text-xs text-muted">
          Works right away, no website needed. Share this link anywhere
          customers can click: your email signature, Instagram or Facebook bio,
          WhatsApp, or a &ldquo;Contact us&rdquo; button.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            readOnly
            value={link}
            aria-label="Contact page link"
            onFocus={(e) => e.currentTarget.select()}
            className={`${field} min-w-0 flex-1 py-2 text-sm`}
          />
          <button type="button" onClick={() => copy(link, "link")} className={btn}>
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
          <a href={link} target="_blank" rel="noreferrer" className={btn}>
            Open
          </a>
        </div>
        {qr && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`QR code for ${site.name} contact page`}
              className="h-28 w-28 rounded-lg bg-white p-1"
            />
            <div className="text-xs text-muted">
              <p>Print it for your shop, counter, tables or flyers. Customers scan it with their phone camera.</p>
              <a
                href={qr}
                download={`${site.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "contact"}-qr.png`}
                className={`${btn} mt-2 inline-block`}
              >
                Download QR code
              </a>
            </div>
          </div>
        )}
      </div>

      <details className="mt-3 rounded-lg border border-line px-3 py-2.5">
        <summary className="cursor-pointer text-sm font-semibold">
          Add a message button to your own website (optional)
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-muted">
              1. Your website address
              <span className="mt-1 flex gap-2">
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="https://www.yourcompany.com"
                  className={`${field} min-w-0 flex-1 py-2 text-sm font-normal`}
                />
                <button
                  type="button"
                  onClick={saveAddress}
                  disabled={saving}
                  className={btn}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </span>
            </label>
            <p className="mt-1 text-xs text-muted">
              Only your website can use the button. Add the version without www
              too, separated by a space.
            </p>
            {note && (
              <p
                role="status"
                className={`mt-1 text-xs ${note.ok ? "text-ok" : "text-hot"}`}
              >
                {note.text}
              </p>
            )}
          </div>

          {site.origins.length === 0 ? (
            <p className="rounded-lg bg-bg px-3 py-2 text-xs text-muted">
              Save your website address to get the button code.
            </p>
          ) : (
            <>
              <label className="block text-xs font-medium text-muted">
                2. My website is built with
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className={`${field} mt-1 py-2 text-sm font-normal`}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {steps.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <pre className="overflow-x-auto rounded-lg bg-bg px-3 py-2.5 text-xs leading-relaxed">
                {snippet}
              </pre>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(snippet, "code")} className={btn}>
                  {copied === "code" ? "Copied" : "Copy code"}
                </button>
                <a href={developerMailto(site, snippet)} className={btn}>
                  Email this to my web developer
                </a>
                <a
                  href={`/widget-test.html?site=${encodeURIComponent(site.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={btn}
                >
                  Preview the button
                </a>
              </div>

              <details>
                <summary className="cursor-pointer text-xs font-medium text-muted">
                  Customize the button
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs font-medium text-muted">
                    Heading
                    <input
                      value={site.options.title}
                      maxLength={60}
                      onChange={(e) => setOption("title", e.target.value)}
                      className={`${field} mt-1 py-2 text-sm font-normal`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Button text
                    <input
                      value={site.options.button}
                      maxLength={30}
                      onChange={(e) => setOption("button", e.target.value)}
                      className={`${field} mt-1 py-2 text-sm font-normal`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted sm:col-span-2">
                    Greeting
                    <input
                      value={site.options.greeting}
                      maxLength={140}
                      onChange={(e) => setOption("greeting", e.target.value)}
                      className={`${field} mt-1 py-2 text-sm font-normal`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Brand color
                    <input
                      type="color"
                      value={site.options.color}
                      onChange={(e) => setOption("color", e.target.value)}
                      className="mt-1 block h-10 w-full cursor-pointer rounded-xl border border-line bg-card p-1"
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Corner
                    <select
                      value={site.options.position}
                      onChange={(e) =>
                        setOption("position", e.target.value as "left" | "right")
                      }
                      className={`${field} mt-1 py-2 text-sm font-normal`}
                    >
                      <option value="right">Bottom right</option>
                      <option value="left">Bottom left</option>
                    </select>
                  </label>
                </div>
                <p className="mt-1 text-xs text-muted">
                  After changing these, copy the code again.
                </p>
              </details>
            </>
          )}
        </div>
      </details>
    </div>
  );
}
