import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { decideReview } from "@/lib/briefReviews";
import { answerCallback, closeMessage, sendToNicolas, telegramChatId } from "@/lib/telegramBot";

export const maxDuration = 30;

// Réponses de Nicolas au bot Telegram (boutons sous les comptes rendus des analystes).
// Telegram appelle cette adresse (webhook) avec l'en-tête secret convenu lors de
// l'enregistrement ; seuls les clics venant de la conversation de Nicolas sont pris
// en compte. Toujours répondre 200, sinon Telegram renvoie la même mise à jour.

interface Update {
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
    message?: { message_id: number; text?: string };
  };
  message?: { chat: { id: number }; text?: string };
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const nicolas = telegramChatId();
  const update = (await request.json().catch(() => ({}))) as Update;

  const cb = update.callback_query;
  if (cb) {
    if (!nicolas || String(cb.from.id) !== nicolas) {
      await answerCallback(cb.id, "Action réservée.");
      return NextResponse.json({ ok: true });
    }
    const m = /^rv:(pub|rej):(\d+)$/.exec(cb.data ?? "");
    if (!m) {
      await answerCallback(cb.id, "Action inconnue.");
      return NextResponse.json({ ok: true });
    }
    const publish = m[1] === "pub";
    const result = await decideReview(Number(m[2]), publish);
    await answerCallback(cb.id, result.message);
    const messageId = cb.message?.message_id ?? result.messageId;
    if (result.ok && messageId) {
      const before = cb.message?.text ?? `« ${result.title ?? ""} »`;
      await closeMessage(messageId, `${before}\n\n${publish ? "✅ Publié" : "🗑 Écarté"} par Nicolas`);
    }
    if (result.ok && publish) {
      revalidatePath("/");
      revalidatePath("/zones/[slug]/[tab]", "page");
    }
    return NextResponse.json({ ok: true });
  }

  // Message libre de Nicolas : le bot ne converse pas, il le rappelle simplement.
  if (update.message && nicolas && String(update.message.chat.id) === nicolas) {
    await sendToNicolas("Je ne réponds qu'aux boutons sous mes comptes rendus. Pour confier une mission, passe par le HQ.");
  }
  return NextResponse.json({ ok: true });
}
