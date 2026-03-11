// ─── config/preview.js ────────────────────────────────────────────────────────
// Renders a live-updating mini chat window on the right side of the config page.
// Every input/change event in the page re-renders the preview so the user can
// see the effect of their settings in real time without generating a link.

// ── Font loading ──────────────────────────────────────────────────────────────
let _previewFontFamily = '';

function _loadPreviewFont() {
    const url = document.getElementById('fontUrl')?.value?.trim();
    if (!url) { _previewFontFamily = ''; return; }
    if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }
    fetch(url).then(r => r.text()).then(css => {
        const match = css.match(/font-family:\s*['"]([^'"]+)['"]/i);
        if (match) {
            _previewFontFamily = match[1];
            document.fonts.load(`16px "${_previewFontFamily}"`).finally(renderChatPreview);
        }
    }).catch(() => {});
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _pv(id, fallback = '') {
    const el = document.getElementById(id);
    return el ? (el.value ?? fallback) : fallback;
}
function _pc(id, fallback = '#888888') {
    const el = document.getElementById(id);
    return (el && el.value) ? el.value : fallback;
}
function _po(id, fallback = 100) {
    const el = document.getElementById(id);
    return el ? parseInt(el.value ?? fallback) : fallback;
}
function _prgba(colorId, opId, fallback = '#888888') {
    try {
        const hex = _pc(colorId, fallback).replace('#', '');
        const r = parseInt(hex.slice(0,2)||'88', 16);
        const g = parseInt(hex.slice(2,4)||'88', 16);
        const b = parseInt(hex.slice(4,6)||'88', 16);
        const a = _po(opId, 100) / 100;
        return `rgba(${r},${g},${b},${a})`;
    } catch { return fallback; }
}
function _pfont() {
    return _previewFontFamily ? `font-family:'${_previewFontFamily}',sans-serif;` : '';
}
function _pnum(id, fallback) {
    const v = parseInt(_pv(id, ''));
    return isNaN(v) ? fallback : v;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
function _msgWrap(extra = '') {
    const gap = _pnum('messageGap', 8);
    const lh  = parseFloat(_pv('lineHeight', '')) || 1.4;
    const fs  = _pnum('messageFontSize', 15);
    return `font-size:${fs}px;line-height:${lh};margin-bottom:${gap}px;word-break:break-word;${_pfont()}${extra}`;
}

function _nameSpan(name, color) {
    const sc     = _prgba('shadowColor','shadowOpacity','#000000');
    const ns     = _pnum('nameFontSize', 15);
    const shadow = `text-shadow:1px 1px 3px ${sc},0 0 6px ${sc};`;
    return `<span style="color:${color};font-weight:700;font-size:${ns}px;${shadow}${_pfont()}">${name}</span>`;
}

// ── Individual message renderers ───────────────────────────────────────────────
function _msgChat(name, color, text) {
    return `<div style="${_msgWrap()}">${_nameSpan(name, color)}<span style="color:rgba(255,255,255,0.88);"> ${text}</span></div>`;
}

function _msgMe() {
    const style = _pv('meStyle', 'colored');
    const color = '#E91E8C';
    let ts = style === 'colored' ? `color:${color};` :
             style === 'italic'  ? 'font-style:italic;color:rgba(255,255,255,0.88);' :
                                   'color:rgba(255,255,255,0.88);';
    return `<div style="${_msgWrap()}">${_nameSpan('PurpleFox', color)}<span style="${ts}"> * dances in the chat</span></div>`;
}

function _msgHighlight() {
    const accent = _prgba('highlightAccent','highlightAccentOpacity','#FFAA00');
    const bg     = _prgba('highlightBg','highlightBgOpacity','#2a1e00');
    return `<div style="${_msgWrap(`border-left:3px solid ${accent};background:${bg};border-radius:4px;padding:5px 8px;`)}">${_nameSpan('GoldViewer','#FFD700')}<span style="color:rgba(255,255,255,0.9);"> ✨ This message is highlighted!</span></div>`;
}

function _msgReply() {
    return `<div style="${_msgWrap()}">
        <div style="font-size:0.8em;color:rgba(255,255,255,0.45);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <svg style="width:10px;height:10px;vertical-align:middle;margin-right:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            <span style="color:rgba(255,255,255,0.6);font-weight:600;">StreamerDude</span> lol nice one
        </div>
        ${_nameSpan('RegularFan','#3498DB')}<span style="color:rgba(255,255,255,0.88);"> @StreamerDude haha same</span>
    </div>`;
}

function _msgEvent(icon, name, detail, aId, aOId, bId, bOId, extra='') {
    const accent = _prgba(aId, aOId, '#9146FF');
    const bg     = _prgba(bId, bOId, '#1a0a2e');
    return `<div style="${_msgWrap(`border-left:3px solid ${accent};background:${bg};border-radius:4px;padding:6px 8px;display:flex;align-items:flex-start;gap:7px;`)}">
        <span style="color:${accent};flex-shrink:0;font-size:16px;margin-top:1px;">${icon}</span>
        <span>
            <span style="color:${accent};font-weight:700;">${name}</span>
            <span style="color:rgba(220,210,255,0.85);font-style:italic;"> ${detail}</span>
            ${extra ? `<span style="display:block;margin-top:3px;color:rgba(255,255,255,0.75);">${extra}</span>` : ''}
        </span>
    </div>`;
}

// ── Full preview render ────────────────────────────────────────────────────────
function renderChatPreview() {
    const panel = document.getElementById('preview-chat');
    if (!panel) return;

    const resubLabel  = _pv('resubLabel',  'resubscribed')  || 'resubscribed';
    const giftLabel   = _pv('giftLabel',   'gifted')        || 'gifted';
    const bitsLabel   = _pv('bitsLabel',   'cheered')       || 'cheered';
    const streakLabel = _pv('streakLabel', 'is on a')       || 'is on a';
    const raidLabel   = _pv('raidIncomingLabel','is raiding with') || 'is raiding with';
    const redeemLabel = _pv('redeemLabel', 'redeemed')      || 'redeemed';

    try {
        panel.innerHTML = [
            _msgChat('StreamerDude','#9146FF','Hey chat, welcome to the stream! 👋'),
            _msgChat('CoolViewer99','#FF6B6B','Let\'s go! PogChamp'),
            _msgReply(),
            _msgMe(),
            _msgHighlight(),
            _msgEvent('⭐','NightOwl',`${resubLabel} (6 months, Tier 1)!`,'resubAccent','resubAccentOpacity','resubBg','resubBgOpacity'),
            _msgEvent('🎁','GenGifter',`${giftLabel} 5 Tier 1 subs to the channel!`,'giftAccent','giftAccentOpacity','giftBg','giftBgOpacity'),
            _msgEvent('💎','BitsBoss',`${bitsLabel} 500 bits!`,'bitsAccent','bitsAccentOpacity','bitsBg','bitsBgOpacity','"GG streamers!"'),
            _msgEvent('⚡','PointSpender',`${redeemLabel} Hydrate!`,'redeemAccent','redeemAccentOpacity','redeemBg','redeemBgOpacity'),
            _msgEvent('🔥','MarathonFan',`${streakLabel} 30-stream watch streak!`,'streakAccent','streakAccentOpacity','streakBg','streakBgOpacity'),
            _msgEvent('🚀','BigRaider',`${raidLabel} 250 viewers!`,'raidIncomingAccent','raidIncomingAccentOpacity','raidIncomingBg','raidIncomingBgOpacity'),
        ].join('');
    } catch(e) {
        panel.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;padding:8px;">Preview unavailable</div>`;
        console.warn('Preview render error:', e);
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    _loadPreviewFont();
    document.getElementById('fontUrl')?.addEventListener('change', _loadPreviewFont);
    renderChatPreview();
    document.addEventListener('input',  renderChatPreview);
    document.addEventListener('change', renderChatPreview);
});