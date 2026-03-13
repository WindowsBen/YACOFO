// ─── badges/badgeMap.js ───────────────────────────────────────────────────────
// Shared Twitch badge registry and badge rendering logic.
// Badge keys follow the format "set/version" e.g. "subscriber/6" or "bits/1000".
// All badge providers (Twitch, FFZ, Chatterino) write into this or their own maps,
// and renderBadges() reads from all of them to build the final badge HTML.

// "set/version" → image URL for Twitch badges
const badgeMap = {};

// ── Shared chat source channel avatars ────────────────────────────────────────
// Twitch sends source-room-id on every shared chat message from a guest channel.
// Once we see the first guest message we consider shared chat "active" and from
// that point ALL messages — including those from the host channel — get a small
// circular channel avatar badge before their regular badges.
//
// Avatars are fetched lazily on first sight of a room ID and cached. A null
// sentinel prevents duplicate in-flight fetches. Once resolved, any <img>
// elements already in the DOM for that room get their src patched in.

// roomId → { url, login } once fetched, null while fetch is in flight
const _sourceAvatarCache = {};

// True once the first guest-channel message is seen this session
let _sharedChatActive = false;

// Timestamp of the last guest message — used to time out shared chat if
// Twitch doesn't send an explicit end event we can reliably detect.
let _lastGuestMessageTime = 0;
const SHARED_CHAT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes of guest silence

// Called when shared chat is confirmed ended (either by ROOMSTATE detection
// in main.js once we know the exact tag, or by the timeout below).
// Removes all source badges from the DOM and resets state.
function _endSharedChat() {
    if (!_sharedChatActive) return;
    _sharedChatActive = false;
    _lastGuestMessageTime = 0;
    console.log('[SharedChat] Session ended — removing source badges');
    document.querySelectorAll('.source-channel-badge').forEach(el => el.remove());
}

// Periodic check: if shared chat has been active but no guest message has
// arrived in SHARED_CHAT_TIMEOUT_MS, consider the session over.
setInterval(() => {
    if (!_sharedChatActive) return;
    if (Date.now() - _lastGuestMessageTime > SHARED_CHAT_TIMEOUT_MS) {
        _endSharedChat();
    }
}, 60_000);

async function _fetchSourceAvatar(roomId) {
    if (roomId in _sourceAvatarCache) return;
    _sourceAvatarCache[roomId] = null;

    if (!CONFIG.token || !CONFIG.clientId) return;

    try {
        const res = await fetch(
            `https://api.twitch.tv/helix/users?id=${encodeURIComponent(roomId)}`,
            { headers: { 'Authorization': `Bearer ${CONFIG.token}`, 'Client-Id': CONFIG.clientId } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const user = data.data?.[0];
        if (!user?.profile_image_url) return;

        _sourceAvatarCache[roomId] = { url: user.profile_image_url, login: user.display_name || user.login || '' };

        // Patch any already-rendered badges for this room that are still blank
        document.querySelectorAll(`.source-channel-badge[data-source-room-id="${CSS.escape(roomId)}"]`)
            .forEach(img => {
                img.src   = user.profile_image_url;
                img.title = `From ${escapeHTML(user.display_name || user.login || '')}'s chat`;
                img.alt   = user.display_name || user.login || '';
            });
    } catch (e) {
        console.warn('[SharedChat] Could not fetch avatar for room', roomId, e);
    }
}

// Build the source badge img HTML for a given room ID
function _sourceBadgeHtml(roomId) {
    const cached    = _sourceAvatarCache[roomId];
    const avatarUrl = cached?.url  || '';
    const label     = cached?.login || '';
    return `<img class="chat-badge source-channel-badge"`
         + ` src="${escapeHTML(avatarUrl)}"`
         + ` data-source-room-id="${escapeHTML(roomId)}"`
         + ` alt="${escapeHTML(label)}"`
         + ` title="${label ? `From ${escapeHTML(label)}'s chat` : 'Shared chat'}"`
         + ` width="18" height="18">`;
}

function renderBadges(tags) {
    let html = '';

    // Kill switch — return nothing if all badges are disabled
    if (CONFIG.disableAllBadges) return html;

    // ── Shared chat source badge ───────────────────────────────────────────────
    const sourceRoomId = tags['source-room-id'];
    const isGuestMsg   = sourceRoomId && String(sourceRoomId) !== String(broadcasterId);

    if (isGuestMsg) {
        // Stamp time so the timeout checker knows shared chat is still alive
        _lastGuestMessageTime = Date.now();

        // First guest message seen — mark shared chat as active and pre-fetch
        // the host channel's avatar so it's ready for future host messages.
        if (!_sharedChatActive) {
            _sharedChatActive = true;
            if (broadcasterId) _fetchSourceAvatar(String(broadcasterId));
        }
        // Fetch this guest channel's avatar if not already cached
        if (!(sourceRoomId in _sourceAvatarCache)) {
            _fetchSourceAvatar(sourceRoomId);
        }
        html += _sourceBadgeHtml(sourceRoomId);

    } else if (_sharedChatActive && broadcasterId) {
        // Host channel message while shared chat is active — show host avatar.
        // Fetch is already in flight or done from the block above.
        if (!(String(broadcasterId) in _sourceAvatarCache)) {
            _fetchSourceAvatar(String(broadcasterId));
        }
        html += _sourceBadgeHtml(String(broadcasterId));
    }

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