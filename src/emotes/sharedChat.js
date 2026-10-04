// ─── emotes/sharedChat.js ───────────────────────────────────────────────────────
// Cross-channel emote support for Twitch Shared Chat.
//
// When shared chat is active, a guest channel's own 7TV/FFZ/BTTV emotes should
// also work in our overlay — but only to FILL GAPS: if the host channel (or a
// global set) already has an emote with that name, the host's version always
// wins and is left completely untouched. Guest emotes are tracked separately
// so they can be cleanly removed again once shared chat ends, without risk of
// deleting anything that belongs to the host.
//
// Only channel-specific sets are fetched for guests — global FFZ/BTTV/7TV
// emotes are identical platform-wide and already loaded once for the host,
// so re-fetching them per guest would be redundant.
//
// FFZ and BTTV have no live-update mechanism (same as how the host channel's
// own FFZ/BTTV emotes already work — fetch once, no WebSocket). 7TV does, so
// guest 7TV emote sets get the same live add/remove/rename support the host's
// own emote set has, just scoped to that guest's ownership.

// emote name → the guest room ID that "owns" it. Only ever contains entries
// for emotes that came from a GUEST channel — host/global emotes are never
// tracked here, so cleanup can never accidentally remove something that isn't
// a guest's.
const guestEmoteOwner = {};

// Guest room ID → their 7TV emote_set_id, kept so we can unsubscribe from
// live updates when shared chat ends.
const _guestSevenTVEmoteSetId = {};

// Adds one emote to the shared emoteMap, but only if that name isn't already
// claimed by anything — host, global, or another guest. Returns true if added.
function _mergeGuestEmote(name, url, roomId, isZeroWidth = false) {
    if (!name || name in emoteMap) return false;
    emoteMap[name] = url;
    guestEmoteOwner[name] = roomId;
    if (isZeroWidth) zeroWidthEmotes.add(name);
    return true;
}

// Fetches a guest channel's FFZ/BTTV/7TV emotes and merges them non-destructively.
// Called the first time a new guest room is seen in a shared chat session.
async function fetchGuestChannelEmotes(roomId) {
    await Promise.allSettled([
        _fetchGuestFFZEmotes(roomId),
        _fetchGuestBTTVEmotes(roomId),
        _fetchGuest7TVEmotes(roomId),
    ]);
}

async function _fetchGuestFFZEmotes(roomId) {
    try {
        const res = await fetch(`https://api.frankerfacez.com/v1/room/id/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();

        let count = 0;
        for (const set of Object.values(data.sets || {})) {
            for (const emote of set.emoticons || []) {
                if (_mergeGuestEmote(emote.name, ffzEmoteUrl(emote), roomId)) count++;
            }
        }
        console.log(`[SharedChat] Loaded ${count} FFZ emotes from guest room ${roomId}`);
    } catch (err) {
        console.error('[SharedChat] FFZ guest fetch failed:', err);
    }
}

async function _fetchGuestBTTVEmotes(roomId) {
    try {
        const res = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${roomId}`);
        if (!res.ok) return;
        const data   = await res.json();
        const emotes = [...(data.channelEmotes || []), ...(data.sharedEmotes || [])];

        let count = 0;
        for (const emote of emotes) {
            if (_mergeGuestEmote(emote.code, `https://cdn.betterttv.net/emote/${emote.id}/3x`, roomId)) count++;
        }
        console.log(`[SharedChat] Loaded ${count} BTTV emotes from guest room ${roomId}`);
    } catch (err) {
        console.error('[SharedChat] BTTV guest fetch failed:', err);
    }
}

async function _fetchGuest7TVEmotes(roomId) {
    try {
        // Same two-step lookup as the host channel uses (see seventv.js) —
        // the connection response gives us emote_set_id, not the full set.
        const res = await fetch(`https://7tv.io/v3/users/twitch/${roomId}`);
        if (!res.ok) return;
        const data       = await res.json();
        const emoteSetId = data?.emote_set_id || data?.emote_set?.id;
        if (!emoteSetId) return;

        const setRes = await fetch(`https://7tv.io/v3/emote-sets/${emoteSetId}`);
        if (!setRes.ok) return;
        const setData = await setRes.json();

        let count = 0;
        for (const emote of setData.emotes || []) {
            const url = `https://cdn.7tv.app/emote/${emote.id}/4x.webp`;
            if (_mergeGuestEmote(emote.name, url, roomId, !!(emote.flags & SEVENTV_ZERO_WIDTH_FLAG))) count++;
        }
        console.log(`[SharedChat] Loaded ${count} 7TV emotes from guest room ${roomId}`);

        _guestSevenTVEmoteSetId[roomId] = emoteSetId;
        subscribe7TV('emote_set.update', emoteSetId, (body) => _handleGuest7TVEmoteSetUpdate(body, roomId));
    } catch (err) {
        console.error('[SharedChat] 7TV guest fetch failed:', err);
    }
}

// Same shape as handle7TVEmoteSetUpdate() in seventv.js, but ownership-aware:
// never overwrites an existing non-guest-owned emote on add, and only ever
// removes an emote this specific guest room actually owns.
function _handleGuest7TVEmoteSetUpdate(body, roomId) {
    const { pulled = [], pushed = [], updated = [] } = body || {};

    for (const item of pulled) {
        const name = item.old_value?.name;
        if (name && guestEmoteOwner[name] === roomId) {
            const url = emoteMap[name];
            delete emoteMap[name];
            delete guestEmoteOwner[name];
            zeroWidthEmotes.delete(name);
            console.log(`[SharedChat] Guest emote removed: ${name}`);
            if (CONFIG.showToastEmotes) showRemovedEmoteToast(name, url);
        }
    }

    for (const item of pushed) {
        const { name, id, flags } = item.value || {};
        if (name && id) {
            const url   = `https://cdn.7tv.app/emote/${id}/4x.webp`;
            const added = _mergeGuestEmote(name, url, roomId, !!(flags & SEVENTV_ZERO_WIDTH_FLAG));
            if (added) {
                console.log(`[SharedChat] Guest emote added: ${name}`);
                if (CONFIG.showToastEmotes) showNewEmoteToast(name, url);
            }
        }
    }

    for (const item of updated) {
        const oldName = item.old_value?.name;
        if (oldName && guestEmoteOwner[oldName] === roomId) {
            delete emoteMap[oldName];
            delete guestEmoteOwner[oldName];
            zeroWidthEmotes.delete(oldName);
        }
        const { name, id, flags } = item.value || {};
        if (name && id) {
            _mergeGuestEmote(name, `https://cdn.7tv.app/emote/${id}/4x.webp`, roomId, !!(flags & SEVENTV_ZERO_WIDTH_FLAG));
        }
    }
}

// Called when shared chat ends — removes every guest-owned emote from the
// shared maps and unsubscribes from each guest's 7TV live updates. Host and
// global emotes are untouched since they were never added to guestEmoteOwner.
function cleanupGuestChannelEmotes() {
    const removedCount = Object.keys(guestEmoteOwner).length;
    for (const name of Object.keys(guestEmoteOwner)) {
        delete emoteMap[name];
        zeroWidthEmotes.delete(name);
        delete guestEmoteOwner[name];
    }
    for (const [roomId, emoteSetId] of Object.entries(_guestSevenTVEmoteSetId)) {
        unsubscribe7TV('emote_set.update', emoteSetId);
        delete _guestSevenTVEmoteSetId[roomId];
    }
    if (removedCount) console.log(`[SharedChat] Cleaned up ${removedCount} guest channel emotes`);
}