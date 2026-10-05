import styles from "./HexFlag.module.css";

interface HexFlagProps {
  iso2: string;
  name: string;
}

// Même drapeau hexagonal que les fiches pays (Approche), à la taille du texte :
// cadre doré fin derrière un drapeau légèrement rentré. Les SVG viennent de
// public/flags (projet flag-icons, licence MIT), sans appel à un tiers.
export default function HexFlag({ iso2, name }: HexFlagProps) {
  return (
    <span className={styles.flagHex} title={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/flags/${iso2.toLowerCase()}.svg`} alt={`Drapeau ${name}`} className={styles.flagHexImage} />
    </span>
  );
}
