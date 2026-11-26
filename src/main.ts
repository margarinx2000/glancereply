// GlanceReply — Telegram inbox on Even G2 glasses.
//
// Read a message at a glance, approve an AI-drafted reply with one tap.
// Screens: PAIR -> INBOX -> DETAIL -> DRAFT -> (send) -> INBOX, plus DIGEST.
//
// Input model (kept deliberately tiny for a 576x288 glanceable display):
//   click        = next / confirm (advance cursor, or activate footer action)
//   double-click = back; on the root screen it opens the system exit dialog
//
// Rendering uses one full-canvas text container, updated via
// textContainerUpgrade — the flicker-free primitive from the Even Hub docs.

import {
  waitForEvenAppBridge,
  TextContainerProperty,
  TextContainerUpgrade,
  CreateStartUpPageContainer,
  OsEventTypeList,
} from '@evenrealities/even_hub_sdk'
import {
  pairStart,
  pairStatus,
  listMessages,
  draftReplies,
  sendReply,
  digest,
  type IncomingMessage,
} from './backend'

type Screen = 'pair' | 'inbox' | 'detail' | 'draft' | 'digest'

interface State {
  screen: Screen
  pairCode: string | null
  token: string | null
  messages: IncomingMessage[]
  cursor: number
  current: IncomingMessage | null
  drafts: string[]
  draftIdx: number
  digestText: string
  status: string
}

const state: State = {
  screen: 'pair',
  pairCode: null,
  token: null,
  messages: [],
  cursor: 0,
  current: null,
  drafts: [],
  draftIdx: 0,
  digestText: '',
  status: '',
}

const bridge = await waitForEvenAppBridge()

const mainText = new TextContainerProperty({
  xPosition: 0,
  yPosition: 0,
  width: 576,
  height: 288,
  borderWidth: 0,
  borderColor: 5,
  paddingLength: 6,
  containerID: 1,
  containerName: 'main',
  content: 'GlanceReply\n\nLoading…',
  isEventCapture: 1,
})

const created = await bridge.createStartUpPageContainer(
  new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [mainText],
  }),
)
if (created !== 0) console.error('createStartUpPageContainer failed:', created)

function render() {
  let body = ''
  switch (state.screen) {
    case 'pair':
      body =
        'GlanceReply — pair this app\n\n' +
        'Open Telegram, find the\nGlanceReply bot and send:\n\n' +
        `   /pair ${state.pairCode ?? '------'}\n\n` +
        'Waiting… tap to re-check.'
      break
    case 'inbox': {
      if (state.messages.length === 0) {
        body = 'GlanceReply — inbox\n\nNo new messages.\n\nTap: refresh · 2x tap: exit'
        break
      }
      const lines = state.messages
        .slice(0, 6)
        .map(
          (m, i) =>
            `${i === state.cursor ? '>' : ' '} ${truncate(m.from, 14)}: ${truncate(m.text, 26)}`,
        )
      body =
        `GlanceReply — ${state.messages.length} new\n\n` +
        lines.join('\n') +
        '\n\nTap: next / open last · Hold: digest'
      break
    }
    case 'detail':
      body =
        `From: ${state.current?.from ?? ''}\n\n` +
        `${wrap(state.current?.text ?? '', 34)}\n\n` +
        '[Tap: AI draft] · [2x tap: back]'
      break
    case 'draft':
      body =
        `AI draft ${state.draftIdx + 1}/${state.drafts.length}\n\n` +
        `${wrap(state.drafts[state.draftIdx] ?? '', 34)}\n\n` +
        '[Tap: next draft] · [2x tap: SEND]'
      break
    case 'digest':
      body = 'Digest\n\n' + wrap(state.digestText, 34) + '\n\n[2x tap: back]'
      break
  }
  if (state.status) body += `\n\n— ${state.status}`
  bridge.textContainerUpgrade(
    new TextContainerUpgrade({ containerID: 1, containerName: 'main', content: body }),
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function wrap(s: string, width: number): string {
  const words = s.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      lines.push(line.trim())
      line = w
    } else {
      line += ' ' + w
    }
  }
  if (line.trim()) lines.push(line.trim())
  return lines.slice(0, 8).join('\n')
}

// --- flows ---------------------------------------------------------------

async function bootPairing() {
  try {
    const { code } = await pairStart()
    state.pairCode = code
  } catch {
    state.status = 'backend offline — is server/ running?'
  }
  render()
}

