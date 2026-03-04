// ─── badges/ffz.js ────────────────────────────────────────────────────────────
// Fetches FFZ badge definitions and maps them to Twitch user IDs.
// FFZ's API returns a flat list of badges with a users array per badge,
// so we invert that into a userId → badges lookup for O(1) render-time access.

// twitchUserId (string) → array of { url, title }
const ffzUserBadges = {};

async function fetchFFZBadges() {
    try {
        const res = await fetch('https://api.frankerfacez.com/v1/badges/ids');
        if (!res.ok) { console.warn('[FFZ Badges] Could not fetch badge list'); return; }

        const data = await res.json();

        // Clear before repopulating so reconnects don't duplicate entries
        for (const key of Object.keys(ffzUserBadges)) delete ffzUserBadges[key];

        // Build a badgeId → { url, title } lookup first
        const badgeDefs = {};
        for (const badge of data.badges || []) {
            if (!badge.urls && !badge.image) continue;
            // Prefer highest resolution available
            const url = badge.urls?.['4'] || badge.urls?.['2'] || badge.urls?.['1'] || badge.image;
            if (!url) continue;
            badgeDefs[badge.id] = { url, title: badge.title || 'FFZ Badge' };
        }

        // Invert: for each badge, assign it to each user that has it
        for (const [badgeId, userIds] of Object.entries(data.users || {})) {
            const def = badgeDefs[badgeId];
            if (!def) continue;
            for (const userId of userIds) {
                const key = String(userId);
                if (!ffzUserBadges[key]) ffzUserBadges[key] = [];
                ffzUserBadges[key].push(def);
            }
        }

        console.log(`[FFZ Badges] Loaded badge data for ${Object.keys(ffzUserBadges).length} users`);
    } catch (err) {
        console.error('[FFZ Badges] Failed:', err);
    }
}