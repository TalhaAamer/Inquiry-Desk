import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google"; 
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css"; 
import { AuthProvider } from "./lib/auth";
import { SiteConfigProvider } from "./lib/siteconfig";


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
              "try{var c=document.cookie.split(';'),k='inquiryDeskTheme=',l='theme=',current=null,legacy=null,p;for(var i=0;i<c.length;i++){p=c[i].trim();if(p.indexOf(k)===0)current=p.slice(k.length);else if(p.indexOf(l)===0)legacy=p.slice(l.length)}var t=current!==null?current:legacy;if(t!=='light'&&t!=='dark'&&t!=='system')t='light';document.documentElement.dataset.theme=t;document.cookie=k+t+';path=/;max-age=31536000;SameSite=Lax'}catch(e){};" +
              "try{var css=localStorage.getItem('siteThemeCss');if(css&&css.length<3000&&/^[A-Za-z0-9 :;#,{}()\\-\"\\[\\]=@.]+$/.test(css)){var s=document.createElement('style');s.id='site-theme';s.textContent=css;document.head.appendChild(s)}}catch(e){}",
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
