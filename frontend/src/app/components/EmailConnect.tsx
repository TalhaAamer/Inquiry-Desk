"use client";

import { useState, type RefObject } from "react";
import { isGmail, type EmailAccount } from "../lib/email";

const field =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

interface Props {
  dialogRef: RefObject<HTMLDialogElement | null>;
  onConnected: (account: EmailAccount, remember: boolean) => void;
  remembered: boolean;
}

export default function EmailConnect({ dialogRef, onConnected, remembered }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [choice, setChoice] = useState<boolean | null>(null);
  const remember = choice ?? remembered;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setError("");
    const account: EmailAccount = {
      email: email.trim(),
      password: password.trim(),
      ...(imapHost.trim() ? { imap_host: imapHost.trim() } : {}),
      ...(smtpHost.trim() ? { smtp_host: smtpHost.trim() } : {}),
    };
    if (!account.email || !account.password) {
      setError("Enter your email address and app password.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/inbox/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Check the email address and password.",
        );
      }
      onConnected(account, remember);
      setPassword("");
      dialogRef.current?.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      className="m-auto w-[min(520px,92vw)] rounded-2xl border border-line bg-card p-0 text-ink backdrop:bg-black/50"
    >
      <form
        className="max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          connect();
        }}
      >
        <h2 className="font-display text-lg font-semibold">Connect your email</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Read your unread emails here and reply from your own address. Nothing
          is sent until you click send.
        </p>

        <label className="block text-sm font-medium text-muted">
          Email address
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className={`${field} mt-1.5 font-normal`}
          />
        </label>
        <label className="mt-3 block text-sm font-medium text-muted">
          App password
          <input
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="16-letter app password"
            className={`${field} mt-1.5 font-normal`}
          />
        </label>

        <div className="mt-3 rounded-xl border border-line bg-bg px-3.5 py-3 text-sm text-muted">
          {isGmail(email) || !email.includes("@") ? (
            <>
              <b className="font-semibold text-ink">Gmail: get an app password</b>
              <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                <li>
                  Turn on 2-Step Verification in your Google Account (Security).
                </li>
                <li>
                  Open{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-accent underline"
                  >
                    myaccount.google.com/apppasswords
                  </a>
                  , name it &ldquo;Inquiry Desk&rdquo; and click Create.
                </li>
                <li>Paste the 16-letter password above (spaces are fine).</li>
              </ol>
            </>
          ) : (
            <>
              <b className="font-semibold text-ink">Use an app password</b>
              <p className="mt-1">
                Most providers (Outlook, Yahoo, iCloud, Zoho) need an app
                password instead of your normal one. Create it in your
                account&apos;s security settings. IMAP access must be enabled.
              </p>
            </>
          )}
        </div>

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-muted">
            Advanced: custom mail servers
          </summary>
          <p className="mt-2 text-xs text-muted">
            Only needed for a work or custom domain. Your provider&apos;s help
            page lists the IMAP and SMTP server names.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={imapHost}
              onChange={(e) => setImapHost(e.target.value)}
              placeholder="imap.example.com"
              aria-label="IMAP server"
              className={field}
            />
            <input
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.example.com"
              aria-label="SMTP server"
              className={field}
            />
          </div>
        </details>

        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setChoice(e.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-muted">
            <b className="font-semibold text-ink">Remember on this device</b>
            <br />
            Off: you stay connected only until you close this tab. Only turn it
            on for a device you own.
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-hot px-3.5 py-2.5 text-sm text-hot">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl border border-line px-4 py-3 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-accent py-3 font-semibold text-on disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {busy ? "Checking your account…" : "Connect"}
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Your password is sent to this app&apos;s server only to sign in to
          your mailbox. It is never stored on the server.
        </p>
      </form>
    </dialog>
  );
}
