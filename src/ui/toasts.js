// ─── ui/toasts.js ─────────────────────────────────────────────────────────────
// Toast notifications that slide in from the bottom-right when 7TV emotes
// are added or removed from the channel's emote set mid-stream.
// Visibility is controlled by CONFIG.showToastEmotes.

// Creates and animates a toast element, removes it after 4 seconds
function _spawnToast(html, extraClass = '') {
    const toast = document.createElement('div');
    toast.className = `emote-toast${extraClass ? ' ' + extraClass : ''}`;
    toast.innerHTML = html;
    document.body.appendChild(toast);

    // Double rAF ensures the element is painted before the transition starts
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('emote-toast--visible')));

    setTimeout(() => {
        toast.classList.remove('emote-toast--visible');
        // Remove from DOM after the CSS fade-out transition completes
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 4000);
}

// Shown when an emote is added to the channel's 7TV emote set
function showNewEmoteToast(emoteName, emoteUrl) {
    _spawnToast(
        `New Emote added to Set: <strong>${escapeHTML(emoteName)}</strong>
         <img class="toast-emote" src="${escapeHTML(emoteUrl)}" alt="${escapeHTML(emoteName)}">`
    );
}

// Shown when an emote is removed from the channel's 7TV emote set
function showRemovedEmoteToast(emoteName, emoteUrl) {
    _spawnToast(
        `Emote removed from Set: <strong>${escapeHTML(emoteName)}</strong>
         ${emoteUrl ? `<img class="toast-emote" src="${escapeHTML(emoteUrl)}" alt="${escapeHTML(emoteName)}">` : ''}`,
        'emote-toast--removed'
    );
}