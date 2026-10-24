import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-linear-to-b from-accent/15 to-transparent"
      />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
