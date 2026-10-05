import type { Metadata } from "next";

// L'administration n'a rien à faire dans un moteur de recherche.
export const metadata: Metadata = {
  title: "Administration — Équinoxe News",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
