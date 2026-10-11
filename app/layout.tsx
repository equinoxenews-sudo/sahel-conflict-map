import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import MobileNav from "@/components/equinoxe/MobileNav";
import { INTRO_BOOT_SCRIPT } from "@/lib/homeIntro";
import { PHONE_VIEWPORT_SCRIPT } from "@/lib/phoneViewport";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EQUINOXE News",
  description: "Analyse géopolitique indépendante de l'actualité internationale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        <Script id="phone-viewport" strategy="beforeInteractive">{PHONE_VIEWPORT_SCRIPT}</Script>
        <Script id="home-intro-boot" strategy="beforeInteractive">{INTRO_BOOT_SCRIPT}</Script>
        {children}
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      </body>
    </html>
  );
}
