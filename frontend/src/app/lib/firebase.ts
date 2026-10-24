import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const fresh = getApps().length === 0;
export const app = fresh ? initializeApp(config) : getApp();
export const auth = getAuth(app);

function openFirestore() {
  if (!fresh) return getFirestore(app);
  return initializeFirestore(app, { ignoreUndefinedProperties: true });
}
export const db = openFirestore();
