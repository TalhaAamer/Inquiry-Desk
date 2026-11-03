"use client";

import { useEffect, useState } from "react";

export default function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    let timer: number;
    const update = () => {
      const now = new Date();
      setYear(now.getFullYear());
      timer = window.setTimeout(
        update,
        new Date(now.getFullYear() + 1, 0, 1).getTime() - now.getTime() + 10,
      );
    };
    timer = window.setTimeout(update, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <span>{year}</span>;
}
