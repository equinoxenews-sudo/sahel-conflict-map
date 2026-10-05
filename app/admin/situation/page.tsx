import Link from "next/link";
import AdminLogin from "@/components/situation/AdminLogin";
import AdminLogout from "@/components/situation/AdminLogout";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import { psitLabel } from "@/lib/situationReport";
import { listReportsAdmin } from "@/lib/situationReportAdmin";
import { getZone } from "@/lib/zones";
import styles from "@/components/situation/Admin.module.css";

export const dynamic = "force-dynamic";

const created = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

export default async function AdminSituationPage() {
  if (!adminConfigured()) {
    return (
      <main className={styles.page}>
        <div className={styles.notice}>
          <strong>Accès non configuré.</strong>
          <br />
          Ajoute la variable <code>ADMIN_PASSWORD</code> dans les réglages Vercel (Environment Variables), puis redéploie.
        </div>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className={styles.page}>
        <AdminLogin />
      </main>
    );
  }

  let reports: Awaited<ReturnType<typeof listReportsAdmin>> = [];
  let loadError: string | null = null;
  try {
    reports = await listReportsAdmin();
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Lecture impossible.";
  }
  // Brouillons à relire d'abord, puis les rapports publiés.
  const sorted = [...reports].sort((a, b) => Number(a.status === "published") - Number(b.status === "published"));

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Points de situation — relecture</h1>
          <AdminLogout />
        </div>
        {loadError ? (
          <p className={styles.error}>
            Lecture impossible : {loadError}. As-tu exécuté <code>supabase/add-situation-reports.sql</code> ?
          </p>
        ) : null}
        <div className={styles.list}>
          {sorted.map((report) => (
            <Link key={report.id} href={`/admin/situation/${report.id}`} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowLabel}>
                  {getZone(report.zone_slug)?.name ?? report.zone_slug} · {psitLabel(report.period_end).full}
                </div>
                <div className={styles.rowTitle}>{report.title}</div>
              </div>
              <span className={styles.rowDate}>{created.format(new Date(report.created_at))}</span>
              <span className={report.status === "published" ? `${styles.badge} ${styles.badgeOn}` : styles.badge}>
                {report.status === "published" ? "Publié" : "À relire"}
              </span>
            </Link>
          ))}
          {!loadError && sorted.length === 0 ? (
            <p className={styles.rowDate}>Aucun rapport pour l&apos;instant : le prochain brouillon arrive lundi 7 h ou jeudi 18 h.</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
