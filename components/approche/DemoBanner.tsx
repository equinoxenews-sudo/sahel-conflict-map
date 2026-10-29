import styles from "./Approche.module.css";

// Bandeau permanent des fiches en mode démonstration : le contenu des rubriques marquées « démo » est fictif et ne doit jamais
// être lu comme une donnée vérifiée.
export function DemoBanner() {
  return (
    <div className={styles.demoBanner} role="note">
      <strong>DÉMO</strong>
      <span>Interface en cours de validation : les rubriques marquées « démo » contiennent du contenu fictif, jamais vérifié. Les chiffres, relations et sources sans marque sont, eux, réels et sourcés.</span>
    </div>
  );
}

/** Indicateur discret d'un composant dont le contenu est fictif. */
export function DemoTag({ show = true }: { show?: boolean }) {
  return show ? (
    <span className={styles.demoTag} title="Contenu de démonstration, non vérifié">
      démo
    </span>
  ) : null;
}
