"use client";

import { useRouter } from "next/navigation";
import styles from "./Admin.module.css";

export default function AdminLogout() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.secondary}
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.refresh();
      }}
    >
      Se déconnecter
    </button>
  );
}
