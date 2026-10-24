"use client";

import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { getDoc, setDoc } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushAll, setUid, userDoc } from "./cloud";
import { auth } from "./firebase";

export type Theme = "system" | "light" | "dark";

interface AuthState {
  user: User | null;
  loading: boolean;
  // Whether the email address was confirmed with a one-time code.
  verified: boolean;
  recheckVerified: () => Promise<boolean>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  verified: false,
  recheckVerified: async () => false,
  theme: "light",
  setTheme: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(Ctx);

// The theme is the only thing kept in the browser, as a small cookie, so the right colors
// are applied before the first paint. Everything else about the user lives in Firestore.
// Light is the default when nothing has been chosen yet.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

function cookieTheme(): Theme {
  const m = document.cookie.match(/(?:^|; )theme=(light|dark|system)/);
  return (m?.[1] as Theme | undefined) ?? "light";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    // Sync the toggle with the cookie straight away, before Firebase finishes loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(cookieTheme());
    return onAuthStateChanged(auth, async (next) => {
      setUid(next?.uid ?? null);
      const fromCookie = cookieTheme();
      setThemeState(fromCookie);
      let ok = false;
      if (next) {
        // The saved token may be older than the verification, so ask for a fresh one before deciding.
        ok = (await next.getIdTokenResult()).claims.otpVerified === true;
        if (!ok) ok = (await next.getIdTokenResult(true)).claims.otpVerified === true;
      }
      setVerified(ok);
      setUser(next);
      if (next) {
        // Records who signed in on the account document. Failure must not block sign-in.
        void apiFetch("/api/account/sync", { method: "POST" }).catch(() => {});
        if (ok) {
          try {
            const snap = await getDoc(userDoc());
            const saved = snap.data()?.theme;
            if (saved === "light" || saved === "dark" || saved === "system") {
              setThemeState(saved);
              applyTheme(saved);
            }
          } catch {
            // The theme just stays as it is.
          }
        }
      }
      setLoading(false);
    });
  }, []);

  const recheckVerified = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    const ok = (await current.getIdTokenResult(true)).claims.otpVerified === true;
    setVerified(ok);
    return ok;
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    if (auth.currentUser) {
      void setDoc(userDoc(), { theme: next, updatedAt: Date.now() }, { merge: true }).catch(
        () => {},
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    await flushAll();
    await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, loading, verified, recheckVerified, theme, setTheme, signOut }),
    [user, loading, verified, recheckVerified, theme, setTheme, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Calls the backend with the signed-in user's Firebase token.
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
