// layout.tsx - the outer shell that wraps every page of the app.
import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google"; // Next.js downloads Google fonts for us
import "./globals.css"; // load our styles

// Headline font. "variable" is the CSS variable name that globals.css uses.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-src",
});
// Body font.
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-src",
});

// Page title and description (shown in the browser tab and search results).
export const metadata: Metadata = {
  title: "Inquiry Desk",
  description: "Sort customer messages and draft replies with AI.",
};

// "children" is whatever page is being shown (our page.tsx).
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      {/* Tailwind classes: background color, body font, text color, smooth text */}
      <body className="bg-bg font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
