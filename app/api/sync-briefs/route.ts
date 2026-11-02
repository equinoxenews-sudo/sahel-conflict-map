import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { syncBriefs } from "@/lib/syncBriefs";
import { parseBatchesLimit } from "@/lib/syncPasses";

// 300 s (maximum du plan Hobby). Avec 4 minutes par réponse de l'IA, un appel traite un seul lot par zone : le workflow
// rappelle la route une fois par lot (jusqu'à 3 le matin, 1 aux passages légers).
export const maxDuration = 300;

// Called by Vercel Cron (see vercel.json). Vercel automatically sends
// "Authorization: Bearer $CRON_SECRET" when that env var is set, which we
// verify here so the endpoint can't be triggered by anyone else.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = new URL(request.url).searchParams;
    const zone = params.get("zone") ?? undefined;
    // Passage léger de l'après-midi : « batches=1 » limite chaque zone à un lot (lib/syncPasses.ts).
    const { summary, errors, batchCap } = await syncBriefs(zone, { maxBatches: parseBatchesLimit(params.get("batches")) });
    // The homepage and zone pages are ISR-cached (revalidate = 3600) — mark
    // them stale so the very next visit picks up the new briefs instead of
    // waiting up to an hour.
    revalidatePath("/");
    revalidatePath("/zones/[slug]/[tab]", "page");
    revalidatePath("/briefs/[id]", "page");
    const failed = Object.values(summary).some((value) => value === -1);
    return NextResponse.json({ ok: !failed, summary, errors, batchCap }, { status: failed ? 502 : 200 });
  } catch (error) {
    console.error("Brief sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
