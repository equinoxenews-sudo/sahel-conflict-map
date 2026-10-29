import type { DefenseModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Detail from "./Detail";
import { ItemCard, KpiTile, SectionHeading, SourceList, type SourceMap } from "./shared";
import styles from "./Approche.module.css";

interface DefenseTabProps {
  defense: DefenseModule;
  metrics: Map<string, MetricView>;
  sources: SourceMap;
}

export default function DefenseTab({ defense, metrics, sources }: DefenseTabProps) {
  const roots = defense.organization.filter((node) => node.parentId === null);
  const childrenOf = (id: string) => defense.organization.filter((node) => node.parentId === id);
  const posture = defense.threatPosture;
  const empty = !defense.kpis.length && !defense.organization.length && !defense.operations.length && !defense.equipment.length && !posture;

  if (empty) {
    return (
      <section className={styles.card}>
        <h2>Défense et sécurité</h2>
        <p className={styles.cardNote}>Aucune donnée de défense n&apos;est publiée pour ce pays pour l&apos;instant.</p>
      </section>
    );
  }

  return (
    <div className={styles.tabBody}>
      {defense.kpis.length > 0 ? (
        <section aria-label="Chiffres clés de défense">
          <div className={styles.tiles}>
            {defense.kpis.map((kpi) => (
              <KpiTile key={kpi.id} kpi={kpi} metrics={metrics} sources={sources} />
            ))}
          </div>
          <p className={styles.cardNote}>Les périmètres ne s&apos;additionnent pas : personnels d&apos;active, réservistes (opérationnels), civils et Gendarmerie sont comptés à part. Aucune donnée SIPRI n&apos;est utilisée (licence commerciale requise).</p>
        </section>
      ) : null}

      {defense.organization.length > 0 ? (
        <section className={styles.card} aria-labelledby="org-title">
          <SectionHeading id="org-title" data={defense.organization}>
            Organisation des forces armées
          </SectionHeading>
          <div className={styles.orgChart}>
            {roots.map((root) => (
              <div key={root.id} className={styles.orgBranch}>
                <Detail
                  title={root.label}
                  className={styles.orgNode}
                  trigger={
                    <>
                      {root.label}
                    </>
                  }
                >
                  {root.note ? <p>{root.note}</p> : null}
                  <SourceList ids={root.sourceIds} sources={sources} demo={root.demo} />
                </Detail>
                {childrenOf(root.id).length > 0 ? (
                  <div className={styles.orgChildren}>
                    {childrenOf(root.id).map((child) => (
                      <Detail key={child.id} title={child.label} className={styles.orgNodeChild} trigger={child.label}>
                        {child.note ? <p>{child.note}</p> : null}
                        <SourceList ids={child.sourceIds} sources={sources} demo={child.demo} />
                      </Detail>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <p className={styles.cardNote}>Le statut exact de la Gendarmerie est celui des textes officiels : aucune subordination structurelle n&apos;est dessinée entre elle et le chef d&apos;état-major.</p>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {defense.missions.length > 0 ? (
          <section className={styles.card} aria-labelledby="missions-title">
            <SectionHeading id="missions-title" data={defense.missions}>
              Missions principales
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.missions.map((mission) => (
                <li key={mission.id}>
                  <ItemCard item={mission} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {defense.framework.length > 0 ? (
          <section className={styles.card} aria-labelledby="framework-title">
            <SectionHeading id="framework-title" data={defense.framework}>
              Cadre stratégique
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.framework.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={entry} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {defense.map ? (
        <section className={styles.card} aria-labelledby="defmap-title">
          <SectionHeading id="defmap-title" data={defense.map}>
            Carte des implantations et des opérations
          </SectionHeading>
          <ApprocheMap
            map={defense.map}
            sources={sources}
            list={defense.operations.length > 0 ? { title: "Opérations et engagements", items: defense.operations.map((operation) => ({ id: operation.id, title: operation.title, summary: operation.summary, status: operation.status, date: operation.date, layerId: operation.layerId, featureId: operation.featureId, demo: operation.demo })) } : undefined}
          />
        </section>
      ) : null}

      {defense.equipment.length > 0 ? (
        <section aria-labelledby="equip-title">
          <SectionHeading id="equip-title" data={defense.equipment}>
            Équipements majeurs
          </SectionHeading>
          <div className={styles.cardGrid}>
            {defense.equipment.map((equipment) => (
              <ItemCard key={equipment.id} item={equipment} sources={sources} extra={equipment.inServiceText ? <p>En service : {equipment.inServiceText}</p> : null} />
            ))}
          </div>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {defense.industry.length > 0 ? (
          <section className={styles.card} aria-labelledby="industry-title">
            <SectionHeading id="industry-title" data={defense.industry}>
              Industrie de défense
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.industry.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={entry} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {defense.partnerships.length > 0 ? (
          <section className={styles.card} aria-labelledby="partner-title">
            <SectionHeading id="partner-title" data={defense.partnerships}>
              Coopérations et partenariats militaires
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.partnerships.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={entry} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className={styles.twoCols}>
        {posture || defense.internalSecurity.length > 0 ? (
          <section className={styles.card} aria-labelledby="internal-title">
            <SectionHeading id="internal-title" data={[defense.internalSecurity, posture]}>
              Sécurité intérieure
            </SectionHeading>
            {posture ? (
              <Detail
                title={posture.system}
                className={styles.posture}
                trigger={
                  <>
                    <span className={styles.tileLabel}>
                      {posture.system}
                    </span>
                    <span className={styles.tileValue}>{posture.level}</span>
                    {posture.validFrom ? <span className={styles.itemMeta}>Depuis le {posture.validFrom.split("-").reverse().join("/")}</span> : null}
                  </>
                }
              >
                <p className={styles.drawerValue}>{posture.level}</p>
                {posture.note ? <p>{posture.note}</p> : null}
                <SourceList ids={posture.sourceIds} sources={sources} demo={posture.demo} />
              </Detail>
            ) : null}
            <ul className={styles.plainList}>
              {defense.internalSecurity.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={entry} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Seul un dispositif officiel publié (plan de vigilance, niveau daté) est affiché comme niveau de menace ; aucun niveau n&apos;est reconstruit par IA.</p>
          </section>
        ) : null}
        {defense.strengths.length > 0 ? (
          <section className={styles.card} aria-labelledby="dstrengths-title">
            <SectionHeading id="dstrengths-title" data={defense.strengths}>
              Atouts et capacités
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.strengths.map((entry) => (
                <li key={entry.id}>
                  <ItemCard item={entry} sources={sources} className={styles.listButton} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
