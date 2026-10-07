import type { Metadata, Viewport } from "next";
import { getSite } from "@/lib/data";
import { Fraunces, Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import "./commerce.css";
import "./mobile.css";
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(getSite().url),
  manifest: "/manifest.webmanifest",
  title: "Libaas — A little of the valley, always.",
  description:
    "An exploration of Kashmiri shawls, phirans and the quiet beauty of traditional dress. Explore the collection.",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f4eee2"};
export const revalidate = 60;
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