async function checkPairing() {
  if (!state.pairCode) return bootPairing()
  try {
    const r = await pairStatus(state.pairCode)
    if (r.paired && r.token) {
      state.token = r.token
      state.screen = 'inbox'
      state.status = 'paired ✓'
      await refreshInbox()
      return
    }
    state.status = 'not paired yet'
  } catch {
    state.status = 'backend offline'
  }
  render()
}

async function refreshInbox() {
  if (!state.token) return
  try {
    const r = await listMessages(state.token)
    state.messages = r.messages
    state.cursor = Math.min(state.cursor, Math.max(0, r.messages.length - 1))
    state.status = ''
  } catch {
    state.status = 'could not load messages'
  }
  render()
}

async function openCurrent() {
  state.current = state.messages[state.cursor] ?? null
  if (!state.current) return
  state.screen = 'detail'
  render()
}

async function makeDrafts() {
  if (!state.token || !state.current) return
  state.status = 'drafting…'
  render()
  try {
    const r = await draftReplies(state.token, state.current.id)
    state.drafts = r.drafts
    state.draftIdx = 0
    state.screen = 'draft'
    state.status = ''
  } catch {
    state.status = 'draft failed — try again'
  }
  render()
}

async function sendCurrentDraft() {
  if (!state.token || !state.current) return
  const text = state.drafts[state.draftIdx]
  state.status = 'sending…'
  render()
  try {
    await sendReply(state.token, state.current.id, text)
    state.screen = 'inbox'
    state.status = 'sent ✓'
    await refreshInbox()
    return
  } catch {
    state.status = 'send failed'
  }
  render()
}

async function showDigest() {
  if (!state.token) return
  state.status = 'summarising…'
  render()
  try {
    const r = await digest(state.token)
    state.digestText = r.digest
    state.screen = 'digest'
    state.status = ''
  } catch {
    state.status = 'digest failed'
  }
  render()
}

// --- input ---------------------------------------------------------------

// Gestures reach the app through different fields depending on the host:
// the quickstart routes textEvent, but the current simulator (and hosts on
// SDK 0.0.16) deliver temple/ring gestures as sysEvent — eventSource set,
// eventType carrying the OsEventTypeList value (click = 0, omitted as the
// proto default; double-click = 3; long-press = 9). Normalise both channels
// into one eventType, and drop a duplicate delivery of the same gesture
// within 250 ms in case a host ever sends both.
let lastGestureType: OsEventTypeList | undefined
let lastGestureAt = 0

bridge.onEvenHubEvent((event) => {
  let eventType: OsEventTypeList | undefined
  if (event.textEvent) {
    if (event.textEvent.containerID !== 1) return
    eventType = event.textEvent.eventType
  } else if (
    event.sysEvent &&
    (event.sysEvent.eventSource || event.sysEvent.eventType !== undefined)
  ) {
    // Clicks carry eventSource (eventType 0 omitted); long-press carries
    // only eventType 9. Non-gesture sysEvents (foreground, IMU, exit) fall
    // through the switch below without effect.
    eventType = event.sysEvent.eventType ?? OsEventTypeList.CLICK_EVENT
  } else {
    return
  }
  const now = Date.now()
  if (eventType === lastGestureType && now - lastGestureAt < 250) return
  lastGestureType = eventType
  lastGestureAt = now

  switch (eventType) {
    case OsEventTypeList.CLICK_EVENT:
    case undefined: {
      if (state.screen === 'pair') void checkPairing()
      else if (state.screen === 'inbox') {
        // Advance cursor; wrapping past the end opens the selected message.
        if (state.messages.length === 0) void refreshInbox()
        else if (state.cursor < state.messages.length - 1) {
          state.cursor += 1
          render()
        } else void openCurrent()
      } else if (state.screen === 'detail') void makeDrafts()
      else if (state.screen === 'draft') {
        state.draftIdx = (state.draftIdx + 1) % Math.max(1, state.drafts.length)
        render()
      }
      break
    }
    case OsEventTypeList.LONG_PRESS_EVENT: {
      if (state.screen === 'inbox') void showDigest()
      break
    }
    case OsEventTypeList.DOUBLE_CLICK_EVENT: {
      if (state.screen === 'draft') void sendCurrentDraft()
      else if (state.screen === 'detail' || state.screen === 'digest') {
        state.screen = 'inbox'
        render()
      } else {
        // Root screen: mode 1 = system exit-confirmation dialog (required).
        bridge.shutDownPageContainer(1)
      }
      break
    }
  }
})

void bootPairing().then(() => console.log('[glancereply] ready — pair screen'))
