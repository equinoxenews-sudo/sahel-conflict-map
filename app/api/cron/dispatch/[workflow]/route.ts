import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cronAuth";
import { dispatchPlan } from "@/lib/syncPasses";

export const maxDuration = 30;

// Réveil ponctuel des traitements du matin. Les planifications de GitHub Actions partent
// souvent avec 4 à 8 h de retard ; le cron de Vercel (vercel.json, ±59 min sur le plan
// Hobby) appelle cette route, qui demande à GitHub de lancer le workflow tout de suite
// (workflow_dispatch). Le traitement lui-même ne change pas : aucun appel IA ici.
// La planification GitHub reste en secours : un passage déjà lancé dans la journée
// la fait s'arrêter d'elle-même (étape « Déjà lancé aujourd'hui ? » des workflows).

// Noms acceptés et paramètres de chaque lancement : lib/syncPasses.ts (dont le passage léger de l'après-midi).
const REPO = process.env.GITHUB_REPOSITORY_SLUG?.trim() || "equinoxenews-sudo/sahel-conflict-map";

export async function GET(request: Request, { params }: { params: Promise<{ workflow: string }> }) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { workflow: name } = await params;
  const plan = dispatchPlan(name);
  if (!plan) {
    return NextResponse.json({ error: "Workflow inconnu" }, { status: 404 });
  }
  const { workflow } = plan;
  // Jeton GitHub à droits minimaux (ce dépôt, « Actions : lecture et écriture »), serveur uniquement.
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim();
  if (!token) {
    console.error("GITHUB_DISPATCH_TOKEN absent : la planification GitHub prendra le relais.");
    return NextResponse.json({ ok: false, error: "GITHUB_DISPATCH_TOKEN absent" }, { status: 500 });
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "equinoxe-cron",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(plan.inputs ? { ref: "main", inputs: plan.inputs } : { ref: "main" }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Ni le jeton ni la réponse complète dans les journaux : le code et un extrait suffisent.
    const detail = (await res.text()).slice(0, 200);
    console.error(`Lancement de ${workflow} refusé par GitHub (HTTP ${res.status}) : ${detail}`);
    return NextResponse.json({ ok: false, status: res.status }, { status: 502 });
  }
  return NextResponse.json({ ok: true, workflow });
}
