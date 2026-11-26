# Even Realities "Heads Up" Hackathon — RECON + FEASIBILITY

Checked 25 Nov 2026 (~16:00 WIB) against official sources:
- DoraHacks event page: https://dorahacks.io/hackathon/even-realities/detail
- Even Hub docs: https://hub.evenrealities.com/docs/get-started/quickstart/first-app and /docs/test/simulator
- Even Realities LinkedIn announcement ("No Hardware Required")

## VERDICT: FEASIBLE — YES. No glasses needed.

The DoraHacks page states it verbatim: **"No glasses needed: build and test in the free Even Hub simulator."**
Even Realities' own announcement repeats it: "No Hardware Required: Build and test your app seamlessly inside Even Hub's simulator." The demo video may run **in the simulator** — hardware is never required at any stage (build, demo, judging, Demo Day — finalists may demo remotely).

---

## 1. What exactly must be built

An **Even Hub app**: a plain web app (HTML/CSS/JavaScript or TypeScript) that runs in a WebView inside the Even Realities phone app and renders to the G2 glasses through the **Even Hub SDK**. It is not a native/mobile app.

- **Stack:** Vite + TypeScript. npm package `@evenrealities/even_hub_sdk` (manifest `min_sdk_version` 0.0.12, manifest `edition` "202601").
- **Tooling (all free, npm):** `@evenrealities/evenhub-cli` (`evenhub init` creates the manifest, `evenhub qr` for hardware sideload, packaging to `.ehpk`) and `@evenrealities/evenhub-simulator` (desktop app, Node + LVGL, macOS/Linux/Windows; renders the 576×288 canvas, injects click/double-click/list events, exports PNG screenshots — handy for the README/demo).
- **The app model:** the only Even-specific file is `app.json` (manifest: `package_id`, name, version, edition, entrypoint, permissions). UI is built from SDK "containers" (text/list/image) placed on a **576×288 monochrome-green canvas per eye**; `waitForEvenAppBridge()` → `createStartUpPageContainer(...)` renders, `textContainerUpgrade(...)` updates, `onEvenHubEvent(...)` is the single input subscription (temple tap = click, double-tap = exit dialog via `shutDownPageContainer(1)`, list selections, R1 ring, mic audio events).
- **Platform limits that shape the design (official "Know the limits" list):**
  - One app on screen at a time; no background alerts, no access to other apps' notifications — the app must talk to each service **directly through its own API**.
  - No camera, no speaker on the glasses. Microphone gives **raw audio only** — speech-to-text is BYO (e.g. send audio to your own Whisper server).
  - External calls must be **whitelisted in `app.json`** and pass CORS; route API calls through your own backend and **never ship API keys in the app**.
  - Google sign-in does not work inside the WebView — use a separate login page or a **pairing code**.
- **An entry consists of (submit on the DoraHacks page):**
  1. Public GitHub/GitLab repo with a README explaining setup (declare anything that existed before 23 Nov).
  2. Demo video, **≤ 3 minutes**, running in the simulator or on G2.
  3. Short description: problem, who it is for, how it works, the track.
  4. Up to 5 feature requests for the APIs used (passed to the API teams).
  5. Optional: packaged `.ehpk` build.
- **Rules:** teams of 1–4, worldwide, one team only; build during the hackathon (OSS libraries/existing APIs allowed); **use only the apps listed in the tracks you enter**; money safety — demos on testnet / paper trading / read-only data, do not hold user funds, no financial advice, never commit secrets.

## 2. Hardware question — settled

**No physical G2 is required for anything.** Build, test, demo video, and judging all work in the free simulator; Demo Day finalists may present remotely. (Practical caveat for our VM: the simulator is a desktop GUI window. On a headless box it needs a virtual display or its `--automation-port` headless control plane; the app itself is a normal Vite web app, so UI logic can also be exercised in a browser during development. This is an engineering detail, not an eligibility blocker.)

## 3. Submission route, deadline, judging, tracks

