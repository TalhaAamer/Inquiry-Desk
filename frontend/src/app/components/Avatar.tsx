"use client";

import { useState } from "react";

interface Props {
  photo: string | null;
  name: string;
  className?: string;
}

// Shows the picture, or the person's initial when there is none or it fails to load.
export default function Avatar({ photo, name, className = "" }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase();

  if (photo && failed !== photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(photo)}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`grid place-items-center rounded-full bg-accent/10 font-semibold text-accent ${className}`}
    >
      {initial || (
        <svg
          viewBox="0 0 24 24"
          className="h-1/2 w-1/2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      )}
    </span>
  );
}
