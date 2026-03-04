// ─── chat/moderation.js ───────────────────────────────────────────────────────
// Listens for Twitch moderation events and removes affected messages from the DOM.
// All message elements are tagged with data-username and data-msg-id at render
// time (in renderer.js) so we can target them here without keeping a JS array.

// Removes all visible messages from a given login name
function removeUserMessages(username) {
    document.getElementById('chat-container')
        .querySelectorAll(`[data-username="${CSS.escape(username.toLowerCase())}"]`)
        .forEach(el => el.remove());
}

function registerModerationListeners(client) {
    // /clear — wipe the entire chat window
    client.on('clearchat', () => {
        document.getElementById('chat-container').innerHTML = '';
    });

    // Timeout or ban — remove all messages from that user
    client.on('timeout', (channel, username) => removeUserMessages(username));
    client.on('ban',     (channel, username) => removeUserMessages(username));

    // A mod or broadcaster deleted a single specific message
    client.on('messagedeleted', (channel, username, deletedMessage, tags) => {
        const msgId = tags['target-msg-id'];
        if (msgId) document.querySelector(`[data-msg-id="${CSS.escape(msgId)}"]`)?.remove();
    });
}