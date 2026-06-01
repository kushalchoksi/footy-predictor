import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans-next",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-next",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Footy Scenarios",
  description: "Model remaining fixtures across leagues and tournaments and see the projected final table.",
};

// Runs before first paint to set the theme class, avoiding a flash of the
// wrong theme. Uses the saved preference if present, else the OS setting.
const themeInit = `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        {children}
        <ThemeToggle />
        <Analytics />
      </body>
    </html>
  );
}
