"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useAuth, apiFetch } from "../lib/auth";
import { auth } from "../lib/firebase";
import ThemeToggle from "./ThemeToggle";

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const MIN_NEW_PASSWORD = 8;
const RESET_WAIT = 30;
const BAD_NAME = /[0-9<>{}[\]()\\/@:;|"=+*%$#!?^~_&\u0000-\u001f]/;

function nameProblem(value: string, label: string): string {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return `Please enter your ${label}.`;
  if (v.length > 50 || BAD_NAME.test(v)) return `Please enter a valid ${label}.`;
  return "";
}

function explain(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead.";
    case "auth/weak-password":
      return `Use a password with at least ${MIN_NEW_PASSWORD} characters.`;
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled yet. Enable it in Firebase Authentication.";
    case "auth/network-request-failed":
      return "Could not reach the server. Check your connection.";
    default:
      return "Could not complete that. Please try again.";
  }
}

const MESSAGES = [
  {
    who: "Ahmed · shopnest.com",
    text: "Our checkout shows a white screen and we are losing orders.",
    tag: "Urgency 5",
    tone: "bg-hot/15 text-hot",
    pos: "left-0 top-0",
    delay: "0.2s",
    floatDelay: "0s",
  },
  {
    who: "Bilal",
    text: "Invoice #204 shows $450 but we agreed on $400.",
    tag: "Urgency 3",
    tone: "bg-warn/20 text-warn",
    pos: "right-0 top-[92px]",
    delay: "0.55s",
    floatDelay: "-2s",
  },
  {
    who: "Sara · Lumen Bakery",
    text: "Could you send a quote for a new website this week?",
    tag: "Urgency 2",
    tone: "bg-ok/15 text-ok",
    pos: "left-6 top-[188px]",
    delay: "0.9s",
    floatDelay: "-4s",
  },
];

