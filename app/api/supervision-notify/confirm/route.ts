import { confirmRecipient } from "@/lib/supervision/notify/store";
import { notifyTokenSecret, verifyConfirmToken } from "@/lib/supervision/notify/token";

// Lien de confirmation d'une adresse e-mail, ouvert depuis la boîte de réception (sans session : le jeton signé fait foi). Le jeton
// porte la Supervision, l'adresse et une expiration, signés avec un secret du serveur ; la base ne confirme que si l'adresse est
// ENCORE celle des préférences. Les réponses restent volontairement génériques : rien n'indique si une Supervision existe.
function page(title: string, message: string, status: number): Response {
  const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head><body style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;color:#14202b"><h1 style="font-size:20px">${esc(title)}</h1><p style="line-height:1.5">${esc(message)}</p></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" } });
}

export async function GET(request: Request) {
  const secret = notifyTokenSecret();
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const check = verifyConfirmToken(token, secret);
  if (!check.ok) {
    return check.reason === "expired"
      ? page("Lien expiré", "Ce lien de confirmation n'est plus valable. Demande-en un nouveau depuis les notifications de ta Supervision.", 410)
      : page("Lien invalide", "Ce lien de confirmation n'est pas valide.", 400);
  }
  try {
    const result = await confirmRecipient(check.supervisionId, check.email);
    if (!result.ok) return page("Lien sans effet", "Cette adresse n'est plus celle des notifications : demande un nouveau lien depuis ta Supervision.", 409);
    return page("Adresse confirmée", "Tu recevras désormais les notifications de cette Supervision à cette adresse. Tu peux fermer cette page.", 200);
  } catch {
    return page("Confirmation impossible", "Une erreur est survenue. Réessaie dans un instant.", 500);
  }
}
