import DomainLinksPanel from "@/components/investigation/toolbox/DomainLinksPanel";
import ExifTool from "@/components/investigation/toolbox/ExifTool";
import OcrTool from "@/components/investigation/toolbox/OcrTool";
import styles from "./page.module.css";

// OUTILS : la boîte à outils actuelle (lecture de texte dans une image, métadonnées, domaines). La carte mentale de
// l'OSINT Framework, avec l'explication de chaque outil, la remplacera.
export default function EspaceOutilsPage() {
  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Outils</h1>
      <div className={styles.grid}>
        <OcrTool />
        <ExifTool />
        <DomainLinksPanel />
      </div>
    </div>
  );
}
