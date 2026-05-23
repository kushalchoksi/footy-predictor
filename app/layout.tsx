import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

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
  title: "Footy Scenarios — EPL",
  description: "Model the remaining Premier League fixtures and see the projected final table.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0b0f17] font-sans text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
