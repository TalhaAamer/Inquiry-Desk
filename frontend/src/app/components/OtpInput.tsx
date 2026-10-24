"use client";

import { useEffect, useRef } from "react";

export const OTP_LENGTH = 6;

// Six square boxes for a one-time code. Typing moves forward, Backspace moves back,
// arrow keys move between boxes, and pasting a whole code fills every box.
export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (!disabled) refs.current[0]?.focus();
  }, [disabled]);

  function focusBox(i: number) {
    const box = refs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    box?.focus();
    box?.select();
  }

  function commit(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(clean);
    if (clean.length === OTP_LENGTH) onComplete?.(clean);
  }

  function type(i: number, raw: string) {
    const typed = raw.replace(/\D/g, "");
    if (!typed) return;
    // Typing into a filled box replaces it; several digits at once (autofill) spread forward.
    const next = (value.slice(0, i) + typed + value.slice(i + typed.length)).slice(0, OTP_LENGTH);
    commit(next);
    focusBox(Math.min(i + typed.length, OTP_LENGTH - 1));
  }

  function key(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) commit(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        focusBox(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(i + 1);
    }
  }

  function paste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    commit(pasted);
    focusBox(pasted.length >= OTP_LENGTH ? OTP_LENGTH - 1 : pasted.length);
  }

  return (
    <div role="group" aria-label="Six digit verification code" className="flex justify-center gap-2 sm:gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => type(i, e.target.value)}
          onKeyDown={(e) => key(i, e)}
          onPaste={paste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={OTP_LENGTH}
          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid || undefined}
          className={`h-14 w-11 rounded-xl border-2 bg-card text-center font-display text-2xl font-semibold text-ink transition focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 sm:h-16 sm:w-14 sm:text-3xl ${
            invalid ? "border-hot" : d ? "border-accent" : "border-line"
          }`}
        />
      ))}
    </div>
  );
}
