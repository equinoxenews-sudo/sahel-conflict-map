import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncArticles } from "@/lib/syncArticles";
import { syncTelegram } from "@/lib/syncTelegram";

export const maxDuration = 60;

// Called by Vercel Cron (see vercel.json). Vercel automatically sends
// "Authorization: Bearer $CRON_SECRET" when that env var is set, which we
// verify here so the endpoint can't be triggered by anyone else.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncArticles();
    // Telegram (sources complémentaires des zones « analyste ») : un échec ne
    // doit pas priver le site de ses articles de presse.
    const telegram = await syncTelegram().catch((err) => {
      console.error("Telegram sync failed", err);
      return { error: err instanceof Error ? err.message : String(err) };
    });
    // The homepage and zone pages are ISR-cached (revalidate = 3600) — mark
    // them stale so the very next visit picks up the new articles/briefs
    // instead of waiting up to an hour.
    revalidatePath("/");
    revalidatePath("/zones/[slug]/[tab]", "page");
    return NextResponse.json({ ok: true, summary, telegram });
  } catch (error) {
    console.error("Article sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
