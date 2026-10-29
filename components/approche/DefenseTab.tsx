import { iconForTopic } from "@/lib/approche/metricIcons";
import type { DefenseModule } from "@/lib/approche/modules";
import type { MetricView } from "@/lib/approche/view";
import ApprocheMap from "./ApprocheMap";
import Detail from "./Detail";
import Icon from "./Icon";
import { IconRow, ItemCard, KpiTile, SectionHeading, SourceList, type SourceMap } from "./shared";
import type { MediaMap } from "./Visual";
import styles from "./Approche.module.css";

interface DefenseTabProps {
  defense: DefenseModule;
  metrics: Map<string, MetricView>;
  sources: SourceMap;
  media: MediaMap;
  demoActive: boolean;
}

/** Initiales d'une entreprise ou d'un organisme, pour un monogramme neutre quand aucun logo n'est autorisé. */
const monogram = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter((word) => word.length > 1)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export default function DefenseTab({ defense, metrics, sources, media, demoActive }: DefenseTabProps) {
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
          <SectionHeading id="org-title" data={defense.organization} icon="shield">
            Organisation des forces armées
          </SectionHeading>
          <div className={styles.orgChart}>
            {roots.map((root) => {
              const children = childrenOf(root.id);
              return (
                <div key={root.id} className={children.length > 0 ? styles.orgBranch : `${styles.orgBranch} ${styles.orgBranchAlone}`}>
                  <Detail
                    title={root.label}
                    className={styles.orgNode}
                    trigger={
                      <>
                        <Icon name={iconForTopic(root.label, "shield")} size={22} />
                        <span>{root.label}</span>
                      </>
                    }
                  >
                    {root.note ? <p>{root.note}</p> : null}
                    <SourceList ids={root.sourceIds} sources={sources} demo={root.demo} />
                  </Detail>
                  {children.length > 0 ? (
                    <div className={styles.orgChildren}>
                      {children.map((child) => (
                        <Detail
                          key={child.id}
                          title={child.label}
                          className={styles.orgNodeChild}
                          trigger={
                            <>
                              <Icon name={iconForTopic(child.label, "shield")} size={20} />
                              <span>{child.label}</span>
                            </>
                          }
                        >
                          {child.note ? <p>{child.note}</p> : null}
                          <SourceList ids={child.sourceIds} sources={sources} demo={child.demo} />
                        </Detail>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className={styles.cardNote}>Les liens dessinés suivent l&apos;organigramme officiel ; une composante au statut particulier (comme la Gendarmerie) est présentée à part, sans subordination inventée.</p>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {defense.missions.length > 0 ? (
          <section className={styles.card} aria-labelledby="missions-title">
            <SectionHeading id="missions-title" data={defense.missions} icon="target">
              Missions principales
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.missions.map((mission) => (
                <li key={mission.id}>
                  <IconRow item={mission} sources={sources} icon={iconForTopic(mission.title, "shield")} tone="info" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {defense.framework.length > 0 ? (
          <section className={styles.card} aria-labelledby="framework-title">
            <SectionHeading id="framework-title" data={defense.framework} icon="book">
              Cadre stratégique
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.framework.map((entry) => (
                <li key={entry.id}>
                  <IconRow item={entry} sources={sources} icon="book" tone="info" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      {defense.map ? (
        <section className={styles.card} aria-labelledby="defmap-title">
          <SectionHeading id="defmap-title" data={defense.map} icon="flag">
            Carte des implantations et des opérations
          </SectionHeading>
          <ApprocheMap
            map={defense.map}
            sources={sources}
            list={defense.operations.length > 0 ? { title: "Opérations et engagements", items: defense.operations.map((operation) => ({ id: operation.id, title: operation.title, summary: operation.summary, status: operation.status, date: operation.date, layerId: operation.layerId, featureId: operation.featureId })) } : undefined}
          />
        </section>
      ) : null}

      {defense.equipment.length > 0 ? (
        <section aria-labelledby="equip-title">
          <SectionHeading id="equip-title" data={defense.equipment} icon="jet">
            Équipements majeurs
          </SectionHeading>
          <div className={styles.cardGrid}>
            {defense.equipment.map((equipment) => (
              <ItemCard key={equipment.id} item={equipment} sources={sources} visual={{ media, demoActive, icon: iconForTopic(`${equipment.title} ${equipment.category}`, "shield"), hue: 222 }} extra={equipment.inServiceText ? <p>En service : {equipment.inServiceText}</p> : null} />
            ))}
          </div>
          <p className={styles.cardNote}>Les nombres en service, caractéristiques et dates ne sont ajoutés qu&apos;avec une source vérifiée. Les photographies s&apos;affichent seulement avec une licence confirmée.</p>
        </section>
      ) : null}

      <div className={styles.twoCols}>
        {defense.industry.length > 0 ? (
          <section className={styles.card} aria-labelledby="industry-title">
            <SectionHeading id="industry-title" data={defense.industry} icon="factory">
              Industrie de défense
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.industry.map((entry) => (
                <li key={entry.id}>
                  <Detail
                    title={entry.title}
                    className={styles.iconRow}
                    trigger={
                      <>
                        <span className={`${styles.iconBubble} ${styles.monogram}`}>{monogram(entry.title)}</span>
                        <span className={styles.iconRowText}>
                          <span className={styles.itemTitle}>{entry.title}</span>
                          {entry.summary ? <span className={styles.itemSummary}>{entry.summary}</span> : null}
                        </span>
                      </>
                    }
                  >
                    {entry.summary ? <p>{entry.summary}</p> : null}
                    {entry.url ? (
                      <p>
                        <a href={entry.url} target="_blank" rel="noopener noreferrer">
                          Site officiel
                        </a>
                      </p>
                    ) : null}
                    <p className={styles.cardNote}>Société commerciale, équipement détenu et production effective sont trois notions distinctes. Aucun logo n&apos;est affiché sans licence établie.</p>
                    <SourceList ids={entry.sourceIds} sources={sources} demo={entry.demo} />
                  </Detail>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {defense.partnerships.length > 0 ? (
          <section className={styles.card} aria-labelledby="partner-title">
            <SectionHeading id="partner-title" data={defense.partnerships} icon="handshake">
              Coopérations et partenariats militaires
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.partnerships.map((entry) => (
                <li key={entry.id}>
                  <IconRow item={entry} sources={sources} icon="handshake" tone="info" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className={styles.twoCols}>
        {posture || defense.internalSecurity.length > 0 ? (
          <section className={styles.card} aria-labelledby="internal-title">
            <SectionHeading id="internal-title" data={[defense.internalSecurity, posture]} icon="lock">
              Sécurité intérieure
            </SectionHeading>
            {posture ? (
              <Detail
                title={posture.system}
                className={styles.posture}
                trigger={
                  <>
                    <span className={styles.tileLabel}>
                      <Icon name="shieldCheck" size={15} />
                      {posture.system}
                    </span>
                    <span className={styles.tileValue}>{posture.level}</span>
                    {posture.stages.length > 0 ? (
                      <span className={styles.stages} aria-label="Stades du dispositif">
                        {posture.stages.map((stage) => (
                          <span key={stage} className={stage === posture.level ? `${styles.stage} ${styles.stageOn}` : styles.stage}>
                            {stage}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    {posture.validFrom ? <span className={styles.itemMeta}>En vigueur depuis le {posture.validFrom.split("-").reverse().join("/")}</span> : null}
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
                  <IconRow item={entry} sources={sources} icon={iconForTopic(entry.title, "lock")} tone="info" />
                </li>
              ))}
            </ul>
            <p className={styles.cardNote}>Seul un dispositif officiel publié (plan de vigilance, stade daté) est affiché comme niveau de menace ; aucun niveau n&apos;est reconstruit par IA.</p>
          </section>
        ) : null}
        {defense.strengths.length > 0 ? (
          <section className={styles.card} aria-labelledby="dstrengths-title">
            <SectionHeading id="dstrengths-title" data={defense.strengths} icon="star">
              Atouts et capacités
            </SectionHeading>
            <ul className={styles.plainList}>
              {defense.strengths.map((entry) => (
                <li key={entry.id}>
                  <IconRow item={entry} sources={sources} icon="check" tone="good" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
