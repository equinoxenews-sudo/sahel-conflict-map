import { getSupabaseAdmin } from "./supabaseAdmin";

const BUCKET = "documents";
// Long enough for one viewing session; short enough that a copied link
// stops working shortly after — regenerated fresh on every page load.
const SIGNED_URL_TTL_SECONDS = 600;

export interface ZoneDocument {
  name: string;
  url: string;
  size: number | null;
}

/**
 * Lists PDF files stored under `<bucket>/<zoneSlug>/` in Supabase Storage
 * and returns a short-lived signed URL for each. The bucket is private —
 * nothing here is reachable via a permanent public URL, and files are
 * uploaded directly by hand via the Supabase dashboard (no upload UI to
 * build). Best-effort: returns an empty list on any failure rather than
 * throwing, so a missing bucket/folder just shows no documents yet.
 */
export async function listZoneDocuments(zoneSlug: string): Promise<ZoneDocument[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(zoneSlug, { sortBy: { column: "name", order: "asc" } });

    if (error) {
      console.error(`Failed to list documents for ${zoneSlug}:`, error.message);
      return [];
    }

    const pdfFiles = (files ?? []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));

    const documents = await Promise.all(
      pdfFiles.map(async (file) => {
        const path = `${zoneSlug}/${file.name}`;
        const { data: signed, error: signError } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

        if (signError || !signed) {
          console.error(`Failed to sign URL for ${path}:`, signError?.message);
          return null;
        }

        return {
          name: file.name.replace(/\.pdf$/i, ""),
          url: signed.signedUrl,
          size: (file.metadata?.size as number | undefined) ?? null,
        };
      })
    );

    return documents.filter((d): d is ZoneDocument => d !== null);
  } catch (err) {
    console.error("Failed to reach Supabase Storage:", err);
    return [];
  }
}
