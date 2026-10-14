"use client";

import { useRef, useState } from "react";
import ResultCard from "./components/ResultCard";
import type { Img, Triage } from "./lib/types";

const SAMPLES: Record<string, string> = {
  "Website quote":
    "Hi, I'm Sara from Lumen Bakery (sara@lumenbakery.com). We need a new website with online ordering before the holidays. Budget is around $4,000. Could you send a quote this week?",
  "Broken checkout":
    "URGENT: our checkout page has shown a white screen since this morning and we're losing orders. Please call me ASAP. Ahmed, ahmed@shopnest.com",
  "Invoice question":
    "Hello, invoice #204 shows $450 but we agreed on $400. Could you check and send a corrected one? Thanks, Bilal",
};
const MAX_IMAGES = 3;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PREVIEW = [
  ["Category and urgency", "What it is, and how fast to reply"],
  ["Sentiment and team", "How the customer feels, and who should handle it"],
  ["Questions to ask", "What is missing before your team can act"],
  ["Screenshot notes", "What the images show"],
  ["Draft reply", "In your tone and language, ready to edit"],
];
const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const card = "rounded-[20px] border border-line bg-card p-6 shadow-sm";

async function shrink(file: File): Promise<Img> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

  const type =
    file.type === "image/jpeg" || file.type === "image/webp"
      ? file.type
      : "image/png";
  let url = canvas.toDataURL(type, 0.85);
  if (url.length > 3_000_000) url = canvas.toDataURL("image/jpeg", 0.8);
  const media_type = url.slice(5, url.indexOf(";")) as Img["media_type"];
  return { name: file.name, preview: url, data: url.split(",")[1], media_type };
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<Img[]>([]);
  const [business, setBusiness] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("same as the customer");

  const [mode, setMode] = useState<"human" | "auto">("human");
  const [result, setResult] = useState<Triage | null>(null);
  const [run, setRun] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDialogElement>(null);

  async function addFiles(files: File[]) {
    const valid = files.filter((f) => ACCEPTED.includes(f.type));
    if (files.length && !valid.length) {
      setError("Use PNG, JPG, WebP or GIF images.");
      return;
    }
    const pics = valid.slice(0, MAX_IMAGES - images.length);
    if (!pics.length) return;
    try {
      const done = await Promise.all(pics.map(shrink));
      setImages((cur) => [...cur, ...done].slice(0, MAX_IMAGES));
    } catch {
      setError("Could not read that image. Try a PNG or JPG.");
    }
  }

  async function triage() {
    setError("");
    if (message.trim().length < 10 && images.length === 0) {
      setError("Add a message of at least 10 characters or a screenshot.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          images: images.map(({ media_type, data }) => ({ media_type, data })),
          business,
          knowledge,
          tone,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.detail)
            ? data.detail[0].msg.replace("Value error, ", "")
            : (data.detail ?? "Something went wrong."),
        );
      }
      setResult(data as Triage);
      setRun((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const profileSet = business.trim() !== "" || knowledge.trim() !== "";

  return (
    <main className="relative isolate mx-auto max-w-[1200px] px-5 pb-16 pt-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-accent/15 to-transparent"
      />

      <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-on">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 12h-6l-2 3h-4l-2-3H2" />
              <path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold leading-none tracking-tight sm:text-4xl">
              Inquiry Desk
            </h1>
            <p className="mt-1.5 text-muted">
              Sort customer messages by urgency, then review a ready-made reply.
            </p>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm font-medium text-muted">
          {[
            "Reads screenshots",
            "Replies from your facts",
            "Flags what needs a human",
          ].map((t) => (
            <li
              key={t}
              className="rounded-full border border-line bg-card px-3.5 py-1.5"
            >
              {t}
            </li>
          ))}
        </ul>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section className={card}>
          <button
            type="button"
            onClick={() => profileRef.current?.showModal()}
            className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${profileSet ? "bg-ok" : "bg-warn"}`}
              />
              <span>
                <b className="block text-sm font-semibold">Business profile</b>
                <span className="text-sm text-muted">
                  {profileSet
                    ? "Set. Replies use your business facts."
                    : "Not set. Add your prices, hours and policies first."}
                </span>
              </span>
            </span>
            <span className="text-sm font-semibold text-accent">
              {profileSet ? "Edit" : "Set up"}
            </span>
          </button>

          <h2 className="mb-4 font-display text-lg font-semibold">
            Customer message
          </h2>
          <textarea
            aria-label="Customer message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files);
              if (files.length) {
                e.preventDefault();
                addFiles(files);
              }
            }}
            placeholder="Paste an email or contact-form message here"
            className={`${field} min-h-36 resize-y`}
          />

          <div
            className="-mx-1 my-2 flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap px-1 py-1 [scrollbar-width:none]"
            aria-label="Sample messages"
          >
            <span className="shrink-0 text-sm text-muted">Try a sample:</span>
            {Object.entries(SAMPLES).map(([name, text]) => (
              <button
                key={name}
                type="button"
                onClick={() => setMessage(text)}
                className="rounded-full border border-line shrink-0 px-3 py-1.5 text-[13px] hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {name}
              </button>
            ))}
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(Array.from(e.dataTransfer.files));
            }}
            className={`rounded-xl border border-dashed p-3 text-center text-sm text-muted transition ${
              drag ? "border-accent bg-accent/10" : "border-line"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              hidden
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
            Drop screenshots here, paste with Ctrl+V, or{" "}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="font-semibold text-accent underline"
            >
              browse
            </button>
            <span className="block text-xs">
              Up to {MAX_IMAGES} images: PNG, JPG, WebP or GIF
            </span>
          </div>

          {images.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {images.map((im, i) => (
                <li key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.preview}
                    alt={im.name}
                    className="h-16 w-16 rounded-lg border border-line object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${im.name}`}
                    onClick={() =>
                      setImages((c) => c.filter((_, j) => j !== i))
                    }
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-bg"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-muted">
              Reply tone
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className={`${field} mt-1.5 font-normal`}
              >
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="short">Short and direct</option>
              </select>
            </label>
            <label className="text-sm font-medium text-muted">
              Reply language
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`${field} mt-1.5 font-normal`}
              >
                <option value="same as the customer">
                  Same as the customer
                </option>
                <option>English</option>
                <option>Urdu</option>
                <option>Arabic</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            <span
              id="mode-label"
              className="mb-1.5 block text-sm font-medium text-muted"
            >
              Reply mode
            </span>
            <div
              role="radiogroup"
              aria-labelledby="mode-label"
              className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg p-1"
            >
              {(["human", "auto"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    mode === m
                      ? "bg-accent text-on"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {m === "human" ? (
                    "Human review"
                  ) : (
                    <>
                      AI auto-reply
                      <span className="rounded-full border border-current px-2 py-0.5 text-[11px] font-medium">
                        In progress
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
            {mode === "human" ? (
              <p className="mt-2 text-xs text-muted">
                The AI writes a draft. A person reviews and sends it.
              </p>
            ) : (
              <p
                role="status"
                className="mt-2 rounded-xl border-l-4 border-warn bg-warn/10 px-3.5 py-2.5 text-sm"
              >
                <b className="font-semibold">AI auto-reply is in progress.</b>{" "}
                It is not available yet, so every reply stays a draft for you to
                review.
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-hot px-3.5 py-3 text-hot"
            >
              {error}
            </p>
          )}

          <button
            onClick={triage}
            disabled={loading}
            className="mt-5 w-full rounded-xl bg-accent py-3.5 font-semibold text-on transition active:scale-[.98] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {loading ? "Reading message…" : "Triage message"}
          </button>
        </section>

        <section aria-live="polite" className={`${card} flex flex-col`}>
          <h2 className="mb-4 font-display text-lg font-semibold">
            Triage result
          </h2>
          {loading ? (
            <div className="space-y-4">
              {[
                "h-7 w-2/5",
                "h-5 w-full",
                "h-5 w-4/5",
                "h-24 w-full",
                "h-40 w-full",
              ].map((c) => (
                <div
                  key={c}
                  className={`animate-pulse rounded-lg bg-line motion-reduce:animate-none ${c}`}
                />
              ))}
            </div>
          ) : result ? (
            <>
              {mode === "auto" && (
                <p
                  role="status"
                  className="mb-4 rounded-xl border-l-4 border-warn bg-warn/10 px-3.5 py-2.5 text-sm"
                >
                  Auto-reply is in progress, so nothing was sent. Review this
                  draft before replying.
                </p>
              )}
              <ResultCard key={run} data={result} />
            </>
          ) : (
            <div>
              <p className="mb-2 text-muted">
                Add a message or screenshot, and this panel will show:
              </p>
              <ul className="divide-y divide-line">
                {PREVIEW.map(([title, text]) => (
                  <li key={title} className="flex gap-3 py-3.5">
                    <span
                      aria-hidden
                      className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>
                      <b className="block font-semibold">{title}</b>
                      <span className="text-sm text-muted">{text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Replies are drafts. Always review before sending.
      </p>

      <dialog
        ref={profileRef}
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[min(560px,92vw)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/50"
      >
        <div className="p-6">
          <h2 className="font-display text-lg font-semibold">
            Business profile
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Set this once. Replies only use what you write here.
          </p>
          <label className="block text-sm font-medium text-muted">
            About your business
            <input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              maxLength={300}
              placeholder="Example: a small web design agency"
              className={`${field} mt-1.5 font-normal`}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-muted">
            Business facts (prices, hours, policies)
            <textarea
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              maxLength={6000}
              placeholder="Example: Websites start at $1,500. Support hours: Mon-Fri 9-5. Refunds within 14 days."
              className={`${field} mt-1.5 min-h-32 resize-y font-normal`}
            />
            <span className="mt-1 block text-xs font-normal">
              Optional. Replies only state prices and policies that appear here.
            </span>
          </label>
          <button
            type="button"
            onClick={() => profileRef.current?.close()}
            className="mt-5 w-full rounded-xl bg-accent py-3 font-semibold text-on focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Done
          </button>
        </div>
      </dialog>
    </main>
  );
}
