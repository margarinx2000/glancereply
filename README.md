# GlanceReply

**Your Telegram inbox on Even G2 glasses.** Read a message at a glance, tap once
to get an AI-drafted reply, tap again to send it — the phone never leaves
your pocket.

Built for the **Even Realities "Heads Up" Hackathon** (TVM Ventures × Daos Hub),
tracks **Messaging & News** + **AI Assistants & Work**, and the **Best Telegram
integration** special prize.

## How it works

1. **Pair once (30 s):** the glasses show a 6-digit code; send `/pair <code>`
   to the GlanceReply Telegram bot. (Pairing code — the pattern the Even Hub
   docs recommend, since OAuth doesn't work inside the WebView.)
2. **Glance:** new messages arrive as a short list on the 576×288 display —
   sender + one line. Tap walks the list; the last tap opens the message.
3. **Read & write:** on a message, tap **Draft** — the backend asks an LLM
   (OpenRouter) for two short reply variants in your voice. Tap cycles
   variants, double-tap **sends** through the Telegram Bot API.
4. **Digest:** one screen summarising everything unread.

Architecture: the glasses app (Vite + TypeScript, `@evenrealities/even_hub_sdk`)
talks only to our own small backend (`server/server.mjs`, dependency-free
Node). The backend long-polls the Telegram Bot API, holds all secrets, calls
the LLM, and sends approved replies. No keys ever ship inside the app.

## Status (26 Nov 2026)

**Working end-to-end** (simulator + real backend + real bot; frames in
[`evidence/`](evidence/README.md)):

- Pair screen → tap → **Inbox** → **Digest** (long-press) → **Detail** →
  **Draft 1/2 → 2/2** → SEND, plus the root double-tap shutdown
  (`shutDownPageContainer(1)`).
- Backend wired to the real bot **@GlanceReply25Bot** (getMe-verified):
  `/start` welcome, `/pair <code>` linking with fresh/used/unknown-code
  replies, long-polling into the inbox, `/messages`, `/digest`, and `/send`
  through the Bot API — which now checks Telegram's response and keeps the
  message (502) instead of silently dropping it when a send fails.
- `npm run build` passes; `evenhub pack` produces `glancereply-0.1.0.ehpk`.

**Stubbed / missing, honestly:**

- **AI drafts are a local fallback.** No LLM key is configured, so `/draft`
  returns two static placeholder replies (clearly marked in code and in the
  server log). Setting `OPENROUTER_API_KEY` in `server/.env` switches to
  real OpenRouter drafts — no code change needed.
- **The live Telegram loop is now verified end-to-end (26 Nov 2026).** A
  real Telegram user paired from their phone (`/pair` → bot's "paired ✓"),
  a real message they sent the bot appeared in the glasses inbox, and the
  full glasses flow — open → AI draft → cycle → double-tap SEND — delivered
  the reply into their Telegram chat and cleared the inbox. Frames:
  `evidence/live-*.png`; the run is documented at the top of
  [`evidence/README.md`](evidence/README.md). Demo video: `demo-video.mp4`
  (43 s, captioned slideshow of the real live-drive frames).
- Known polish items: long digests push the footer past the fold; the draft
  screen has no "back" if a send keeps failing; after a Vite HMR reload the
  simulator keeps the old page container (`createStartUpPageContainer`
  returns 1) — restart the simulator instead of relying on HMR.

## Setup

The Even Hub CLI and simulator are **devDependencies** of this repo (no
global install needed). On Linux the simulator also needs WebKitGTK:
`sudo apt install libwebkit2gtk-4.1-0`, plus a display or Xvfb.

```bash
npm install

# backend: the bot already exists (@GlanceReply25Bot); its token lives in
# server/.env (gitignored) — see server/.env.example for the shape.
npm run server                       # http://localhost:8787

# glasses app + simulator (two terminals)
npm run dev                          # http://localhost:5173
npx evenhub-simulator http://localhost:5173
# headless: add --automation-port 9898 and drive /api/input + /api/screenshot/glasses
```

No G2 hardware is needed: everything runs in the free Even Hub simulator.
To package: `npx evenhub pack app.json dist` produces an `.ehpk`.

## Hackathon declaration

Everything in this repo was written during the hackathon build week
(starting 25 Nov 2026). Pre-existing components are open-source libraries
and public APIs only: the Even Hub SDK, Vite, the Telegram Bot API and
OpenRouter. No project code predates the event.

## Layout

```
src/main.ts       glasses UI state machine (pair → inbox → detail → draft)
src/backend.ts    typed client for our backend
server/server.mjs pairing, Telegram polling, AI drafting, sending
app.json          Even Hub manifest (network whitelist = our backend)
```
