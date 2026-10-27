"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "../components/Avatar";
import ContactDetails from "../components/ContactDetails";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../lib/auth";
import { auth } from "../lib/firebase";
import { loadHistory, loadSettings } from "../lib/history";
import type { HistoryItem, Settings } from "../lib/types";

const SIZE = 256;
const MAX_INPUT = 10 * 1024 * 1024;

const card = "rounded-[20px] border border-line bg-card p-5 shadow-sm sm:p-6";
const button =
  "rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold hover:border-accent disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// Crops to a centered square and shrinks it so it stays small enough to save with the account.
async function toSquareJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      SIZE,
      SIZE,
    );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const day = (value?: string | number | null) =>
  value
    ? new Date(value).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })
    : "Unknown";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line py-3 last:border-b-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading, verified, photo, savePhoto, signOut } = useAuth();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [settings, setSettings] = useState<Partial<Settings> | null>(null);
  const [resetMsg, setResetMsg] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (!verified) router.replace("/verify");
  }, [user, loading, verified, router]);

  useEffect(() => {
    if (!user || !verified) return;
    let live = true;
    loadHistory()
      .then((h) => live && setHistory(h))
      .catch(() => live && setHistory([]));
    loadSettings()
      .then((s) => live && setSettings(s))
      .catch(() => live && setSettings({}));
    return () => {
      live = false;
    };
  }, [user, verified]);

  const stats = useMemo(() => {
    const items = history ?? [];
    return {
      total: items.length,
      urgent: items.filter((i) => i.result.urgency >= 4).length,
      review: items.filter((i) => i.result.needs_review).length,
      replied: items.filter((i) => i.status === "replied").length,
      resolved: items.filter((i) => i.status === "resolved").length,
      latest: items.reduce((m, i) => Math.max(m, i.at), 0),
    };
  }, [history]);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setInfo("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_INPUT) {
      setError("That image is too large. Choose one under 10 MB.");
      return;
    }
    setBusy(true);
    try {
      await savePhoto(await toSquareJpeg(file));
      setInfo("Profile picture updated.");
    } catch {
      setError("Could not use that image. Try a different one.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await savePhoto(null);
      setInfo(user?.photoURL ? "Back to your Google picture." : "Profile picture removed.");
    } catch {
      setError("Could not remove the picture. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!user?.email) return;
    setResetBusy(true);
    setResetMsg("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetMsg(`A reset link was sent to ${user.email}.`);
    } catch {
      setResetMsg("Could not send the email. Please try again in a moment.");
    } finally {
      setResetBusy(false);
    }
  }

  if (loading || !user || !verified) {
    return <main className="grid min-h-screen place-items-center text-muted">Loading…</main>;
  }

  const name = user.displayName || user.email || "";
  const providers = user.providerData.map((p) => p.providerId);
  const google = providers.includes("google.com");
  const password = providers.includes("password");
  const method =
    [google && "Google", password && "Email and password"].filter(Boolean).join(" + ") || "Email";
  const hasUploaded = photo !== null && photo !== user.photoURL;

  return (
    <div className="relative isolate min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-linear-to-b from-accent/15 to-transparent"
      />
      <main className="mx-auto w-full max-w-[1760px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pt-10 2xl:px-14">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-9">
          <Link href="/app" className={button}>
            ← Back to app
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={async () => {
                try {
                  await signOut();
                } finally {
                  window.location.replace("/login");
                }
              }}
              className={button}
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold leading-none tracking-tight sm:text-4xl">
            Your profile
          </h1>
          <p className="mt-1.5 text-muted">Your account, picture and activity in one place.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
          <section className={`${card} self-start`} aria-label="Identity">
            <div className="flex flex-col items-center text-center">
              <Avatar photo={photo} name={name} className="h-40 w-40 text-6xl" />
              <h2 className="mt-5 max-w-full truncate font-display text-2xl font-semibold">
                {user.displayName || "No name yet"}
              </h2>
              <p className="max-w-full truncate text-muted">{user.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-accent/10 px-3 py-1 text-accent">
                  Email verified
                </span>
                {google && (
                  <span className="rounded-full border border-line px-3 py-1 text-muted">
                    Google account
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <input
                ref={input}
                type="file"
                accept="image/*"
                onChange={pick}
                className="hidden"
                aria-label="Choose a profile picture"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                className={button}
              >
                {busy ? "Saving…" : photo ? "Change picture" : "Add a picture"}
              </button>
              {hasUploaded && (
                <button type="button" disabled={busy} onClick={clear} className={button}>
                  Remove picture
                </button>
              )}
            </div>
            <p role="status" className="mt-3 min-h-5 text-center text-sm text-muted">
              {info}
            </p>
            {error && (
              <p role="alert" className="text-center text-sm text-hot">
                {error}
              </p>
            )}
            <p className="mt-2 text-center text-xs text-muted">
              Any image works. It is cropped to a square and saved to your account.
            </p>
          </section>

          <div className="space-y-6">
            <section className={card} aria-label="Activity">
              <h2 className="mb-4 font-display text-lg font-semibold">Your activity</h2>
              {history === null ? (
                <p className="text-muted">Loading your activity…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    <Stat label="Messages sorted" value={stats.total} />
                    <Stat label="Urgent" value={stats.urgent} hint="Urgency 4 or 5" />
                    <Stat label="Needed a human" value={stats.review} />
                    <Stat label="Replied" value={stats.replied} />
                    <Stat label="Resolved" value={stats.resolved} />
                  </div>
                  <p className="mt-4 text-sm text-muted">
                    {stats.latest
                      ? `Last message sorted on ${day(stats.latest)}.`
                      : "Nothing sorted yet. Paste a customer message in the app to get started."}
                  </p>
                </>
              )}
            </section>

            <ContactDetails />

            <div className="grid gap-6 xl:grid-cols-2">
              <section className={card} aria-label="Account details">
                <h2 className="mb-2 font-display text-lg font-semibold">Account details</h2>
                <dl>
                  <Row label="Name">{user.displayName || "Not set"}</Row>
                  <Row label="Email">{user.email}</Row>
                  <Row label="Phone">{user.phoneNumber || "Not set"}</Row>
                  <Row label="Sign-in method">{method}</Row>
                  <Row label="Member since">{day(user.metadata.creationTime)}</Row>
                  <Row label="Last sign-in">{day(user.metadata.lastSignInTime)}</Row>
                </dl>
              </section>

              <section className={card} aria-label="Business profile">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">Business profile</h2>
                  <Link href="/app" className="text-sm font-semibold text-accent hover:underline">
                    Edit in app
                  </Link>
                </div>
                {settings === null ? (
                  <p className="text-muted">Loading…</p>
                ) : settings.business || settings.tone || settings.language ? (
                  <dl>
                    <Row label="Business">
                      <span className="line-clamp-3 max-w-md text-right">
                        {settings.business || "Not set"}
                      </span>
                    </Row>
                    <Row label="Reply tone">{settings.tone || "Not set"}</Row>
                    <Row label="Reply language">{settings.language || "Not set"}</Row>
                    <Row label="Knowledge saved">
                      {settings.knowledge
                        ? `${settings.knowledge.length.toLocaleString()} characters`
                        : "None yet"}
                    </Row>
                  </dl>
                ) : (
                  <p className="text-muted">
                    You have not described your business yet. Doing so helps replies sound like
                    you.
                  </p>
                )}
              </section>
            </div>

            <section className={card} aria-label="Security">
              <h2 className="mb-2 font-display text-lg font-semibold">Security</h2>
              {password ? (
                <>
                  <p className="text-sm text-muted">
                    We will email a link to {user.email} so you can choose a new password.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button type="button" disabled={resetBusy} onClick={reset} className={button}>
                      {resetBusy ? "Sending…" : "Send password reset email"}
                    </button>
                    <span role="status" className="text-sm text-muted">
                      {resetMsg}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">
                  You sign in with Google, so there is no password to manage here. Your Google
                  account handles it.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
