// GlanceReply backend — dependency-free Node server.
//
// Jobs:
//   1. Long-poll the Telegram Bot API; store messages sent to the bot.
//   2. Pairing: the glasses app asks for a code, the user sends
//      "/pair <code>" to the bot, we link that Telegram chat to a token.
//   3. Drafting: ask an LLM (OpenRouter) for 2 short reply variants.
//   4. Sending: post the approved draft back through the bot.
//
// All secrets live here (server/.env), never in the glasses app.
// Run:  cp server/.env.example server/.env  (fill tokens)  &&  npm run server

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomUUID, randomInt } from 'node:crypto'

// --- tiny .env loader -----------------------------------------------------
if (existsSync(new URL('./.env', import.meta.url))) {
  for (const line of readFileSync(new URL('./.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const PORT = Number(process.env.PORT || 8787)
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const LLM_KEY = process.env.OPENROUTER_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || 'meta-llama/llama-3.3-70b-instruct:free'

if (!TG_TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN missing — create a bot with @BotFather, put the token in server/.env')
  process.exit(1)
}

// --- state (persisted to server/data.json) --------------------------------
const DATA_FILE = new URL('./data.json', import.meta.url)
let db = { pairs: {}, tokens: {}, messages: [], offset: 0 }
if (existsSync(DATA_FILE)) {
  try { db = JSON.parse(readFileSync(DATA_FILE, 'utf8')) } catch { /* start fresh */ }
}
const save = () => writeFileSync(DATA_FILE, JSON.stringify(db, null, 2))

const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  }).then((r) => r.json())

// --- Telegram long-poll loop ----------------------------------------------
async function handleMessage(msg) {
  const chatId = String(msg.chat.id)
  const text = msg.text

  if (text === '/start' || text.startsWith('/start ')) {
    await tg('sendMessage', {
      chat_id: chatId,
      text:
        'Welcome to GlanceReply 👋\n\n' +
        'I relay messages to your Even G2 glasses and send back the replies you approve there.\n\n' +
        'To pair: open GlanceReply on the glasses, then send me /pair <the 6-digit code shown>.\n' +
        'After pairing, just send messages here and they will appear on the glasses.',
    })
    return
  }

  const pairCmd = text.match(/^\/pair\s+(\d{6})/)
  if (pairCmd || text.startsWith('/pair')) {
    const code = pairCmd?.[1]
    const pair = code ? db.pairs[code] : undefined
    if (pair && !pair.chatId) {
      const token = randomUUID()
      db.pairs[code] = { chatId, token }
      db.tokens[token] = chatId
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'GlanceReply paired ✓ New messages you send me will appear on the glasses.',
      })
    } else if (pair?.chatId) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'That code was already used. Open GlanceReply on the glasses to get a fresh one.',
      })
    } else {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'That pairing code was not recognised (codes expire when the app restarts). Open GlanceReply on the glasses and send the code shown there: /pair <code>',
      })
    }
    save()
    return
  }

  if (text.startsWith('/')) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: 'Commands: /pair <code> to link your glasses. Anything else you send me appears on the glasses as a message.',
    })
    return
  }

  // Plain text = a message for the glasses inbox.
  db.messages.push({
    id: String(msg.message_id) + ':' + chatId,
    chatId,
    from: msg.from?.first_name || 'Telegram',
    text,
    at: Date.now(),
  })
  if (db.messages.length > 200) db.messages = db.messages.slice(-200)
  save()
}

async function poll() {
  // Advertise the command menu (idempotent).
  try {
    await tg('setMyCommands', {
      commands: [
        { command: 'start', description: 'What GlanceReply does' },
        { command: 'pair', description: 'Pair your glasses: /pair <code>' },
      ],
    })
  } catch { /* non-fatal */ }
  for (;;) {
    try {
      const res = await tg('getUpdates', { offset: db.offset, timeout: 25 })
      for (const upd of res.result || []) {
        db.offset = upd.update_id + 1
        const msg = upd.message
        if (!msg?.text) continue
        await handleMessage(msg)
        save()
      }
    } catch (e) {
      console.error('poll error', e.message)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

// --- LLM drafting -----------------------------------------------------------
async function draftWithLLM(message) {
  if (!LLM_KEY) {
    // LOCAL FALLBACK — no LLM key configured (OPENROUTER_API_KEY empty).
    // These are static placeholder drafts, NOT AI-generated. They exist so
    // the pair → inbox → draft → send flow can be exercised end-to-end
    // before a key is provisioned. Set OPENROUTER_API_KEY in server/.env
    // to switch to real AI drafts (see draftWithLLM's fetch path below).
    console.log('[draft] OPENROUTER_API_KEY not set — returning LOCAL FALLBACK drafts')
    return [
      'Thanks! Got it — will reply in detail shortly.',
      'Sounds good to me. Let’s go with that.',
    ]
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${LLM_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You draft short Telegram replies. Return exactly 2 variants, one per line, each under 160 characters, friendly and natural. No numbering, no quotes.',
        },
        { role: 'user', content: `Reply to this message from ${message.from}: "${message.text}"` },
      ],
    }),
  })
  const json = await res.json()
  const text = json.choices?.[0]?.message?.content || ''
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2)
  return lines.length ? lines : ['Thanks! Got it.', 'Okay, noted — thanks!']
}

