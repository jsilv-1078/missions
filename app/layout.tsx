import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import "./globals.css";
import "./pulse.css";
import "./cm-nav.css";

const marketHeadline = Barlow_Condensed({ subsets:["latin"],weight:"600",style:"normal",display:"swap",variable:"--font-market-headline" });

export const metadata: Metadata = {
  title: { default:"Card Madness",template:"%s | Card Madness" },
  description: "Discover the hobby, follow card markets, manage your collection, and research cards in one place.",
};

export const viewport: Viewport = { width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#050706" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={marketHeadline.variable}><body>{children}</body></html>;
}
