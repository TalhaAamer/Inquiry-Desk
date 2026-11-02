import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google"; 
import "./globals.css"; 
import { AuthProvider } from "./lib/auth";
import { SiteConfigProvider, THEME_BOOT_SCRIPT } from "./lib/siteconfig";


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
      data-theme="light"
      className={`${display.variable} ${sans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before the first paint (Light when none is saved), so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var c=document.cookie.split(';'),k='inquiryDeskTheme=',l='theme=',t=null,p;for(var i=0;i<c.length;i++){p=c[i].trim();if(p.indexOf(k)===0)t=p.slice(k.length)}if(!t){for(var j=0;j<c.length;j++){p=c[j].trim();if(p.indexOf(l)===0)t=p.slice(l.length)}}if(t!=='light'&&t!=='dark'&&t!=='system')t='light';document.cookie=k+t+';path=/;max-age=31536000;SameSite=Lax';document.documentElement.dataset.theme=t}catch(e){}" +
              THEME_BOOT_SCRIPT,
          }}
        />
      </head>
      {/* Tailwind classes: background color, body font, text color, smooth text */}
      <body
        className="bg-bg font-sans text-ink antialiased"
        suppressHydrationWarning
      >
        <SiteConfigProvider>
          <AuthProvider>{children}</AuthProvider>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
