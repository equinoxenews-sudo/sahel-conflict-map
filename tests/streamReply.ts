// Réponse simulée de l'API Messages en streaming (« stream": true ») : le texte arrive en un
// seul morceau, entouré des événements habituels (ping compris).
export function streamReply(
  text: string,
  { stopReason = "end_turn", inputTokens = 1200, outputTokens = 300, headers = {} }:
    { stopReason?: string; inputTokens?: number; outputTokens?: number; headers?: Record<string, string> } = {},
): Response {
  const events = [
    { type: "message_start", message: { usage: { input_tokens: inputTokens, output_tokens: 1 } } },
    { type: "ping" },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: stopReason }, usage: { output_tokens: outputTokens } },
    { type: "message_stop" },
  ];
  return new Response(events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream", ...headers },
  });
}
