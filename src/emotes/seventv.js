// ─── emotes/seventv.js ────────────────────────────────────────────────────────
// Fetches 7TV global and channel emotes into the shared emoteMap.
// Subscribes to live emote set updates via seventv-ws.js so emotes added or
// removed mid-stream are reflected immediately without a page reload.

// Bit flag in 7TV's emote.flags indicating a zero-width (overlay) emote
const SEVENTV_ZERO_WIDTH_FLAG = 1;

async function fetch7TVEmotes(twitchUserId) {
    try {
        // Global emotes — available in every channel
        const globalRes = await fetch('https://7tv.io/v3/emote-sets/global');
        if (globalRes.ok) {
            const globalData = await globalRes.json();
            let globalCount = 0;
            for (const emote of globalData.emotes || []) {
                emoteMap[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/4x.webp`;
                if (emote.flags & SEVENTV_ZERO_WIDTH_FLAG) zeroWidthEmotes.add(emote.name);
                globalCount++;
            }
            console.log(`[7TV] Loaded ${globalCount} global emotes`);
        }

        // Channel-specific emotes
        const res = await fetch(`https://7tv.io/v3/users/twitch/${twitchUserId}`);
        if (!res.ok) { console.warn('[7TV] Channel not found on 7TV'); return; }

        const data   = await res.json();
        const emotes = data?.emote_set?.emotes;
        if (!emotes) return;

        for (const emote of emotes) {
            emoteMap[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/4x.webp`;
            if (emote.flags & SEVENTV_ZERO_WIDTH_FLAG) {
                zeroWidthEmotes.add(emote.name);
            }
        }
        console.log(`[7TV] Loaded ${emotes.length} emotes`);

        // Subscribe to live updates for this channel's emote set
        const emoteSetId = data?.emote_set?.id;
        if (emoteSetId) {
            subscribe7TV('emote_set.update', emoteSetId, handle7TVEmoteSetUpdate);
        }
    } catch (err) {
        console.error('[7TV] Failed to fetch emotes:', err);
    }
}

// Handles live emote set changes pushed by 7TV's EventSub WebSocket.
// pulled = removed, pushed = added, updated = renamed/modified.
function handle7TVEmoteSetUpdate(body) {
    const { pulled = [], pushed = [], updated = [] } = body || {};

    // Emotes removed from the set
    for (const item of pulled) {
        const name = item.old_value?.name;
        if (name) {
            const url = emoteMap[name];
            delete emoteMap[name];
            zeroWidthEmotes.delete(name);
            console.log(`[7TV] Emote removed: ${name}`);
            if (CONFIG.showToastEmotes) showRemovedEmoteToast(name, url);
        }
    }

    // Emotes added to the set
    for (const item of pushed) {
        const { name, id, flags } = item.value || {};
        if (name && id) {
            const url = `https://cdn.7tv.app/emote/${id}/4x.webp`;
            emoteMap[name] = url;
            if (flags & SEVENTV_ZERO_WIDTH_FLAG) zeroWidthEmotes.add(name);
            else zeroWidthEmotes.delete(name);
            console.log(`[7TV] Emote added: ${name}`);
            if (CONFIG.showToastEmotes) showNewEmoteToast(name, url);
        }
    }

    // Emotes renamed or modified — swap old entry for new
    for (const item of updated) {
        if (item.old_value?.name) {
            delete emoteMap[item.old_value.name];
            zeroWidthEmotes.delete(item.old_value.name);
        }
        const { name, id, flags } = item.value || {};
        if (name && id) {
            emoteMap[name] = `https://cdn.7tv.app/emote/${id}/4x.webp`;
            if (flags & SEVENTV_ZERO_WIDTH_FLAG) zeroWidthEmotes.add(name);
            else zeroWidthEmotes.delete(name);
            console.log(`[7TV] Emote updated: ${name}`);
        }
    }
}