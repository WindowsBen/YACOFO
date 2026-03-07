// ─── emotes/emoteMap.js ───────────────────────────────────────────────────────
// Shared emote registry written to by all three providers (BTTV, FFZ, 7TV).
// Load order in overlay.html is FFZ → BTTV → 7TV so 7TV wins name conflicts.

// emote name (string) → CDN image URL
const emoteMap = {};

// Names of 7TV zero-width emotes (e.g. overlays, flags).
// When one of these appears after a regular emote, they stack visually on top
// instead of appearing as a separate image.
const zeroWidthEmotes = new Set();

// Twitch emote name → CDN URL. Pre-populated on startup from the Helix emotes
// API, and also filled passively as messages with Twitch emotes are parsed.
// Used to render Twitch emotes in reply snippets where position data is absent.
const twitchEmoteByName = {};

// Rolling cache of recent message-id → emote tags object.
// Lets reply rendering look up the parent message's emotes by ID.
// Capped at 200 entries to avoid unbounded growth.
const recentMessageEmotes = {};
const RECENT_EMOTES_CAP   = 200;
let   recentEmoteKeys     = [];

function cacheMessageEmotes(msgId, emotes) {
    if (!msgId || !emotes) return;
    recentMessageEmotes[msgId] = emotes;
    recentEmoteKeys.push(msgId);
    if (recentEmoteKeys.length > RECENT_EMOTES_CAP) {
        delete recentMessageEmotes[recentEmoteKeys.shift()];
    }
}