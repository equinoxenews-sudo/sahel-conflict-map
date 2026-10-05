import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SituationReportEditor from "@/components/situation/SituationReportEditor";
import { isAdmin } from "@/lib/adminAuth";
import { getReportAdmin } from "@/lib/situationReportAdmin";
import { getZone } from "@/lib/zones";
import styles from "@/components/situation/Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminSituationEditPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/situation");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const report = await getReportAdmin(id);
  if (!report) notFound();

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <div className={styles.pageHeader}>
          <Link href="/admin/situation" className={styles.linkSmall}>
            ‹ Tous les rapports
          </Link>
        </div>
        <SituationReportEditor report={report} zoneName={getZone(report.zone_slug)?.name ?? report.zone_slug} />
      </div>
    </main>
  );
}
