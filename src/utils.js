// ─── utils.js ─────────────────────────────────────────────────────────────────
// Shared utility functions available to all other scripts.

// Escapes user-generated content before inserting into innerHTML,
// preventing XSS attacks from malicious chat messages.
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}