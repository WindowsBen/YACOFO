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

// The host channel's room ID — set by main.js via setHostRoomId() on roomstate.
// Keeping a local copy avoids any cross-script scoping issues with main.js's
// broadcasterId let-declaration.
let _hostRoomId = null;
function setHostRoomId(id) { _hostRoomId = id ? String(id) : null; }

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

// Badge category sets — maps each Twitch badge set_id to its config toggle
const _BROADCASTER_BADGES = new Set(['broadcaster']);
const _MODERATOR_BADGES   = new Set(['moderator', 'lead_moderator', 'staff', 'admin', 'global_mod']);
const _VIP_BADGES         = new Set(['vip']);
const _SUBSCRIBER_BADGES  = new Set(['subscriber']);
// Everything else (bits, sub-gifter, hype-train, predictions, etc.) → showBadgeCustom

function _isBadgeAllowed(setName) {
    if (_BROADCASTER_BADGES.has(setName)) return CONFIG.showBadgeBroadcaster;
    if (_MODERATOR_BADGES.has(setName))   return CONFIG.showBadgeModerator;
    if (_VIP_BADGES.has(setName))         return CONFIG.showBadgeVIP;
    if (_SUBSCRIBER_BADGES.has(setName))  return CONFIG.showBadgeSubscriber;
    return CONFIG.showBadgeCustom;
}

function renderBadges(tags) {
    let html = '';

    // ── Shared chat source badge ───────────────────────────────────────────────
    const sourceRoomId = tags['source-room-id'];
    const isGuestMsg   = sourceRoomId && String(sourceRoomId) !== _hostRoomId;

    if (isGuestMsg) {
        _lastGuestMessageTime = Date.now();
        if (!_sharedChatActive) {
            _sharedChatActive = true;
            if (_hostRoomId) _fetchSourceAvatar(_hostRoomId);
        }
        if (!(sourceRoomId in _sourceAvatarCache)) _fetchSourceAvatar(sourceRoomId);
        html += _sourceBadgeHtml(sourceRoomId);
    } else if (_sharedChatActive && _hostRoomId) {
        if (!(_hostRoomId in _sourceAvatarCache)) _fetchSourceAvatar(_hostRoomId);
        html += _sourceBadgeHtml(_hostRoomId);
    }

    // ── Twitch native badges ───────────────────────────────────────────────────
    if (tags.badges) {
        for (const [setName, version] of Object.entries(tags.badges)) {
            if (!_isBadgeAllowed(setName)) continue;
            const url = badgeMap[`${setName}/${version}`];
            if (url) {
                html += `<img class="chat-badge" src="${url}" alt="${escapeHTML(setName)}" title="${escapeHTML(setName)}" width="18" height="18">`;
            }
        }
    }

    // ── FFZ badges ────────────────────────────────────────────────────────────
    if (CONFIG.showBadgeFFZ && tags['user-id']) {
        const ffzBadges = ffzUserBadges[String(tags['user-id'])];
        if (ffzBadges) {
            for (const badge of ffzBadges) {
                html += `<img class="chat-badge ffz-badge" src="${escapeHTML(badge.url)}" alt="${escapeHTML(badge.title)}" title="${escapeHTML(badge.title)}" width="18" height="18">`;
            }
        }
    }

    // ── Chatterino badges ─────────────────────────────────────────────────────
    if (CONFIG.showBadgeChatterino && tags['user-id']) {
        const chatterinoBadges = chatterinoUserBadges[String(tags['user-id'])];
        if (chatterinoBadges) {
            for (const badge of chatterinoBadges) {
                html += `<img class="chat-badge chatterino-badge" src="${escapeHTML(badge.url)}" alt="${escapeHTML(badge.title)}" title="${escapeHTML(badge.title)}" width="18" height="18">`;
            }
        }
    }

    return html;
}