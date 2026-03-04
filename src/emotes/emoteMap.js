// ─── emotes/emoteMap.js ───────────────────────────────────────────────────────
// Shared emote registry written to by all three providers (BTTV, FFZ, 7TV).
// Load order in overlay.html is FFZ → BTTV → 7TV so 7TV wins name conflicts.

// emote name (string) → CDN image URL
const emoteMap = {};

// Names of 7TV zero-width emotes (e.g. overlays, flags).
// When one of these appears after a regular emote, they stack visually on top
// instead of appearing as a separate image.
const zeroWidthEmotes = new Set();