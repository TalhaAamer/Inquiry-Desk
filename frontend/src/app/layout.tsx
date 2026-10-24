import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google"; 
import "./globals.css"; 
import { AuthProvider } from "./lib/auth";


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
    <html
      lang="en"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before the first paint (Light when none is saved), so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=document.cookie.match(/(?:^|; )theme=(light|dark|system)/),t=m?m[1]:'light';if(t==='system')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      {/* Tailwind classes: background color, body font, text color, smooth text */}
      <body
        className="bg-bg font-sans text-ink antialiased"
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
