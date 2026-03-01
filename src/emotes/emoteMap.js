// ─── emotes/emoteMap.js ───────────────────────────────────────────────────────
// Single shared emote registry. All providers (BTTV, FFZ, 7TV) write into this.
// Load order: FFZ → BTTV → 7TV, so 7TV wins any name conflicts.

const emoteMap = {};

// Set of emote names that are zero-width (7TV only).
// When one of these follows a regular emote, they stack visually.
const zeroWidthEmotes = new Set();