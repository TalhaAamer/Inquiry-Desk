"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import Avatar from "./Avatar";

export default function ProfileButton() {
  const { user, photo } = useAuth();
  const name = user?.displayName || user?.email || "";

  return (
    <Link
      href="/profile"
      aria-label="Your profile"
      title="Your profile"
      className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-line bg-card hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Avatar photo={photo} name={name} className="h-full w-full" />
    </Link>
  );
}
