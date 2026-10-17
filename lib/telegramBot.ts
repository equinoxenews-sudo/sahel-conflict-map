// Bot Telegram d'ÉQUINOXE (le même que les alertes du HQ) : comptes rendus des
// analystes à Nicolas et boutons de décision. Variables serveur uniquement :
// TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (la conversation de Nicolas) et
// TELEGRAM_WEBHOOK_SECRET (contrôle des réponses reçues, app/api/telegram/webhook).

export interface InlineButton {
  text: string;
  callback_data: string;
}

function token(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function telegramChatId(): string | null {
  return process.env.TELEGRAM_CHAT_ID?.trim() || null;
}

export function telegramConfigured(): boolean {
  return Boolean(token() && telegramChatId());
}

async function call<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const t = token();
  if (!t) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
    // Jamais le jeton dans les journaux : seulement la méthode et la raison.
    if (!data.ok) console.error(`Telegram ${method} refusé : ${data.description ?? res.status}`);
    return data.ok ? (data.result ?? null) : null;
  } catch (err) {
    console.error(`Telegram ${method} impossible :`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Envoie un message à Nicolas ; renvoie son identifiant (pour le modifier après décision). */
export async function sendToNicolas(text: string, buttons?: InlineButton[][]): Promise<number | null> {
  const chat = telegramChatId();
  if (!chat) return null;
  const result = await call<{ message_id: number }>("sendMessage", {
    chat_id: chat,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
  return result?.message_id ?? null;
}

export async function answerCallback(callbackId: string, text: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: callbackId, text: text.slice(0, 190) });
}

/** Remplace le texte d'un message et retire ses boutons (décision prise). */
export async function closeMessage(messageId: number, text: string): Promise<void> {
  const chat = telegramChatId();
  if (!chat) return;
  await call("editMessageText", { chat_id: chat, message_id: messageId, text: text.slice(0, 4000), disable_web_page_preview: true });
}
