import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";
import "./pulse.css";
import "./cm-nav.css";

const marketHeadline = Barlow_Condensed({
  subsets: ["latin"],
  weight: "600",
  style: "normal",
  display: "swap",
  variable: "--font-market-headline",
});

export const metadata: Metadata = {
  title: "Card Madness Pulse MVP",
  description: "Market intelligence and curated sports-card news.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050706",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={marketHeadline.variable}><body>{children}</body></html>;
}
