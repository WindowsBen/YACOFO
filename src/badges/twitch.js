// ─── badges/twitch.js ─────────────────────────────────────────────────────────
// Fetches Twitch badge definitions from the Helix API and stores them in badgeMap.
//
// Two fetches are made: global badges (bits, Prime, turbo, staff, etc.) and
// channel badges (subscriber tiers, custom bits badges). Channel badges overwrite
// global ones with the same key so the streamer's custom icons always take priority.
//
// Requires a valid OAuth token and clientId from CONFIG.

async function fetchTwitchBadges(channelId) {
    if (!CONFIG.clientId || !CONFIG.token) {
        console.warn('[Badges] No clientId or token — skipping Twitch badge fetch.');
        return;
    }

    const headers = {
        'Authorization': `Bearer ${CONFIG.token}`,
        'Client-Id':     CONFIG.clientId,
    };

    try {
        // Global badges — available in every channel (admin, staff, turbo, Prime, bits tiers, etc.)
        const globalRes = await fetch('https://api.twitch.tv/helix/chat/badges/global', { headers });
        if (globalRes.ok) {
            const globalData = await globalRes.json();
            for (const set of globalData.data || []) {
                for (const version of set.versions || []) {
                    // Key format: "set_id/version_id" e.g. "subscriber/6" or "bits/1000"
                    badgeMap[`${set.set_id}/${version.id}`] = version.image_url_4x;
                }
            }
            console.log('[Badges] Loaded global Twitch badges');
        } else if (globalRes.status === 401) {
            console.warn('[Badges] Token expired — re-authenticate in the configurator');
            return;
        }

        // Channel badges — subscriber tiers, custom bits badges, channel-specific icons.
        // Written after globals so channel overrides win any key conflicts.
        const channelRes = await fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelId}`, { headers });
        if (channelRes.ok) {
            const channelData = await channelRes.json();
            for (const set of channelData.data || []) {
                for (const version of set.versions || []) {
                    badgeMap[`${set.set_id}/${version.id}`] = version.image_url_4x;
                }
            }
            console.log('[Badges] Loaded channel Twitch badges');
        }
    } catch (err) {
        console.error('[Badges] Failed to fetch Twitch badges:', err);
    }
}