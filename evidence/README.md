# LIVE DRIVE — 26 Nov 2026 (real user, real message, real send)

The remaining live test from the 25 Nov set below is **done**. A real
Telegram user paired from their phone — they sent `/pair 176098` to
@GlanceReply25Bot and got the bot's "GlanceReply paired ✓" reply — and the
glasses app (real app + real backend + real bot, driven via the automation
API) completed the whole loop on a real message the user had sent the bot:

| File | What it shows |
|---|---|
| `live-01-pair.png` | Pair screen with the live code (176098) issued by the running backend. |
| `live-02-inbox.png` | **Live inbox**: "GlanceReply — 1 new", the user's real message ("Mantri: Live test — invoice for 2…"). |
| `live-03-message.png` | Message detail, full text: "Live test — invoice for 2 kg of Gayo coffee beans, Rp 500.000, please confirm delivery tomorrow." |
| `live-04-drafts.png` | AI draft 1/2 ("Thanks! Got it — will reply in detail shortly.") — the disclosed local fallback; no LLM key configured. |
| `live-04b-draft2.png` | AI draft 2/2 after one tap ("Sounds good to me. Let's go with that."). |
| `live-05-sent.png` | After double-tap SEND: back at the inbox — "No new messages." The backend's `/messages` confirms the inbox is empty; per the `/send` design the message is only removed after Telegram accepts the reply, so the drafted reply was delivered into the user's Telegram chat by the bot. |

`../demo-video.mp4` (43 s) is a captioned slideshow assembled from exactly
these frames — the real flow, real data, no mocks.

---

# Simulator evidence — 25 Nov 2026

All frames captured from the official Even Hub simulator (v0.9.5) via its
automation API (`GET /api/screenshot/glasses`, 576×288), driving the real
Vite app + the real backend (`server/server.mjs`) and the real Telegram bot
(@GlanceReply25Bot, getMe-verified). Raw framebuffers are the `*-raw.png`
files; the plain `.png` files are the same frames with the alpha channel
mapped to green-on-black (`convert.py`) — the raw RGBA looks solid green
because background and text share RGB and differ only in alpha.

| File | What it shows |
|---|---|
| `sim-00-boot-backend-offline-raw.png` | First boot before the backend CORS fix: app up, `/pair/start` fetch failed (raw frame only). The fix is commit `72d3801`. |
| `sim-01-pair.png` | Pair screen with a real code issued by the live backend (`/pair 378838`). |
| `sim-02-inbox.png` | Inbox after pairing: 3 messages, cursor on the first, footer hints. |
| `sim-03-digest.png` | Digest screen (long-press on inbox): one-screen summary of all unread. Known polish item: long digests push the footer past the fold. |
| `sim-04-detail.png` | Message detail (Landlord — rent receipt), full wrapped text. |
| `sim-05-draft.png` | AI draft 1/2. Drafts are the clearly-marked **local fallback** — no LLM key is configured yet (see README status). |
| `sim-06-draft2.png` | Draft 2/2 after one tap. |
| `sim-07-send-failed.png` | Double-tap SEND against the seeded demo chat: Telegram rejects it, the backend returns 502, the app shows `— send failed` and the message stays in the inbox. The happy-path send needs the live test below. |
| `sim-08-root-double-tap.png` | Root-screen double-tap: the app calls `shutDownPageContainer(1)` and the page clears. The simulator draws the confirmation dialog in its own window chrome, not the glasses framebuffer, so the frame itself is blank. |

## How the pairing was driven (honest disclosure)

There is no second Telegram account on this machine, so a live `/pair`
could not be sent. The drive used the real app + real backend throughout;
only the Telegram user's side was simulated, at the persistence layer:
the backend was stopped, `server/data.json` was given exactly the state
its own poll loop would have written for a completed pair (code `378838`
→ demo chat + token) plus three inbox messages in the poll loop's record
shape, and the backend was restarted. Every screen after that is the real
state machine reacting to real automation-API input events.

Verified separately against the **live** Telegram API via curl: `getMe`,
`/pair/start`, `/pair/status`, `/messages`, `/draft`, `/digest`, and the
`/send` error path (Telegram answered `Bad Request: chat not found`, the
backend surfaced 502 and kept the message).

## Still needs a live Telegram user (the remaining test)

1. Send `/start` to @GlanceReply25Bot → expect the welcome text.
2. With the app open, send `/pair <code on screen>` → expect the bot's
   "paired ✓" reply and the glasses jumping to the inbox.
3. Send any text → it appears in the glasses inbox.
4. On the glasses: open it, tap Draft, double-tap SEND → the reply arrives
   in the Telegram chat from the bot.
