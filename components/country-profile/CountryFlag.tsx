import styles from "./CountryProfilePage.module.css";

interface CountryFlagProps {
  iso2?: string;
  name: string;
}

// Flags are the real MIT-licensed SVGs from the flag-icons project
// (https://github.com/lipis/flag-icons), copied once into public/flags —
// not fetched from a third party at runtime.
export default function CountryFlag({ iso2, name }: CountryFlagProps) {
  if (!iso2) return null;
  return (
    <div className={styles.flagHex}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/flags/${iso2.toLowerCase()}.svg`} alt={`Drapeau ${name}`} className={styles.flagHexImage} />
    </div>
  );
}
