"use client";

import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import styles from "./Admin.module.css";

export default function AdminLogin() {
  const router = useRouter();
  return (
    <div className={styles.loginForm}>
      <h1 className={styles.loginTitle}>Relecture des points de situation</h1>
      <LoginForm onSuccess={() => router.refresh()} />
    </div>
  );
}
