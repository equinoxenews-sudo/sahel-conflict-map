import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import LoginDialog from "@/components/auth/LoginDialog";
import MobileNav from "@/components/equinoxe/MobileNav";
import SearchDialog from "@/components/search/SearchDialog";
import { INTRO_BOOT_SCRIPT } from "@/lib/homeIntro";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Téléphones : la page est calculée sur 980 px de large, comme le fait un navigateur mobile en
// « Version ordinateur ». Le site y prend la mise en page ordinateur adaptée aux écrans en hauteur
// (menu complet, période et niveau de risque en tête, couches par icône), sans que le visiteur ait
// à cocher quoi que ce soit. Sans effet sur ordinateur ; le zoom par pincement reste possible.
// (La vraie mise en page mobile — barre du bas, menu ☰ — est obtenue en retirant « width ».)
export const viewport: Viewport = {
  width: 980,
  // Pas d'échelle initiale imposée (Next ajoute 1 par défaut) : le navigateur ajuste la page à la
  // largeur de l'écran. Avec 1, le téléphone n'afficherait que le bord gauche des 980 px.
  initialScale: undefined,
};

export const metadata: Metadata = {
  title: "EQUINOXE News",
  description: "Analyse géopolitique indépendante de l'actualité internationale.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Avant le premier affichage : l'accueil sait tout de suite s'il joue l'introduction (écran de
            chargement) au lieu de montrer l'interface une fraction de seconde. */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <LoginDialog />
        <SearchDialog />
        <Suspense fallback={null}>
          <MobileNav />
        </Suspense>
      </body>
    </html>
  );
}