- **Route:** register + submit on DoraHacks (https://dorahacks.io/hackathon/even-realities/detail). Registration opened 18 Nov; build week 23–29 Nov.
- **Deadline: Sun 29 Nov 2026, 23:59 Dubai time (GMT+4) = 19:59 UTC = Mon 30 Nov 02:59 WIB.** Judging 30 Nov – 1 Dec; Demo Day Thu 3 Dec 14:00–18:00 Dubai time, Daos Hub, remote demo allowed for finalists.
- **Prizes (official table — note: track 2nd is $375, not the $500 in early listings):** Grand Prize $2,000 (+2 pairs G2); each of 4 tracks: 1st $1,250 (+1–2 pairs G2), 2nd $375; Best Telegram integration $1,000; Community Partner Award up to $500. **One cash prize per project** (highest if it places in several). $10,000 USDT total, paid within 7 days of Demo Day; G2s are refurbished units shipped worldwide. Field per screening: ~469 participants, ~42 projects — very thin for 10 cash prizes.
- **Judging criteria:** Usefulness on G2 **25%** · Read-and-write (act fast: short phrase, one tap, AI drafts instead of long dictation) **20%** · Technical execution **20%** (must work end-to-end on **real accounts and data, not mocks**) · UX for display & voice **15%** · Business potential & safety **20%**.

### Tracks (pick 1 main; up to 2 if the app genuinely spans them; special prize open to all)
1. **Messaging & News** — Telegram · Discord · Slack. Organizers' own examples: see messages only from chats you pick; digest of followed Telegram channels; **"reply by voice, or approve a reply drafted by an AI agent."**
2. **Crypto & DeFi** — Gram Wallet · Polymarket · Hyperliquid · Trust Wallet. Balances/odds/positions; testnet bet by voice + one-tap confirm.
3. **Exchanges & Stocks** — Binance · OKX · Bybit · Coinbase · Interactive Brokers. PnL/positions/alerts; confirm quick actions ("Move $500 spot→margin? Yes/No").
4. **AI Assistants & Work** — Claude · ChatGPT · OpenRouter · Notion · Google Workspace. Meeting brief, "inbox in 30 seconds", reply/add task by voice.
- **Special: Best Telegram integration ($1,000)** — any track; best use of Telegram (accounts, bots, channels, Mini Apps) on G2.

**Best fit for a solo builder with web/AI skills: Track 1 (Messaging & News), entered also in Track 4 (AI Assistants & Work).** A Telegram app whose replies are drafted by an AI model (Claude/OpenRouter are Track-4-listed apps) genuinely spans both tracks, and is simultaneously a Best Telegram integration candidate — three prize shots, one build. Telegram's Bot API is free, needs no OAuth-in-WebView (pairing code is the organizers' suggested pattern), and gives *real data* for the technical-execution criterion. Track 3 (exchanges) is viable via Binance read-only/testnet but is the most crowded theme in a crypto-organized event; Track 2 overlaps Mantri's escrow skills least (prediction-market odds display is mostly read-only display work).

---

## 4. Entry concept — **GlanceReply**

**One-liner:** Your Telegram inbox on your glasses — read a message at a glance, tap once to get an AI-drafted reply, tap again to send it. Phone never leaves your pocket.

**How it works**
1. **Pairing (30 seconds, once):** the glasses show a 6-digit code; the user sends `/pair <code>` to the GlanceReply Telegram bot. Backend links the code to that Telegram chat/user. (Exactly the pairing-code pattern the organizers prescribe for WebView apps.)
2. **Glance:** the app shows the latest incoming messages (sender + one line) as a list on the 576×288 canvas. Tap to open one — full text, wrapped for the small display.
3. **Read-and-write:** on a message, tap **"Draft"** → the backend asks an LLM (OpenRouter free model / Claude) for a reply in the user's tone, with 2 variants; the glasses show the draft; tap cycles variants, tap-and-confirm **sends it via the Telegram Bot API**. Voice reply is a stretch goal (mic audio → backend Whisper), deliberately out of the core path.
4. **Digest mode:** one tap on "Digest" → AI one-screen summary of everything unread ("3 messages: landlord — rent receipt; group — meeting moved to 15:00; …").

