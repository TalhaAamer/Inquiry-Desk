export interface EmailAccount {
  email: string;
  password: string;
  imap_host?: string;
  smtp_host?: string;
}

const KEY = "inquiry-desk:email";

// By default the app password lives only for this browser tab; "remember" keeps it on this device.
export function loadAccount(): EmailAccount | null {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = JSON.parse(store.getItem(KEY) ?? "null");
      if (raw?.email && raw?.password) return raw as EmailAccount;
    } catch {
      // Ignore unreadable data.
    }
  }
  return null;
}

export function saveAccount(account: EmailAccount, remember: boolean) {
  clearAccount();
  try {
    (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(account));
  } catch {
    // Storage blocked: the account is only kept in memory for this visit.
  }
}

export function clearAccount() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

export const isRemembered = () => {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
};

const GOOGLE = ["gmail.com", "googlemail.com"];
export const isGmail = (email: string) =>
  GOOGLE.includes(email.split("@")[1]?.toLowerCase() ?? "");
