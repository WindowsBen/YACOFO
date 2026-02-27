// ─── Read URL Settings ────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const channelName = params.get('channel');
const fontSize = params.get('fontSize');
const shadowColor = params.get('shadow');

if (fontSize) document.documentElement.style.setProperty('--chat-font-size', fontSize);
if (shadowColor) document.documentElement.style.setProperty('--chat-shadow-color', shadowColor);

// ─── Emote Registry ───────────────────────────────────────────────────────────
// Maps emote name (word) → image URL
const emoteMap = {};

// ─── 7TV: Fetch Channel Emotes ────────────────────────────────────────────────
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

        // Subscribe to live updates using the emote set ID
        const emoteSetId = data?.emote_set?.id;
        if (emoteSetId) subscribe7TVLiveUpdates(emoteSetId);

    } catch (err) {
        console.error('[7TV] Failed to fetch emotes:', err);
    }
}

// ─── 7TV: Live Emote Updates via EventSub WebSocket ──────────────────────────
function subscribe7TVLiveUpdates(emoteSetId) {
    const ws = new WebSocket('wss://events.7tv.io/v3');

    ws.onopen = () => {
        // Op 35 = SUBSCRIBE
        ws.send(JSON.stringify({
            op: 35,
            d: {
                type: 'emote_set.update',
                condition: { object_id: emoteSetId }
            }
        }));
        console.log('[7TV] Subscribed to live emote updates for set:', emoteSetId);
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.op !== 0 || msg.d?.type !== 'emote_set.update') return; // Only handle DISPATCH

        const { pulled = [], pushed = [], updated = [] } = msg.d?.body || {};

        // Emotes removed from the set
        for (const item of pulled) {
            const name = item.old_value?.name;
            if (name) {
                delete emoteMap[name];
                console.log(`[7TV] Emote removed: ${name}`);
            }
        }

        // Emotes added to the set
        for (const item of pushed) {
            const { name, id } = item.value || {};
            if (name && id) {
                emoteMap[name] = `https://cdn.7tv.app/emote/${id}/1x.webp`;
                console.log(`[7TV] Emote added: ${name}`);
            }
        }

        // Emotes renamed or updated
        for (const item of updated) {
            if (item.old_value?.name) delete emoteMap[item.old_value.name];
            const { name, id } = item.value || {};
            if (name && id) {
                emoteMap[name] = `https://cdn.7tv.app/emote/${id}/1x.webp`;
                console.log(`[7TV] Emote updated: ${name}`);
            }
        }
    };

    ws.onclose = () => {
        console.warn('[7TV] WebSocket closed — reconnecting in 5s...');
        setTimeout(() => subscribe7TVLiveUpdates(emoteSetId), 5000);
    };

    ws.onerror = (err) => console.error('[7TV] WebSocket error:', err);
}

// ─── Safety: HTML Escape ──────────────────────────────────────────────────────
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Replace 7TV emote words in a plain-text chunk ───────────────────────────
// Input text must already be HTML-escaped.
function parse7TVEmotes(escapedText) {
    return escapedText.split(' ').map(word => {
        // Unescape for dictionary lookup
        const raw = word.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        if (emoteMap[raw]) {
            return `<img class="chat-emote" src="${emoteMap[raw]}" alt="${word}" title="${word}">`;
        }
        return word;
    }).join(' ');
}

// ─── Parse Full Message (Twitch Native + 7TV) ─────────────────────────────────
// tags.emotes format: { "emoteId": ["start-end", "start-end"], ... }
function parseMessage(message, twitchEmotes) {
    // Build sorted list of Twitch emote character ranges
    const ranges = [];
    if (twitchEmotes) {
        for (const [emoteId, positions] of Object.entries(twitchEmotes)) {
            for (const pos of positions) {
                const [start, end] = pos.split('-').map(Number);
                ranges.push({
                    start, end,
                    url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`
                });
            }
        }
        ranges.sort((a, b) => a.start - b.start);
    }

    if (ranges.length === 0) {
        // No Twitch emotes — just scan for 7TV
        return parse7TVEmotes(escapeHTML(message));
    }

    // Walk character ranges, inserting Twitch emote images and scanning gaps for 7TV
    let html = '';
    let cursor = 0;

    for (const range of ranges) {
        if (cursor < range.start) {
            // Gap before this Twitch emote: check for 7TV emotes in here
            html += parse7TVEmotes(escapeHTML(message.slice(cursor, range.start)));
        }
        const emoteName = message.slice(range.start, range.end + 1);
        html += `<img class="chat-emote" src="${range.url}" alt="${escapeHTML(emoteName)}" title="${escapeHTML(emoteName)}">`;
        cursor = range.end + 1;
    }

    // Trailing text after last Twitch emote
    if (cursor < message.length) {
        html += parse7TVEmotes(escapeHTML(message.slice(cursor)));
    }

    return html;
}

// ─── Render a Chat Message ────────────────────────────────────────────────────
function displayMessage(tags, message) {
    const chatContainer = document.getElementById('chat-container');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

    const userColor = tags.color || '#ffffff';
    const username = tags['display-name'] || tags.username;
    const parsedMessage = parseMessage(message, tags.emotes);

    messageElement.innerHTML = `
        <span class="username" style="color: ${escapeHTML(userColor)}">${escapeHTML(username)}:</span>
        <span class="message-text">${parsedMessage}</span>
    `;

    chatContainer.appendChild(messageElement);

    // Cap at 50 messages
    if (chatContainer.childNodes.length > 50) {
        chatContainer.removeChild(chatContainer.firstChild);
    }
}

// ─── Connect to Twitch Chat ───────────────────────────────────────────────────
if (channelName) {
    const client = new tmi.Client({
        connection: { secure: true, reconnect: true },
        channels: [channelName],
    });

    client.connect();

    // roomstate fires when we join — gives us the numeric Twitch user ID
    // which we need to look up 7TV emotes
    client.on('roomstate', (channel, state) => {
        const twitchUserId = state['room-id'];
        if (twitchUserId) fetch7TVEmotes(twitchUserId);
    });

    client.on('message', (channel, tags, message, self) => {
        displayMessage(tags, message);
    });

} else {
    document.body.innerHTML = "<h2 style='color:red;'>Error: No channel specified in URL</h2>";
}