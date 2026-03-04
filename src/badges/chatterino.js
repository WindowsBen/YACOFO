// ─── badges/chatterino.js ─────────────────────────────────────────────────────
// Fetches Chatterino badge definitions and maps them to Twitch user IDs.
// Same inversion pattern as FFZ: API returns badge → users[], we flip it to
// userId → badges[] for fast lookup at render time.

// twitchUserId (string) → array of { url, title }
const chatterinoUserBadges = {};

async function fetchChatterinoBadges() {
    try {
        const res = await fetch('https://api.chatterino.com/badges');
        if (!res.ok) { console.warn('[Chatterino Badges] Could not fetch badge list'); return; }

        const data = await res.json();

        // Clear before repopulating so reconnects don't duplicate entries
        for (const key of Object.keys(chatterinoUserBadges)) delete chatterinoUserBadges[key];

        for (const badge of data.badges || []) {
            if (!badge.image3 || !badge.users) continue;
            // Use image3 (highest resolution) as the badge URL
            const def = { url: badge.image3, title: badge.tooltip || 'Chatterino Badge' };

            for (const userId of badge.users) {
                const key = String(userId);
                if (!chatterinoUserBadges[key]) chatterinoUserBadges[key] = [];
                chatterinoUserBadges[key].push(def);
            }
        }

        console.log(`[Chatterino Badges] Loaded badge data for ${Object.keys(chatterinoUserBadges).length} users`);
    } catch (err) {
        console.error('[Chatterino Badges] Failed:', err);
    }
}