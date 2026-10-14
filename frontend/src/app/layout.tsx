import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google"; 
import "./globals.css"; 


const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display-src",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans-src",
});

export const metadata: Metadata = {
  title: "Inquiry Desk",
  description: "Sort customer messages and draft replies with AI.",
};

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
