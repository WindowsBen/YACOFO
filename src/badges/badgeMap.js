// ─── badges/badgeMap.js ───────────────────────────────────────────────────────
// Shared Twitch badge registry and badge rendering logic.
// Badge keys follow the format "set/version" e.g. "subscriber/6" or "bits/1000".
// All badge providers (Twitch, FFZ, Chatterino) write into this or their own maps,
// and renderBadges() reads from all of them to build the final badge HTML.

// "set/version" → image URL for Twitch badges
const badgeMap = {};

function renderBadges(tags) {
    let html = '';

    // Kill switch — return nothing if all badges are disabled
    if (CONFIG.disableAllBadges) return html;

    // Twitch badges — tags.badges is pre-parsed by tmi.js: { broadcaster: '1', subscriber: '6', ... }
    if (tags.badges) {
        for (const [setName, version] of Object.entries(tags.badges)) {
            // Skip non-role badges when roleOnlyBadges is active
            if (CONFIG.roleOnlyBadges && !ROLE_BADGES.has(setName)) continue;
            const url = badgeMap[`${setName}/${version}`];
            if (url) {
                html += `<img class="chat-badge" src="${url}" alt="${escapeHTML(setName)}" title="${escapeHTML(setName)}" width="18" height="18">`;
            }
        }
    }

    // FFZ and Chatterino badges — shown unless external cosmetics are disabled.
    // These are keyed by Twitch user ID, not login name.
    if (CONFIG.showExternalCosmetics && tags.username) {
        const key = tags['user-id'] ? String(tags['user-id']) : null;

        const ffzBadges = key ? ffzUserBadges[key] : null;
        if (ffzBadges) {
            for (const badge of ffzBadges) {
                html += `<img class="chat-badge ffz-badge" src="${badge.url}" alt="${escapeHTML(badge.title)}" title="${escapeHTML(badge.title)}" width="18" height="18">`;
            }
        }

        const chatterinoBadges = tags['user-id'] ? chatterinoUserBadges[String(tags['user-id'])] : null;
        if (chatterinoBadges) {
            for (const badge of chatterinoBadges) {
                html += `<img class="chat-badge chatterino-badge" src="${badge.url}" alt="${escapeHTML(badge.title)}" title="${escapeHTML(badge.title)}" width="18" height="18">`;
            }
        }
    }

    return html;
}