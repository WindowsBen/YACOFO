// ─── chat/moderation.js ───────────────────────────────────────────────────────
// Listens for Twitch moderation events and removes affected messages from the DOM.
// Bans and timeouts trigger dramatic visual animations via src/ui/mod-animations.js.

const ICON_BAN     = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`;
const ICON_TIMEOUT = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>`;

// Removes all visible messages from a given login name
function removeUserMessages(username) {
    const selector = `[data-username="${CSS.escape(username.toLowerCase())}"]`;
    document.getElementById('chat-container')
        .querySelectorAll(selector)
        .forEach(el => el.remove());
    // Also remove from bubble overlay when in bubble mode
    const bubbleOverlay = document.getElementById('bubble-overlay');
    if (bubbleOverlay) bubbleOverlay.querySelectorAll(selector).forEach(el => el.remove());
}

// Formats a timeout duration into a human-readable string
function formatDuration(seconds) {
    if (seconds < 60)   return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
}

function registerModerationListeners(client) {
    // /clear — wipe the entire chat window
    client.on('clearchat', () => {
        document.getElementById('chat-container').innerHTML = '';
        // In bubble mode wipe all chat bubbles (leave hype train bubbles)
        if (typeof _clearBubbleOverlay === 'function') _clearBubbleOverlay();
    });

    // Timeout — remove messages and optionally show animation
    client.on('timeout', (channel, username, reason, duration) => {
        removeUserMessages(username);
        if (!CONFIG.showTimeouts) return;
        showTimeoutAnimation(username, duration ? formatDuration(duration) : null);
    });

    // Ban — remove messages and optionally show animation
    client.on('ban', (channel, username) => {
        removeUserMessages(username);
        if (!CONFIG.showBans) return;
        showBanAnimation(username);
    });

    // A mod or broadcaster deleted a single specific message
    client.on('messagedeleted', (channel, username, deletedMessage, tags) => {
        const msgId = tags['target-msg-id'];
        if (!msgId) return;
        const selector = `[data-msg-id="${CSS.escape(msgId)}"]`;
        document.querySelector(selector)?.remove();
        document.getElementById('bubble-overlay')?.querySelector(selector)?.remove();
    });
}