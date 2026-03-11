// ─── config/preview.js ────────────────────────────────────────────────────────
// Renders a live-updating mini chat window on the right side of the config page.
// Every input/change event in the page re-renders the preview so the user can
// see the effect of their settings in real time without generating a link.
//
// All rendering is self-contained — no overlay JS is loaded here.
// Sample messages are hardcoded; only their styling is driven by config values.

// ── Helpers ───────────────────────────────────────────────────────────────────
function _pv(id, fallback = '') {
    return document.getElementById(id)?.value ?? fallback;
}
function _pc(id, fallback = '#888888') {
    return document.getElementById(id)?.value || fallback;
}
function _po(id, fallback = 100) {
    return parseInt(document.getElementById(id)?.value ?? fallback);
}
function _prgba(colorId, opId, fallback = '#888888') {
    const hex = _pc(colorId, fallback).replace('#', '');
    const r = parseInt(hex.slice(0,2)||'88', 16);
    const g = parseInt(hex.slice(2,4)||'88', 16);
    const b = parseInt(hex.slice(4,6)||'88', 16);
    const a = _po(opId, 100) / 100;
    return `rgba(${r},${g},${b},${a})`;
}
function _pfont() {
    return _previewFontFamily ? `font-family:'${_previewFontFamily}',sans-serif;` : '';
}

// ── Shared message container style ────────────────────────────────────────────
function _msgBase(extra = '') {
    const gap  = _pv('messageGap', '');
    const lh   = _pv('lineHeight', '');
    const fs   = _pv('messageFontSize', '15');
    return `font-size:${fs}px;line-height:${lh||1.4};margin-bottom:${gap ? gap+'px' : '8px'};${_pfont()}${extra}`;
}

function _nameSpan(name, color) {
    const shadow = (() => {
        try {
            const sc = _prgba('shadowColor','shadowOpacity','#000000');
            return `text-shadow:1px 1px 3px ${sc},0 0 6px ${sc};`;
        } catch { return ''; }
    })();
    const ns = _pv('nameFontSize', '15');
    return `<span style="color:${color};font-weight:700;font-size:${ns}px;${shadow}${_pfont()}">${name}</span>`;
}

// ── Individual message renderers ───────────────────────────────────────────────
function _renderChatMsg(name, color, text, extra = '') {
    return `<div class="pv-msg" style="${_msgBase(extra)}">
        ${_nameSpan(name, color)}<span style="color:rgba(255,255,255,0.88);"> ${text}</span>
    </div>`;
}

function _renderMeMsg() {
    const style = _pv('meStyle', 'colored');
    const color = '#E91E8C';
    let textStyle = '';
    if (style === 'colored') textStyle = `color:${color};`;
    if (style === 'italic')  textStyle = 'font-style:italic;color:rgba(255,255,255,0.88);';
    if (style === 'none')    textStyle = 'color:rgba(255,255,255,0.88);';
    return `<div class="pv-msg" style="${_msgBase()}">
        ${_nameSpan('PurpleFox', color)}<span style="${textStyle}"> * dances in the chat</span>
    </div>`;
}

function _renderHighlight() {
    const accent = _prgba('highlightAccent','highlightAccentOpacity','#FFAA00');
    const bg     = _prgba('highlightBg','highlightBgOpacity','#2a1e00');
    return `<div class="pv-msg" style="${_msgBase(`border-left:3px solid ${accent};background:${bg};border-radius:4px;padding:5px 8px;`)}">
        ${_nameSpan('GoldViewer', '#FFD700')}<span style="color:rgba(255,255,255,0.9);"> ✨ This message is highlighted!</span>
    </div>`;
}

function _renderReply() {
    const nameColor = '#3498DB';
    return `<div class="pv-msg" style="${_msgBase()}">
        <div style="font-size:0.8em;color:rgba(255,255,255,0.45);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <svg style="width:10px;height:10px;vertical-align:middle;margin-right:3px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
            <span style="color:rgba(255,255,255,0.6);font-weight:600;">StreamerDude</span> lol nice one
        </div>
        ${_nameSpan('RegularFan', nameColor)}<span style="color:rgba(255,255,255,0.88);"> @StreamerDude haha same</span>
    </div>`;
}

function _renderEvent(icon, name, detail, accentId, accentOpId, bgId, bgOpId, extra = '') {
    const accent = _prgba(accentId, accentOpId, '#9146FF');
    const bg     = _prgba(bgId, bgOpId, '#1a0a2e');
    return `<div class="pv-msg" style="${_msgBase(`border-left:3px solid ${accent};background:${bg};border-radius:4px;padding:6px 8px;display:flex;align-items:flex-start;gap:7px;`)}">
        <span style="color:${accent};flex-shrink:0;font-size:16px;margin-top:1px;">${icon}</span>
        <span style="${_pfont()}">
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

    const resubLabel  = _pv('resubLabel',  'resubscribed');
    const giftLabel   = _pv('giftLabel',   'gifted');
    const bitsLabel   = _pv('bitsLabel',   'cheered');
    const streakLabel = _pv('streakLabel', 'is on a');
    const raidLabel   = _pv('raidIncomingLabel', 'is raiding with');
    const redeemLabel = _pv('redeemLabel', 'redeemed');

    const html = [
        _renderChatMsg('StreamerDude', '#9146FF', 'Hey chat, welcome to the stream! 👋'),
        _renderChatMsg('CoolViewer99', '#FF6B6B', 'Let\'s go! PogChamp'),
        _renderReply(),
        _renderMeMsg(),
        _renderHighlight(),
        _renderEvent('⭐', 'NightOwl', `${resubLabel} (6 months, Tier 1)!`, 'resubAccent','resubAccentOpacity','resubBg','resubBgOpacity'),
        _renderEvent('🎁', 'GenGifter', `${giftLabel} 5 Tier 1 subs to the channel!`, 'giftAccent','giftAccentOpacity','giftBg','giftBgOpacity'),
        _renderEvent('💎', 'BitsBoss', `${bitsLabel} 500 bits!`, 'bitsAccent','bitsAccentOpacity','bitsBg','bitsBgOpacity', '"GG streamers!"'),
        _renderEvent('⚡', 'PointSpender', `${redeemLabel} Hydrate!`, 'redeemAccent','redeemAccentOpacity','redeemBg','redeemBgOpacity'),
        _renderEvent('🔥', 'MarathonFan', `${streakLabel} 30-stream watch streak!`, 'streakAccent','streakAccentOpacity','streakBg','streakBgOpacity'),
        _renderEvent('🚀', 'BigRaider', `${raidLabel} 250 viewers!`, 'raidIncomingAccent','raidIncomingAccentOpacity','raidIncomingBg','raidIncomingBgOpacity'),
    ].join('');

    panel.innerHTML = html;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initChatPreview() {
    renderChatPreview();
    // Re-render on any settings change
    document.addEventListener('input',  renderChatPreview);
    document.addEventListener('change', renderChatPreview);
}

document.addEventListener('DOMContentLoaded', initChatPreview);