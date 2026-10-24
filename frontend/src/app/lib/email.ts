import { apiFetch } from "./auth";

export interface EmailAccount {
  email: string;
  password: string;
  imap_host?: string;
  smtp_host?: string;
}

// The app password is kept encrypted on the server; the browser only learns the address.
export async function loadAccount(): Promise<string | null> {
  const res = await apiFetch("/api/inbox/account");
  if (!res.ok) return null;
  const data = await res.json();
  return data.account?.email ?? null;
}

export async function disconnectAccount(): Promise<void> {
  await apiFetch("/api/inbox/disconnect", { method: "POST" });
}

const GOOGLE = ["gmail.com", "googlemail.com"];
export const isGmail = (email: string) =>
  GOOGLE.includes(email.split("@")[1]?.toLowerCase() ?? "");
