import { Suspense } from "react";
import OsintSearchPanel from "@/components/investigation/OsintSearchPanel";

export default function RecherchePage() {
  return (
    <Suspense fallback={null}>
      <OsintSearchPanel />
    </Suspense>
  );
}
