// Fichier GÉNÉRÉ par `npm run approche:contract` à partir de data/approche/ : ne pas modifier à la main. Un test vérifie qu'il est à jour.
import BEN from "@/data/approche/BEN.json";
import BEN_WORLDBANK from "@/data/approche/BEN.worldbank.json";
import BFA from "@/data/approche/BFA.json";
import BFA_WORLDBANK from "@/data/approche/BFA.worldbank.json";
import CHN from "@/data/approche/CHN.json";
import CHN_WORLDBANK from "@/data/approche/CHN.worldbank.json";
import FRA from "@/data/approche/FRA.json";
import FRA_WORLDBANK from "@/data/approche/FRA.worldbank.json";
import FRA_EUROSTAT from "@/data/approche/FRA.eurostat.json";
import GHA from "@/data/approche/GHA.json";
import GHA_WORLDBANK from "@/data/approche/GHA.worldbank.json";
import GIN from "@/data/approche/GIN.json";
import GIN_WORLDBANK from "@/data/approche/GIN.worldbank.json";
import MLI from "@/data/approche/MLI.json";
import MLI_WORLDBANK from "@/data/approche/MLI.worldbank.json";
import NGA from "@/data/approche/NGA.json";
import NGA_WORLDBANK from "@/data/approche/NGA.worldbank.json";

export const COUNTRY_FILES: Record<string, { curated: unknown; worldbank?: unknown; eurostat?: unknown }> = {
  BEN: { curated: BEN, worldbank: BEN_WORLDBANK },
  BFA: { curated: BFA, worldbank: BFA_WORLDBANK },
  CHN: { curated: CHN, worldbank: CHN_WORLDBANK },
  FRA: { curated: FRA, worldbank: FRA_WORLDBANK, eurostat: FRA_EUROSTAT },
  GHA: { curated: GHA, worldbank: GHA_WORLDBANK },
  GIN: { curated: GIN, worldbank: GIN_WORLDBANK },
  MLI: { curated: MLI, worldbank: MLI_WORLDBANK },
  NGA: { curated: NGA, worldbank: NGA_WORLDBANK },
};
