# DoraHacks submission package — GlanceReply (prepared 26 Nov 2026)

Event: Even Realities "Heads Up" Hackathon — https://dorahacks.io/hackathon/even-realities/detail
Deadline: Mon 30 Nov 02:59 WIB · Submit target: Sat 29 Nov 20:00 WIB

## Form fields (paste-ready)

- **Project name:** GlanceReply
- **Tagline:** Your Telegram inbox on Even G2 glasses — glance at a message, tap once for an AI-drafted reply, tap again to send it. The phone never leaves your pocket.
- **Tracks:** Messaging & News (main) + AI Assistants & Work (second). Also eligible for the **Best Telegram integration** special prize (open to all tracks).
- **Description:**
  Problem: Telegram is where work and community life happens, but every message pulls the phone out of your pocket. On G2 glasses you can *see* notifications, yet replying still means typing on a phone.
  Who it's for: anyone whose day runs on Telegram — traders, community managers, small sellers, field workers — who needs hands-free triage.
  How it works: (1) Pair once in 30 s — the glasses show a 6-digit code, you send `/pair <code>` to the GlanceReply Telegram bot (the pairing-code pattern the Even Hub docs recommend, since OAuth doesn't work in the WebView). (2) New messages arrive on the 576×288 display as sender + one line; tap walks the list, the last tap opens the message. (3) Tap **Draft** — the backend asks an LLM for two short reply variants; tap cycles variants, double-tap **sends** through the Telegram Bot API. (4) Long-press for a one-screen **digest** of everything unread.
  Architecture: the glasses app (Vite + TypeScript, Even Hub SDK) talks only to our own dependency-free Node backend. The backend long-polls the Telegram Bot API, holds all secrets server-side, drafts replies, and sends approved ones. No keys ever ship inside the app. Everything runs in the free Even Hub simulator — no G2 hardware needed.
  Real data, not mocks: the demo runs against the live bot @GlanceReply25Bot and a real paired Telegram account; the message opened, drafted and answered on screen is a real message received by the bot.
  Honest note: in the current build the drafting endpoint falls back to two clearly-marked local placeholder drafts when no LLM key is configured; setting `OPENROUTER_API_KEY` switches to live OpenRouter drafts with no code change.
- **Repo:** ✅ READY LOCALLY (26 Nov) — all work committed, secrets verified excluded (bot token lives only in gitignored `bot.env` / `server/.env`). Still needs the push to a public GitHub repo (parent routes it via the signed-in browser) before submitting (entry requirement #1).
- **Demo video:** ✅ RECORDED (26 Nov) — `demo-video.mp4`, 43.5 s, 1280×720, captioned slideshow of the REAL live-drive frames (pair → inbox → open → drafts → send). Under the 3-min cap; if the DoraHacks form requires a hosted URL, a YouTube upload is still needed (runbook step 9).
- **Packaged build:** `glancereply-0.1.0.ehpk` (already produced by `evenhub pack`, 25 Nov).
- **Feature requests for the API teams (max 5):**
  1. Even Hub SDK: a persistent key-value store for WebView apps, so pairing tokens survive app restarts (today the app must re-pair every launch).
  2. Even Hub SDK: a documented, stable gesture event shape — gestures currently arrive via different fields (textEvent vs sysEvent) depending on host/SDK version.
  3. Simulator: keep the page container alive across Vite HMR reloads, or expose a one-call container reset in the automation API.
  4. Even Hub: background/push wake for messaging apps — an inbox app is only useful if new messages can surface while another app is in front.
  5. Telegram Bot API: a first-class "assistant inbox" scope so a bot can relay a user's chosen chats without being added to each group.

## Runbook — remaining steps, in order

1. **Mantri's explicit go-ahead to execute this project's code** (security hold — see report). Then:
2. Restart the stack: `npm run server` (port 8787; expect "Telegram bot verified: @GlanceReply25Bot"), Vite dev on 5173, simulator under Xvfb with `--automation-port 9898`.
3. Verify the live paired inbox loads: token for chat 7483295266 → `/messages` returns the real message "Live test — invoice for 2 kg of Gayo coffee beans, Rp 500.000, please confirm delivery tomorrow."
4. **Mantri phone step (10 s):** the app always boots to the pair screen with a fresh code — he sends `/pair <code on screen>` to @GlanceReply25Bot from his Telegram. (Pairing itself is already proven live on 25 Nov; this just binds the new session.)
5. SEND drive in the simulator: inbox → open the coffee-invoice message → tap Draft → cycle drafts → double-tap SEND → confirm the reply arrives in Mantri's Telegram from the bot and the message leaves the inbox. Capture automation-API frames at each step into `evidence/`.
6. Fix any defect the drive exposes (known polish items: long digests push the footer past the fold; no "back" from the draft screen if a send keeps failing).
7. Record the demo video (≤3 min): pairing → inbox glance → digest (long-press) → open message → drafts → send. Route A: screen-capture the simulator window under Xvfb. Route B (fallback): automation-API screenshot sequence → ffmpeg slideshow with captions. Either way it is the real flow, real data.
8. Push the repo public on GitHub (margarinx2000) with README + evidence frames.
9. Submit on DoraHacks with the fields above + video. If the form requires a hosted video URL, upload the video to YouTube (Mantri's channel) first — that upload is a separate, explicit step.
