import DomainLinksPanel from "@/components/investigation/toolbox/DomainLinksPanel";
import ExifTool from "@/components/investigation/toolbox/ExifTool";
import OcrTool from "@/components/investigation/toolbox/OcrTool";
import styles from "./page.module.css";

export default function ToolboxPage() {
  return (
    <div className={styles.wrap}>
      <span className={styles.title}>Toolbox</span>
      <div className={styles.grid}>
        <OcrTool />
        <ExifTool />
        <DomainLinksPanel />
      </div>
    </div>
  );
}
