// Manual/local runner for the GDELT sync. Also what the cron route calls.
// Usage: npm run sync:gdelt
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.local") });

import { syncGdeltEvents } from "../lib/syncGdelt";

async function main() {
  console.log("Fetching the latest GDELT event batch...");
  const summary = await syncGdeltEvents();
  console.log(`Scanned ${summary.totalGdeltEvents} global events, matched ${summary.matched}.`);
  for (const [country, count] of Object.entries(summary.byCountry)) {
    console.log(`  ${country}: ${count}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
