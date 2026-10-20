"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/session";
import styles from "./Admin.module.css";

export default function AdminLogout() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.secondary}
      onClick={async () => {
        await logout();
        router.refresh();
      }}
    >
      Se déconnecter
    </button>
  );
}
