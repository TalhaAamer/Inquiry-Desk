"use client";

import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { deleteField, getDoc, setDoc } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { flushAll, setUid, userDoc } from "./cloud";
import { auth } from "./firebase";
import { useSessionTimeout } from "./sessionTimeout";

export type Theme = "system" | "light" | "dark";

interface AuthState {
  user: User | null;
  loading: boolean;
  // Whether the email address was confirmed with a one-time code.
  verified: boolean;
  recheckVerified: () => Promise<boolean>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  // The picture to show: an uploaded one if there is one, otherwise the Google account's.
  photo: string | null;
  // Pass null to remove the uploaded picture.
  savePhoto: (dataUrl: string | null) => Promise<void>;
  // Re-reads the account from Firebase after the name or phone number changes.
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  verified: false,
  recheckVerified: async () => false,
  theme: "light",
  setTheme: () => {},
  photo: null,
  savePhoto: async () => {},
  refreshUser: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(Ctx);

const THEME_COOKIE = "inquiryDeskTheme";

// Keep the theme in a cookie so the right colors are applied before the first paint.
// Light is the default when nothing has been chosen yet.
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

function cookieTheme(): Theme | null {
  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  const current = cookies
    .filter((cookie) => cookie.startsWith(`${THEME_COOKIE}=`))
    .map((cookie) => cookie.slice(THEME_COOKIE.length + 1));
  // Read the old, generic cookie once so existing preferences survive this change.
  const legacy = cookies
    .filter((cookie) => cookie.startsWith("theme="))
    .map((cookie) => cookie.slice("theme=".length));
  const saved = current[current.length - 1] ?? legacy[legacy.length - 1];
  return saved === "light" || saved === "dark" || saved === "system" ? saved : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [theme, setThemeState] = useState<Theme>("light");
  const [uploaded, setUploaded] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    // Sync the document and toggle before Firebase finishes loading.
    const savedTheme = cookieTheme() ?? "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(savedTheme);
    applyTheme(savedTheme);
    return onAuthStateChanged(auth, async (next) => {
      setUid(next?.uid ?? null);
      const fromCookie = cookieTheme() ?? "light";
      setThemeState(fromCookie);
      applyTheme(fromCookie);
      let ok = false;
      if (next) {
        // The saved token may be older than the verification, so ask for a fresh one before deciding.
        ok = (await next.getIdTokenResult()).claims.otpVerified === true;
        if (!ok) ok = (await next.getIdTokenResult(true)).claims.otpVerified === true;
      }
      setVerified(ok);
      setUser(next);
      setUploaded(null);
      if (next) {
        // Records who signed in on the account document. Failure must not block sign-in.
        void apiFetch("/api/account/sync", { method: "POST" }).catch(() => {});
        if (ok) {
          try {
            const snap = await getDoc(userDoc());
            const savedPhoto = snap.data()?.photo;
            if (typeof savedPhoto === "string" && savedPhoto.startsWith("data:image/")) {
              setUploaded(savedPhoto);
            }
            // Theme is a per-device preference; it is not read from Firestore.
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

  // Theme is a per-device preference (stored in a cookie), not user data.
  // We deliberately do NOT sync it to Firestore to avoid cross-device conflicts
  // and the sign-in overwrite bug.
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const savePhoto = useCallback(async (dataUrl: string | null) => {
    await setDoc(
      userDoc(),
      { photo: dataUrl ?? deleteField(), updatedAt: Date.now() },
      { merge: true },
    );
    setUploaded(dataUrl);
  }, []);

  const refreshUser = useCallback(async () => {
    await auth.currentUser?.reload();
    setRev((n) => n + 1);
  }, []);

  const signOut = useCallback(async () => {
    await flushAll();
    await fbSignOut(auth);
  }, []);

  useSessionTimeout(!!user, signOut, user?.metadata.lastSignInTime);

  const photo = uploaded ?? user?.photoURL ?? null;
  const value = useMemo(
    () => ({
      user,
      loading,
      verified,
      recheckVerified,
      theme,
      setTheme,
      photo,
      savePhoto,
      refreshUser,
      signOut,
    }),
    // rev makes the context change after a reload, since the user object keeps the same identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, rev, loading, verified, recheckVerified, theme, setTheme, photo, savePhoto, refreshUser, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Calls the backend with the signed-in user's Firebase token.
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(init.headers);
  if (process.env.NEXT_PUBLIC_COMPANY_ID) headers.set("X-Company-Id", process.env.NEXT_PUBLIC_COMPANY_ID);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
