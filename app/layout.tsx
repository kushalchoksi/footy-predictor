import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Footy Scenarios — EPL",
  description: "Model the remaining Premier League fixtures and see the projected final table.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
