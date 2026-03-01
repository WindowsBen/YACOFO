// ─── config.js ────────────────────────────────────────────────────────────────
// Reads all URL parameters and exposes them as named constants.
// Every other file imports from here — nothing reads params directly.

const params = new URLSearchParams(window.location.hash.substring(1));

const CONFIG = {
    channelName:     params.get('channel'),
    fontSize:        params.get('fontSize'),
    shadowColor:     params.get('shadow'),
    showToastAdd:    params.get('toastAdd')        !== '0',
    showToastRemove: params.get('toastRemove')     !== '0',
    // Per-type event toggles
    showSubs:        params.get('showSubs')        !== '0',
    showBits:        params.get('showBits')        !== '0',
    showRedeems:     params.get('showRedeems')     !== '0',
    showHighlights:  params.get('showHighlights')  !== '0',
    // Per-type labels (empty = use default)
    subLabel:        params.get('subLabel')        || '',
    bitsLabel:       params.get('bitsLabel')       || '',
    redeemLabel:     params.get('redeemLabel')     || '',
    // Badge options
    disableAllBadges:      params.get('disableAllBadges')      === '1',
    roleOnlyBadges:        params.get('roleOnlyBadges')        === '1',
    showExternalCosmetics: params.get('showExternalCosmetics') !== '0',
    clientId: 'ti9ahr6lkym6anpij3d4f2cyjhij18',
    token:    params.get('token') || localStorage.getItem('twitch_access_token'),
};

// Apply CSS variables immediately
if (CONFIG.fontSize)    document.documentElement.style.setProperty('--chat-font-size',    CONFIG.fontSize);
if (CONFIG.shadowColor) document.documentElement.style.setProperty('--chat-shadow-color', CONFIG.shadowColor);

// Event type color CSS variables
const cssVars = {
    '--sub-accent':       params.get('subAccent')       || '#9146FF',
    '--sub-bg':           params.get('subBg')           || '#1a0a2e',
    '--bits-accent':      params.get('bitsAccent')      || '#9146FF',
    '--bits-bg':          params.get('bitsBg')          || '#1a0a2e',
    '--redeem-accent':    params.get('redeemAccent')    || '#FFB800',
    '--redeem-bg':        params.get('redeemBg')        || '#2a1f00',
    '--highlight-accent': params.get('highlightAccent') || '#FF00FF',
    '--highlight-bg':     params.get('highlightBg')     || '#2a002a',
};
for (const [key, val] of Object.entries(cssVars)) {
    document.documentElement.style.setProperty(key, val);
}

// Badges that are strictly tied to channel role
const ROLE_BADGES = new Set(['broadcaster', 'moderator', 'vip', 'staff', 'admin', 'global_mod', 'lead_moderator']);