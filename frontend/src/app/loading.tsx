function Bar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-line motion-reduce:animate-none ${className}`} />;
}

export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="min-h-dvh">
      <p className="sr-only">Loading page…</p>
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Bar className="h-7 w-32" />
        <div className="hidden items-center gap-6 sm:flex">
          <Bar className="h-4 w-16" />
          <Bar className="h-4 w-16" />
          <Bar className="h-4 w-16" />
        </div>
        <Bar className="h-9 w-24 rounded-full" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div className="space-y-5">
            <Bar className="h-4 w-44" />
            <Bar className="h-12 w-full max-w-xl" />
            <Bar className="h-12 w-4/5 max-w-lg" />
            <Bar className="h-5 w-full max-w-md" />
            <Bar className="h-5 w-3/4 max-w-sm" />
            <div className="flex gap-3 pt-2">
              <Bar className="h-11 w-32 rounded-xl" />
              <Bar className="h-11 w-28 rounded-xl" />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-line bg-card p-5 shadow-sm">
            <Bar className="h-5 w-36" />
            <Bar className="h-20 w-full rounded-xl" />
            <Bar className="h-20 w-full rounded-xl" />
            <Bar className="h-20 w-5/6 rounded-xl" />
            <Bar className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          <Bar className="h-32 rounded-2xl" />
          <Bar className="h-32 rounded-2xl" />
          <Bar className="h-32 rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