**Why it can win in this field**
- It is the hackathon's own headline scenario ("Read a new Telegram message…", "approve a reply drafted by an AI agent") executed end-to-end on **real Telegram data** — the 20% technical-execution criterion explicitly punishes mocks.
- Read-and-write (20%) is the core loop: glance → draft → one tap. Nothing to type, nothing long to read.
- Usefulness (25%): Telegram is the daily driver for the crypto/work crowd judging this event; hands-free triage while walking/cooking/driving is a real moment.
- Safety/business (20%): the bot only ever sees chats it is added to / messages sent to it; keys live server-side; nothing financial moves. Clear launch path: ship in Even Hub as a free companion + the same backend serves a future Mini App.
- Thin field: ~42 projects for 10 cash prizes + Grand; a complete, real-data, two-track entry is well above the median hackathon submission.

**Architecture**
- `src/` — Vite + TS Even Hub app (this scaffold): screens = Inbox list → Message detail → Draft review → Sent confirm; renders via text containers, all state in one small store; talks only to our backend (whitelisted in `app.json`).
- `server/` — dependency-free Node backend: Telegram Bot API long-polling (no public webhook needed), pairing codes, message store (in-memory + JSON file), `/messages`, `/draft` (LLM call), `/send` endpoints. Tokens only in server `.env` (gitignored).
- Demo: run backend + Vite dev server, point `evenhub-simulator` at it, drive a real conversation from a second Telegram account; record ≤3 min.

**Build plan by day (deadline Mon 30 Nov 02:59 WIB — submit target Sat 29 Nov 20:00 WIB)**
- **Day 0 — Wed 25 Nov (evening):** tooling installed (`evenhub-cli`, simulator), scaffold renders hello-world + tap event in the simulator; BotFather bot created (needs Mantri's Telegram — his phone step); backend skeleton polling the bot.
- **Day 1 — Thu 26 Nov:** pairing flow + inbox list + message detail on the glasses UI; real messages flowing end-to-end.
- **Day 2 — Fri 27 Nov:** AI draft (2 variants) + approve/send; digest mode; error/empty states; tone setting (formal/casual) stored per user.
- **Day 3 — Sat 28 Nov:** UX polish for 576×288 (short lines, big tap targets), README with setup + simulator screenshots, `.ehpk` pack, record the ≤3-min demo video.
- **Day 4 — Sun 29 Nov:** buffer, final checks, **submit on DoraHacks by 20:00 WIB** (6+ hours before the 02:59 WIB cutoff).

**Risks / honest notes**
- Simulator GUI on a headless VM — mitigate via virtual display or the simulator's automation port; worst case, develop against the Vite page + bridge mock and record the demo from a machine with a display. Flag early on Day 0.
- LLM cost: use an OpenRouter free-tier model for drafts; the demo needs only a handful of calls.
- Telegram Bot API only receives messages sent to the bot or in groups where the bot is a member (privacy mode) — the demo and the product story are framed around that (bot as your messaging proxy/assistant), which is also the honest privacy story for judging.

---

## Scaffold status (25 Nov 2026)
Repo scaffolded in this directory: Vite + TS app (`src/main.ts` screen state machine, `src/backend.ts` client), dependency-free Node backend (`server/server.mjs`: pairing, Telegram long-polling, LLM draft, send), `app.json` manifest, README with hackathon declaration. Dependencies installed and verified: `@evenrealities/even_hub_sdk@0.0.16`, `tsc --noEmit` passes clean. Remaining Day-0 steps: install the global CLI + simulator, create the Telegram bot via @BotFather (Mantri's Telegram), fill `server/.env`, first simulator run.
