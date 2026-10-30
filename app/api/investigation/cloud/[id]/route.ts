import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/adminAuth";
import { ACCOUNT_HEADER, cloudOwnerOf, requestMatchesAccount } from "@/lib/accountScope";
import {
  commitCloudUpload,
  type CloudOwner,
  deleteCloudDossier,
  getCloudChunk,
  getCloudMeta,
  getCloudVersionChunkCount,
  isValidDossierId,
  listCloudVersions,
  MAX_CHUNK_CHARS,
  putCloudChunk,
} from "@/lib/investigationCloud";

type Context = { params: Promise<{ id: string }> };

const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;
const MAX_CHUNKS = 400;

// Le propriétaire vient de la session, jamais de la requête : seul son identifiant de dossier est fourni par le navigateur.
async function guard(request: Request, context: Context): Promise<{ id: string; owner: CloudOwner } | NextResponse> {
  const account = await currentAccount();
  if (!account) return NextResponse.json({ error: "Connexion requise.", code: "locked" }, { status: 401 });
  if (!requestMatchesAccount(request.headers.get(ACCOUNT_HEADER), account)) return ACCOUNT_CHANGED();
  const { id } = await context.params;
  if (!isValidDossierId(id)) return NextResponse.json({ error: "Identifiant de dossier invalide." }, { status: 400 });
  return { id, owner: cloudOwnerOf(account) };
}

// La page a été ouverte pour un autre compte que celui de la session : rien n'est lu ni écrit.
const ACCOUNT_CHANGED = () =>
  NextResponse.json({ error: "Le compte connecté a changé depuis l'ouverture de cette page : recharge la page.", code: "account_changed" }, { status: 409 });

function fail(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
}

// Lecture : sans paramètre, les informations du dossier ; avec ?seq=n, le morceau n.
export async function GET(request: Request, context: Context) {
  const checked = await guard(request, context);
  if (checked instanceof NextResponse) return checked;
  try {
    const params = new URL(request.url).searchParams;
    const found = await getCloudMeta(checked.owner, checked.id);
    if (!found) return NextResponse.json({ error: "Dossier introuvable en ligne." }, { status: 404 });

    // Historique : ?versions=1 liste les versions conservées ; ?upload=ID[&seq=n] lit l'une d'elles.
    if (params.get("versions") !== null) {
      const versions = await listCloudVersions(checked.owner, checked.id);
      return NextResponse.json({
        versions: versions.map((version) => ({ ...version, current: version.uploadId === found.uploadId })),
      });
    }
    const upload = params.get("upload");
    if (upload !== null) {
      if (!UPLOAD_ID_PATTERN.test(upload)) return NextResponse.json({ error: "Version invalide." }, { status: 400 });
      const total = await getCloudVersionChunkCount(checked.owner, checked.id, upload);
      if (total === 0) return NextResponse.json({ error: "Version introuvable." }, { status: 404 });
      const part = params.get("seq");
      if (part === null) return NextResponse.json({ meta: { chunkCount: total } });
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= total) return NextResponse.json({ error: "Morceau inexistant." }, { status: 400 });
      const chunk = await getCloudChunk(checked.owner, checked.id, upload, index);
      if (chunk === null) return NextResponse.json({ error: "Morceau manquant : version incomplète." }, { status: 500 });
      return NextResponse.json({ seq: index, data: chunk });
    }

    const seqParam = params.get("seq");
    if (seqParam === null) return NextResponse.json({ meta: found.meta });
    const seq = Number(seqParam);
    if (!Number.isInteger(seq) || seq < 0 || seq >= found.meta.chunkCount) {
      return NextResponse.json({ error: "Morceau inexistant." }, { status: 400 });
    }
    const data = await getCloudChunk(checked.owner, checked.id, found.uploadId, seq);
    if (data === null) return NextResponse.json({ error: "Morceau manquant : copie en ligne incomplète." }, { status: 500 });
    return NextResponse.json({ seq, data });
  } catch (error) {
    return fail(error);
  }
}

// Envoi : une suite de { action: "chunk" } puis un { action: "commit" } qui bascule la version.
export async function PUT(request: Request, context: Context) {
  const checked = await guard(request, context);
  if (checked instanceof NextResponse) return checked;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.uploadId !== "string" || !UPLOAD_ID_PATTERN.test(body.uploadId)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  try {
    if (body.action === "chunk") {
      const seq = body.seq;
      const data = body.data;
      if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 0 || seq >= MAX_CHUNKS || typeof data !== "string") {
        return NextResponse.json({ error: "Morceau invalide." }, { status: 400 });
      }
      if (data.length > MAX_CHUNK_CHARS) {
        return NextResponse.json({ error: "Morceau trop volumineux." }, { status: 413 });
      }
      await putCloudChunk(checked.owner, checked.id, body.uploadId, seq, data);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "commit") {
      const chunkCount = body.chunkCount;
      if (typeof chunkCount !== "number" || !Number.isInteger(chunkCount) || chunkCount < 1 || chunkCount > MAX_CHUNKS) {
        return NextResponse.json({ error: "Nombre de morceaux invalide." }, { status: 400 });
      }
      const meta = await commitCloudUpload(checked.owner, {
        dossierId: checked.id,
        uploadId: body.uploadId,
        chunkCount,
        name: typeof body.name === "string" ? body.name : "Dossier",
        description: typeof body.description === "string" ? body.description : "",
        entityCount: typeof body.entityCount === "number" ? Math.max(0, Math.floor(body.entityCount)) : 0,
        noteCount: typeof body.noteCount === "number" ? Math.max(0, Math.floor(body.noteCount)) : 0,
      });
      return NextResponse.json({ meta });
    }
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const checked = await guard(request, context);
  if (checked instanceof NextResponse) return checked;
  try {
    await deleteCloudDossier(checked.owner, checked.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
