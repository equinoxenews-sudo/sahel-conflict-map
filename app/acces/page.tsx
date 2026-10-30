import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/adminAuth";
import { safeReturnPath } from "@/lib/siteGate";
import AccessForm from "./AccessForm";
import styles from "./acces.module.css";

export const metadata: Metadata = {
  title: "Accès — EQUINOXE News",
  robots: { index: false, follow: false },
};

// Page de connexion de la porte d'entrée (voir proxy.ts) : identifiant et mot de passe du compte.
export default async function AccessPage({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  const target = safeReturnPath((await searchParams).retour);
  if (await currentAccount()) redirect(target);
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element -- le logo reste servi sans passer par l'optimiseur d'images, fermé derrière la porte */}
        <img className={styles.logo} src="/equinoxe/logo-equinoxe-wordmark.png" alt="EQUINOXE News" />
        <p className={styles.text}>Accès réservé. Connecte-toi pour entrer sur le site.</p>
        <AccessForm target={target} />
      </div>
    </main>
  );
}