export function Illustration() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-bg lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-20">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-accent/15 via-transparent to-accent/10" />
        <div className="anim-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div
          className="anim-drift absolute -bottom-32 -right-20 h-104 w-104 rounded-full bg-accent/20 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <div className="anim-rise">
          <h2 className="font-display text-3xl font-bold leading-tight text-ink xl:text-4xl">
            Never miss an urgent customer message.
          </h2>
          <p className="mt-3 text-muted">
            Every message is sorted by urgency, with a reply ready to review.
          </p>
        </div>

        <div aria-hidden className="relative mt-10 h-107.5">
          {MESSAGES.map((m) => (
            <div
              key={m.who}
              className={`anim-rise absolute w-70 ${m.pos}`}
              style={{ animationDelay: m.delay }}
            >
              <div
                className="anim-float rounded-2xl border border-line bg-card p-3.5 text-ink shadow-lg shadow-black/10"
                style={{ animationDelay: m.floatDelay }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-muted">{m.who}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${m.tone}`}
                  >
                    {m.tag}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug">{m.text}</p>
              </div>
            </div>
          ))}

          <div
            className="anim-rise absolute bottom-0 left-4 right-0"
            style={{ animationDelay: "1.4s" }}
          >
            <div
              className="anim-float rounded-2xl border border-line bg-card p-4 text-ink shadow-xl shadow-black/10"
              style={{ animationDelay: "-1s" }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent">
                  <span className="relative grid h-2.5 w-2.5 place-items-center">
                    <span className="anim-ring absolute h-2.5 w-2.5 rounded-full bg-accent" />
                    <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  </span>
                  Draft reply
                </span>
                <span
                  className="anim-pop rounded-full bg-ok/15 px-2.5 py-0.5 text-[11px] font-bold text-ok"
                  style={{ animationDelay: "3s" }}
                >
                  ✓ Reply guard passed
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  ["100%", "2s"],
                  ["92%", "2.35s"],
                  ["64%", "2.7s"],
                ].map(([w, d]) => (
                  <div key={d} className="h-2.5 rounded-full bg-line" style={{ width: w }}>
                    <div
                      className="anim-fill h-full rounded-full bg-accent/70"
                      style={{ animationDelay: d }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Browsers fill saved logins into editable fields on page load and ignore autocomplete="off".
// A field that is read-only until it is focused is skipped by that autofill.
function useNoAutofill() {
  const [armed, setArmed] = useState(true);
  return { readOnly: armed, onFocus: () => setArmed(false) };
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const guard = useNoAutofill();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-muted">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          {...guard}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${field} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          title={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {show ? (
              <>
                <path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <path d="M1 1l22 22" />
              </>
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function AuthScreen({ mode }: { mode: "in" | "up" }) {
  const { user, loading, verified } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"form" | "reset">("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [wait, setWait] = useState(0);
  const emailId = useId();
  const firstId = useId();
  const lastId = useId();
  const emailGuard = useNoAutofill();
  // Wait for sign-up to finish saving the name before leaving, so the next screen already knows it.
  useEffect(() => {
    if (!loading && user && !busy) router.replace(verified ? "/app" : "/verify");
  }, [user, loading, verified, busy, router]);

  // Coming back with the browser's Back button must not show old entries.
  useEffect(() => {
    const clear = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirm("");
    };
    window.addEventListener("pageshow", clear);
    return () => window.removeEventListener("pageshow", clear);
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function run(job: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await job();
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }

  // Google has its own handling: a popup left open or closed must never lock the buttons,
  // and clicking again simply restarts the popup (Firebase cancels the earlier one).
  async function google() {
    setError("");
    setInfo("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      setError(explain(e));
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "up") {
      const problem = nameProblem(firstName, "first name") || nameProblem(lastName, "last name");
      if (problem) {
        setError(problem);
        return;
      }
      if (password.length < MIN_NEW_PASSWORD) {
        setError(`Use a password with at least ${MIN_NEW_PASSWORD} characters.`);
        return;
      }
      if (password !== confirm) {
        setError("The two passwords do not match.");
        return;
      }
    }
    run(async () => {
      if (mode === "in") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        return;
      }
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // The account exists now. A failure to save the name must not undo it.
      await apiFetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName.trim(), last_name: lastName.trim() }),
      }).catch(() => {});
    });
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // An unknown address gets the same reply, so the form cannot be used to find out who has an account.
      if (code !== "auth/user-not-found") {
        setError(explain(err));
        setBusy(false);
        return;
      }
    }
    setInfo(
      `If ${email.trim()} has an account, a reset link is on its way. Check your spam folder too.`,
    );
    setWait(RESET_WAIT);
    setBusy(false);
  }

  function openReset() {
    setView("reset");
    setError("");
    setInfo("");
    setWait(0);
  }

  function closeReset() {
    setView("form");
    setError("");
    setInfo("");
  }

  const resetting = view === "reset";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Illustration />

      <main className="flex min-h-screen flex-col px-4 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="grid flex-1 place-items-center py-8">
          <div className="w-full max-w-md">
            <p className="mb-6 text-center font-display text-2xl font-bold tracking-tight">
              Inquiry Desk
            </p>
            <div className="rounded-[20px] border border-line bg-card p-6 shadow-sm sm:p-8">
              {resetting ? (
                <form onSubmit={sendReset} className="space-y-3">
                  <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
                  <p className="pb-2 text-sm text-muted">
                    Enter the email you signed up with and we will send you a link to choose a
                    new password. If you signed up with Google, use the Google button instead.
                  </p>
                  <div>
                    <label htmlFor={emailId} className="block text-sm font-medium text-muted">
                      Email
                    </label>
                    <input
                      id={emailId}
                      type="email"
                      required
                      autoComplete="off"
                      {...emailGuard}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${field} mt-1.5`}
                    />
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-hot">
                      {error}
                    </p>
                  )}
                  {info && (
                    <p role="status" className="text-sm text-ok">
                      {info}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={busy || wait > 0}
                    className="w-full rounded-xl bg-accent py-3 font-semibold text-on disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {busy
                      ? "Sending…"
                      : wait > 0
                        ? `Send again in ${wait}s`
                        : info
                          ? "Send again"
                          : "Send reset link"}
                  </button>
                  <button
                    type="button"
                    onClick={closeReset}
                    className="pt-1 text-sm font-semibold text-accent hover:underline"
                  >
                    ← Back to sign in
                  </button>
                </form>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-semibold">
                    {mode === "in" ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="mb-5 mt-1 text-sm text-muted">
                    Your messages, profile and contact pages are saved to your account, so
                    nothing is lost when you switch device.
                  </p>

                  <button
                    type="button"
                    onClick={google}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 font-semibold hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                      <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8.1z" />
                      <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6-4.5H2.4v2.8A11 11 0 0 0 12 23z" />
                      <path fill="#FBBC05" d="M6 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.4a11 11 0 0 0 0 9.8L6 14.1z" />
                      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.4 7.1L6 9.9c.8-2.6 3.2-4.5 6-4.5z" />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="my-5 flex items-center gap-3 text-xs text-muted" aria-hidden>
                    <span className="h-px flex-1 bg-line" />
                    or
                    <span className="h-px flex-1 bg-line" />
                  </div>

                  <form onSubmit={submit} className="space-y-3">
                    {mode === "up" && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={firstId} className="block text-sm font-medium text-muted">
                            First name
                          </label>
                          <input
                            id={firstId}
                            required
                            maxLength={50}
                            autoComplete="off"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className={`${field} mt-1.5`}
                          />
                        </div>
                        <div>
                          <label htmlFor={lastId} className="block text-sm font-medium text-muted">
                            Last name
                          </label>
                          <input
                            id={lastId}
                            required
                            maxLength={50}
                            autoComplete="off"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className={`${field} mt-1.5`}
                          />
                        </div>
                      </div>
                    )}
                    <div>
                      <label htmlFor={emailId} className="block text-sm font-medium text-muted">
                        Email
                      </label>
                      <input
                        id={emailId}
                        type="email"
                        required
                        autoComplete="off"
                        {...emailGuard}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${field} mt-1.5`}
                      />
                    </div>
                    <PasswordField
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                      minLength={mode === "up" ? MIN_NEW_PASSWORD : undefined}
                    />
                    {mode === "up" && (
                      <>
                        <PasswordField
                          label="Confirm password"
                          value={confirm}
                          onChange={setConfirm}
                          autoComplete="new-password"
                        />
                        {confirm && password !== confirm && (
                          <p role="status" className="text-xs text-hot">
                            The two passwords do not match yet.
                          </p>
                        )}
                        <p className="text-xs text-muted">
                          Use at least {MIN_NEW_PASSWORD} characters.
                        </p>
                      </>
                    )}
                    {error && (
                      <p role="alert" className="text-sm text-hot">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full rounded-xl bg-accent py-3 font-semibold text-on disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      {busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}
                    </button>
                  </form>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link
                      href={mode === "in" ? "/signup" : "/login"}
                      className="font-semibold text-accent hover:underline"
                    >
                      {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
                    </Link>
                    {mode === "in" && (
                      <button
                        type="button"
                        onClick={openReset}
                        className="text-muted hover:text-ink"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
