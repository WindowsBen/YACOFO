// ─── emotes/seventv.js ────────────────────────────────────────────────────────
// Fetches 7TV channel emotes and subscribes to live emote set updates
// via the shared 7TV WebSocket (seventv-ws.js).

async function fetch7TVEmotes(twitchUserId) {
    try {
        const res = await fetch(`https://7tv.io/v3/users/twitch/${twitchUserId}`);
        if (!res.ok) { console.warn('[7TV] Channel not found on 7TV'); return; }

        const data = await res.json();
        const emotes = data?.emote_set?.emotes;
        if (!emotes) return;

        for (const emote of emotes) {
            emoteMap[emote.name] = `https://cdn.7tv.app/emote/${emote.id}/1x.webp`;
        }
        console.log(`[7TV] Loaded ${emotes.length} emotes`);

        const emoteSetId = data?.emote_set?.id;
        if (emoteSetId) {
            subscribe7TV('emote_set.update', emoteSetId, handle7TVEmoteSetUpdate);
        }
    } catch (err) {
        console.error('[7TV] Failed to fetch emotes:', err);
    }
}

function handle7TVEmoteSetUpdate(body) {
    const { pulled = [], pushed = [], updated = [] } = body || {};

    for (const item of pulled) {
        const name = item.old_value?.name;
        if (name) {
            const url = emoteMap[name];
            delete emoteMap[name];
            console.log(`[7TV] Emote removed: ${name}`);
            if (CONFIG.showToastRemove) showRemovedEmoteToast(name, url);
        }
    }

    for (const item of pushed) {
        const { name, id } = item.value || {};
        if (name && id) {
            const url = `https://cdn.7tv.app/emote/${id}/1x.webp`;
            emoteMap[name] = url;
            console.log(`[7TV] Emote added: ${name}`);
            if (CONFIG.showToastAdd) showNewEmoteToast(name, url);
        }
    }

    for (const item of updated) {
        if (item.old_value?.name) delete emoteMap[item.old_value.name];
        const { name, id } = item.value || {};
        if (name && id) {
            emoteMap[name] = `https://cdn.7tv.app/emote/${id}/1x.webp`;
            console.log(`[7TV] Emote updated: ${name}`);
        }
    }
}