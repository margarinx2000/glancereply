// Backend client for GlanceReply.
//
// The glasses app never talks to Telegram or an LLM directly: API keys stay
// on our own server (see server/server.mjs), and this base URL must be listed
// in app.json under the network permission whitelist.

export const BACKEND_URL = 'http://localhost:8787'

export interface IncomingMessage {
  id: string
  from: string
  text: string
  at: number
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`backend ${res.status}`)
  return (await res.json()) as T
}

/** Start pairing: returns a short code the user sends to the bot. */
export function pairStart(): Promise<{ code: string }> {
  return req('/pair/start', { method: 'POST', body: '{}' })
}

/** Poll pairing state. Resolves with a session token once paired. */
export function pairStatus(code: string): Promise<{ paired: boolean; token?: string }> {
  return req(`/pair/status?code=${encodeURIComponent(code)}`)
}

export function listMessages(token: string): Promise<{ messages: IncomingMessage[] }> {
  return req(`/messages?token=${encodeURIComponent(token)}`)
}

/** Ask the backend's AI to draft replies to a message (2 variants). */
export function draftReplies(
  token: string,
  messageId: string,
): Promise<{ drafts: string[] }> {
  return req('/draft', {
    method: 'POST',
    body: JSON.stringify({ token, messageId }),
  })
}

/** Send the approved draft back through the Telegram bot. */
export function sendReply(
  token: string,
  messageId: string,
  text: string,
): Promise<{ ok: boolean }> {
  return req('/send', {
    method: 'POST',
    body: JSON.stringify({ token, messageId, text }),
  })
}

/** One-screen AI digest of everything unread. */
export function digest(token: string): Promise<{ digest: string }> {
  return req(`/digest?token=${encodeURIComponent(token)}`)
}
