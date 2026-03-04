// ─── emotes/cheermotes.js ─────────────────────────────────────────────────────
// Fetches Twitch cheermote definitions and renders cheer tokens in messages.
//
// Cheermotes are animated bits emotes that appear when someone types e.g.
// "Cheer100" or "BibleThump500". Each prefix has multiple tiers — the image
// shown depends on how many bits were cheered (higher bits = higher tier image).
//
// The cheermote API returns global + channel-specific cheermotes in one call
// when broadcaster_id is included.

// prefix (lowercase) → array of { min_bits, url } sorted ascending by min_bits
const cheermoteMap = {};

async function fetchCheermotes(twitchUserId) {
    if (!CONFIG.token) return;

    try {
        // broadcaster_id causes the API to include channel-specific cheermotes alongside globals
        const res = await fetch(
            `https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${twitchUserId}`,
            { headers: { 'Authorization': `Bearer ${CONFIG.token}`, 'Client-Id': CONFIG.clientId } }
        );
        if (!res.ok) { console.warn('[Cheermotes] Failed to fetch:', res.status); return; }

        const data  = await res.json();
        let   count = 0;

        for (const action of data.data || []) {
            const prefix = action.prefix.toLowerCase();
            const tiers  = [];

            for (const tier of action.tiers || []) {
                // Prefer animated dark image; fall back to static dark
                const url = tier.images?.dark?.animated?.['4'] || tier.images?.dark?.static?.['4'];
                if (url) tiers.push({ min_bits: tier.min_bits, url });
            }

            if (tiers.length > 0) {
                // Sort ascending so getCheermoteUrl can walk from lowest to find highest matching tier
                tiers.sort((a, b) => a.min_bits - b.min_bits);
                cheermoteMap[prefix] = tiers;
                count++;
            }
        }

        console.log(`[Cheermotes] Loaded ${count} cheermote prefixes`);
    } catch (err) {
        console.error('[Cheermotes] Failed:', err);
    }
}

// Returns the correct tier image URL for a given prefix and bit amount.
// Finds the highest tier whose min_bits threshold is still <= the cheered amount.
function getCheermoteUrl(prefix, bits) {
    const tiers = cheermoteMap[prefix.toLowerCase()];
    if (!tiers) return null;

    let url = tiers[0].url; // start at the lowest tier as fallback
    for (const tier of tiers) {
        if (bits >= tier.min_bits) url = tier.url;
        else break; // tiers are sorted ascending, so we can stop early
    }
    return url;
}

// Parses a cheer message and replaces recognized cheer tokens (e.g. "Cheer100")
// with an animated image + a coloured bit-count span. Returns an HTML string.
function renderCheerMessage(message) {
    // Cheer tokens: one or more letters immediately followed by digits, e.g. "Cheer100"
    const tokenRegex = /\b([A-Za-z]+)(\d+)\b/g;
    let result    = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(message)) !== null) {
        const [full, prefix, bitsStr] = match;
        const bits = parseInt(bitsStr, 10);
        const url  = getCheermoteUrl(prefix, bits);

        // Append any plain text before this token
        result += escapeHTML(message.slice(lastIndex, match.index));

        if (url) {
            result += `<img class="chat-emote cheermote" src="${url}" alt="${escapeHTML(full)}" title="${escapeHTML(prefix)} ${bits}">`;
            result += `<span class="cheermote-amount">${bits}</span>`;
        } else {
            // Not a recognised cheermote — leave as plain text
            result += escapeHTML(full);
        }

        lastIndex = match.index + full.length;
    }

    // Append any trailing text after the last token
    result += escapeHTML(message.slice(lastIndex));
    return result;
}