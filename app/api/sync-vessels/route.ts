import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { syncVessels } from "@/lib/syncVessels";

export const maxDuration = 30;

// Called by Vercel Cron (see vercel.json). Vercel automatically sends
// "Authorization: Bearer $CRON_SECRET" when that env var is set, which we
// verify here so the endpoint can't be triggered by anyone else.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncVessels();
    revalidatePath("/zones/tracking");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Vessel sync failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