// --- HTTP API for the glasses app -------------------------------------------
function json(res, code, obj) {
  res.writeHead(code, {
    'content-type': 'application/json',
    // The glasses app runs in a WebView on a different origin (Vite :5173 in
    // dev, the Even app host in production) — no CORS headers, no fetch.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  })
  res.end(JSON.stringify(obj))
}

const readBody = (rq) =>
  new Promise((resolve) => {
    let d = ''
    rq.on('data', (c) => (d += c))
    rq.on('end', () => resolve(d ? JSON.parse(d) : {}))
  })

const server = createServer(async (rq, res) => {
  const url = new URL(rq.url, `http://localhost:${PORT}`)
  try {
    if (rq.method === 'OPTIONS') return json(res, 204, {})
    if (rq.method === 'POST' && url.pathname === '/pair/start') {
      const code = String(randomInt(100000, 999999))
      db.pairs[code] = {}
      save()
      return json(res, 200, { code })
    }
    if (rq.method === 'GET' && url.pathname === '/pair/status') {
      const pair = db.pairs[url.searchParams.get('code')]
      if (pair?.token) return json(res, 200, { paired: true, token: pair.token })
      return json(res, 200, { paired: false })
    }
    // Read the body exactly once (POST only) — a second read never resolves.
    const body = rq.method === 'POST' ? await readBody(rq) : {}
    const token = url.searchParams.get('token') || body.token
    const chatId = db.tokens[token]
    if (!chatId) {
      return json(res, 401, { error: 'unknown token' })
    }
    if (rq.method === 'GET' && url.pathname === '/messages') {
      const messages = db.messages
        .filter((m) => m.chatId === chatId)
        .slice(-10)
        .reverse()
      return json(res, 200, { messages })
    }
    if (rq.method === 'POST' && url.pathname === '/draft') {
      const message = db.messages.find((m) => m.id === body.messageId)
      if (!message) return json(res, 404, { error: 'message not found' })
      return json(res, 200, { drafts: await draftWithLLM(message) })
    }
    if (rq.method === 'POST' && url.pathname === '/send') {
      const message = db.messages.find((m) => m.id === body.messageId)
      if (!message) return json(res, 404, { error: 'message not found' })
      const tgRes = await tg('sendMessage', { chat_id: message.chatId, text: body.text })
      if (!tgRes.ok) {
        // Telegram rejected the send — keep the message in the inbox and
        // tell the app, instead of silently dropping it.
        return json(res, 502, { error: `telegram send failed: ${tgRes.description || 'unknown error'}` })
      }
      db.messages = db.messages.filter((m) => m.id !== body.messageId)
      save()
      return json(res, 200, { ok: true })
    }
    if (rq.method === 'GET' && url.pathname === '/digest') {
      const mine = db.messages.filter((m) => m.chatId === chatId).slice(-10)
      if (!mine.length) return json(res, 200, { digest: 'Nothing unread.' })
      const digest = mine.map((m) => `${m.from}: ${m.text.slice(0, 60)}`).join(' · ')
      return json(res, 200, { digest })
    }
    return json(res, 404, { error: 'not found' })
  } catch (e) {
    return json(res, 500, { error: e.message })
  }
})

server.listen(PORT, async () => {
  console.log(`GlanceReply backend on http://localhost:${PORT}`)
  try {
    const me = await tg('getMe')
    console.log(`Telegram bot verified: @${me.result.username} (id ${me.result.id})`)
  } catch (e) {
    console.error('Telegram getMe failed:', e.message)
  }
})
void poll()
