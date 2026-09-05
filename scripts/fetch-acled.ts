// Manual/local runner for the ACLED sync. Also what the cron route calls.
// Usage: npm run sync:acled
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { syncAcledEvents } from "../lib/syncAcled";

async function main() {
  console.log("Fetching ACLED events for the last 30 days...");
  const summary = await syncAcledEvents();
  console.log("Done. Rows upserted per country:");
  for (const [country, count] of Object.entries(summary)) {
    console.log(`  ${country}: ${count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
