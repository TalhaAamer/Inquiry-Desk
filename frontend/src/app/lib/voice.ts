"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings: the Web Speech API is not in TypeScript's DOM library.
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

const LANG: Record<string, string> = {
  English: "en-US",
  Urdu: "ur-PK",
  Arabic: "ar-SA",
  Spanish: "es-ES",
  French: "fr-FR",
};

export const speechLang = (reply: string) =>
  LANG[reply] ?? (typeof navigator !== "undefined" ? navigator.language : "en-US");

function ctor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictation(
  lang: string,
  onText: (finalText: string, interim: string) => void,
) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);

  useEffect(() => {
    cb.current = onText;
  });
  useEffect(() => {
    const t = setTimeout(() => setSupported(!!ctor()), 0);
    return () => clearTimeout(t);
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  const start = useCallback(() => {
    const C = ctor();
    if (!C) return;
    setError("");
    const r = new C();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      cb.current(finalText, interim);
    };
    r.onerror = (e) =>
      setError(
        e.error === "not-allowed"
          ? "Microphone access was blocked. Allow it in the browser."
          : e.error === "no-speech"
            ? "No speech heard."
            : "Voice input stopped.",
      );
    r.onend = () => {
      setListening(false);
      cb.current("", "");
    };
    rec.current = r;
    setListening(true);
    r.start();
  }, [lang]);

  useEffect(() => () => rec.current?.stop(), []);

  return { supported, listening, error, start, stop };
}

export function speak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

export const canSpeak = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;

export const stopSpeaking = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};
