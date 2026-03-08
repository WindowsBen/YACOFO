// ─── config/tooltips.js ───────────────────────────────────────────────────────
// Injects a ⓘ indicator next to every setting label. Hovering shows a tooltip
// with a text description AND a live visual preview using the current input values.

// ── Color helpers ─────────────────────────────────────────────────────────────
function _hex(colorId, fallback = '#888888') {
    return (document.getElementById(colorId)?.value) || fallback;
}
function _opacity(opacityId, fallback = 100) {
    return parseInt(document.getElementById(opacityId)?.value ?? fallback);
}
function _rgba(colorId, opacityId, fallback = '#888888') {
    const hex = _hex(colorId, fallback).replace('#', '');
    const r   = parseInt(hex.slice(0,2), 16);
    const g   = parseInt(hex.slice(2,4), 16);
    const b   = parseInt(hex.slice(4,6), 16);
    const a   = _opacity(opacityId, 100) / 100;
    return `rgba(${r},${g},${b},${a})`;
}

// ── Mini preview builders ─────────────────────────────────────────────────────

function _miniEvent(icon, label, name, detail, accentId, accentOpId, bgId, bgOpId) {
    const accent = _rgba(accentId, accentOpId, '#9146FF');
    const bg     = _rgba(bgId, bgOpId, '#1a0a2e');
    return `<div style="border-left:3px solid ${accent};background:${bg};border-radius:4px;padding:5px 7px;font-size:11px;line-height:1.4;font-family:sans-serif;">
        <span style="color:${accent};font-weight:700;">${icon} ${label}</span>
        <span style="color:#fff;font-weight:600;"> ${name}</span>
        <span style="color:rgba(255,255,255,0.55);"> ${detail}</span>
    </div>`;
}

function _miniHighlight(accentId, accentOpId, bgId, bgOpId) {
    const accent = _rgba(accentId, accentOpId, '#FFAA00');
    const bg     = _rgba(bgId, bgOpId, '#2a1e00');
    return `<div style="border-left:3px solid ${accent};background:${bg};border-radius:4px;padding:5px 7px;font-size:11px;font-family:sans-serif;">
        <span style="color:#1ABC9C;font-weight:700;">StreamFan42</span>
        <span style="color:rgba(255,255,255,0.85);"> ✨ This is highlighted!</span>
    </div>`;
}

function _miniBan(accentId, accentOpId) {
    const accent = _rgba(accentId, accentOpId, '#FF4444');
    return `<div style="background:rgba(0,0,0,0.7);border-radius:6px;padding:8px 10px;text-align:center;font-family:sans-serif;">
        <div style="color:${accent};font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">BadUser123</div>
        <div style="font-size:20px;margin:2px 0;">🔨</div>
        <div style="color:rgba(255,255,255,0.4);font-size:9px;">Ban animation</div>
    </div>`;
}

function _miniTimeout(accentId, accentOpId) {
    const accent = _rgba(accentId, accentOpId, '#FF8C00');
    return `<div style="background:rgba(0,0,0,0.7);border-radius:6px;padding:8px 10px;text-align:center;font-family:sans-serif;">
        <div style="color:${accent};font-size:13px;font-weight:900;letter-spacing:2px;text-transform:uppercase;">BadUser123</div>
        <div style="font-size:18px;margin:2px 0;">⏱️ <span style="color:${accent};font-size:11px;font-weight:700;">10m</span></div>
        <div style="color:rgba(255,255,255,0.4);font-size:9px;">Timeout animation</div>
    </div>`;
}

function _miniPoll(accentId, accentOpId, bgId, bgOpId, barId, barOpId, winnerId, winnerOpId) {
    const accent = _rgba(accentId, accentOpId, '#A970FF');
    const bg     = _rgba(bgId, bgOpId, '#0e0e1e');
    const bar    = _rgba(barId, barOpId, '#A970FF');
    const winner = _rgba(winnerId, winnerOpId, '#FFD700');
    const choices = [['Elden Ring','72%',true],['Hollow Knight','28%',false]];
    return `<div style="background:${bg};border:1px solid ${accent};border-radius:6px;padding:7px 9px;font-size:10px;font-family:sans-serif;width:100%;box-sizing:border-box;">
        <div style="color:${accent};font-weight:700;margin-bottom:5px;">📊 What game next?</div>
        ${choices.map(([title,pct,win]) => `
        <div style="margin-bottom:4px;">
            <div style="display:flex;justify-content:space-between;color:${win?winner:'rgba(255,255,255,0.7)'};font-weight:${win?700:400};font-size:9px;margin-bottom:2px;">
                <span>${title}</span><span>${pct}</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;">
                <div style="height:100%;width:${pct};background:${win?winner:bar};border-radius:2px;"></div>
            </div>
        </div>`).join('')}
    </div>`;
}

function _miniPred(bgId, bgOpId) {
    const bg = _rgba(bgId, bgOpId, '#0d0d1a');
    const colors = ['#5b8dd9','#d95b5b'];
    return `<div style="background:${bg};border:1px solid rgba(169,112,255,0.4);border-radius:6px;padding:7px 9px;font-size:10px;font-family:sans-serif;width:100%;box-sizing:border-box;">
        <div style="color:rgba(255,255,255,0.8);font-weight:700;margin-bottom:5px;">Will I beat the boss?</div>
        ${[['Yes, ez clap','62%',0],['No chance','38%',1]].map(([title,pct,i]) => `
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
            <div style="width:6px;height:6px;border-radius:50%;background:${colors[i]};flex-shrink:0;"></div>
            <span style="color:rgba(255,255,255,0.75);flex:1;">${title}</span>
            <span style="color:${colors[i]};font-weight:700;">${pct}</span>
        </div>`).join('')}
    </div>`;
}

function _miniHypeTrain(accentId, accentOpId, bgId, bgOpId, barId, barOpId) {
    const accent = _rgba(accentId, accentOpId, '#FF6B35');
    const bg     = _rgba(bgId, bgOpId, '#1a0a00');
    const bar    = _rgba(barId, barOpId, '#FF6B35');
    return `<div style="background:${bg};border:1px solid ${accent};border-radius:5px;padding:5px 8px;display:flex;align-items:center;gap:7px;font-family:sans-serif;">
        <span style="color:${accent};font-size:9px;font-weight:800;letter-spacing:1px;white-space:nowrap;">🚂 HYPE TRAIN</span>
        <div style="background:${accent};border-radius:3px;padding:1px 5px;font-size:11px;font-weight:900;color:#fff;">2</div>
        <div style="flex:1;">
            <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px;">
                <div style="width:55%;height:100%;background:${bar};border-radius:3px;box-shadow:0 0 5px ${bar};"></div>
            </div>
        </div>
        <span style="color:rgba(255,255,255,0.4);font-size:9px;">142s</span>
    </div>`;
}

function _miniChat() {
    const nameSz = Math.min(parseInt(document.getElementById('nameFontSize')?.value  || 16), 16);
    const msgSz  = Math.min(parseInt(document.getElementById('messageFontSize')?.value || 16), 15);
    return `<div style="font-family:sans-serif;padding:2px 0;">
        <span style="color:#9B59B6;font-weight:700;font-size:${nameSz}px;">CoolViewer99</span>
        <span style="color:rgba(255,255,255,0.85);font-size:${msgSz}px;"> Hey, great stream!</span>
    </div>`;
}

// ── Settings map ──────────────────────────────────────────────────────────────
const SETTING_TIPS = {
    channel:         { desc: 'The Twitch channel name to connect to (without the #).' },
    nameFontSize:    { desc: 'Size of the username text in chat messages.',     preview: _miniChat },
    messageFontSize: { desc: 'Size of the message body text in chat messages.', preview: _miniChat },
    fontUrl:         { desc: 'URL of a custom web font (e.g. a Google Fonts CSS link). Leave blank to use the default.' },
    messageGap:      { desc: 'Vertical space between chat messages (px). Leave blank for default.' },
    lineHeight:      { desc: 'Line spacing within a message. Leave blank for default (e.g. 1.4).' },
    slideDistance:   { desc: 'How far new messages slide up from below before settling (px).' },
    slideDuration:   { desc: 'How long the slide-in animation takes (ms).' },
    messageLifetime: { desc: 'How many ms before a message fades out. 0 = stay on screen forever.' },
    fadeDuration:    { desc: 'How long the fade-out animation takes (ms).' },
    excludedUsers:   { desc: 'Comma-separated usernames to hide from chat (e.g. Nightbot, StreamElements).' },
    excludedPrefixes:{ desc: 'Hide messages starting with these prefixes. Comma-separated (e.g. ! hides bot commands).' },
    showAnnouncements:{ desc: 'Show /announce messages posted by mods or the broadcaster.' },
    showReplies:     { desc: 'Show the quoted parent message above reply messages.' },
    toastEmotes:     { desc: 'Float emote-only messages as a large emote above chat.' },
    meStyle:         { desc: 'How /me action messages are styled — colored, italic, or plain.', preview: _miniChat },
    disableAllBadges:      { desc: 'Hide every badge — Twitch, 7TV, FFZ, and Chatterino.' },
    roleOnlyBadges:        { desc: 'Only show Broadcaster, Mod, and VIP badges.' },
    showExternalCosmetics: { desc: 'Show third-party badges and name paints from 7TV, BTTV, and FFZ.' },

    showResubs:   { desc: 'Show an event message when someone subscribes or resubscribes.',
                    preview: () => _miniEvent('⭐','subscribed for','CoolViewer99','6 months','resubAccent','resubAccentOpacity','resubBg','resubBgOpacity') },
    resubAccent:  { desc: 'Border and icon color for resub event messages.',
                    preview: () => _miniEvent('⭐','subscribed for','CoolViewer99','6 months','resubAccent','resubAccentOpacity','resubBg','resubBgOpacity') },
    resubBg:      { desc: 'Background color for resub event messages.',
                    preview: () => _miniEvent('⭐','subscribed for','CoolViewer99','6 months','resubAccent','resubAccentOpacity','resubBg','resubBgOpacity') },
    resubLabel:   { desc: 'Custom verb in resub messages.',
                    preview: () => _miniEvent('⭐', document.getElementById('resubLabel')?.value||'subscribed for','CoolViewer99','6 months','resubAccent','resubAccentOpacity','resubBg','resubBgOpacity') },

    showGifts:    { desc: 'Show an event message when someone gifts subscriptions.',
                    preview: () => _miniEvent('🎁','gifted a sub to','StreamFan42','LuckyRecipient','giftAccent','giftAccentOpacity','giftBg','giftBgOpacity') },
    giftAccent:   { desc: 'Border and icon color for gift sub messages.',
                    preview: () => _miniEvent('🎁','gifted a sub to','StreamFan42','LuckyRecipient','giftAccent','giftAccentOpacity','giftBg','giftBgOpacity') },
    giftBg:       { desc: 'Background color for gift sub messages.',
                    preview: () => _miniEvent('🎁','gifted a sub to','StreamFan42','LuckyRecipient','giftAccent','giftAccentOpacity','giftBg','giftBgOpacity') },
    giftLabel:    { desc: 'Custom verb in gift messages.',
                    preview: () => _miniEvent('🎁', document.getElementById('giftLabel')?.value||'gifted a sub to','StreamFan42','LuckyRecipient','giftAccent','giftAccentOpacity','giftBg','giftBgOpacity') },

    showBits:     { desc: 'Show an event message when someone cheers with bits.',
                    preview: () => _miniEvent('💎','cheered','ChatLurker99','100 bits','bitsAccent','bitsAccentOpacity','bitsBg','bitsBgOpacity') },
    bitsAccent:   { desc: 'Border and icon color for cheer messages.',
                    preview: () => _miniEvent('💎','cheered','ChatLurker99','100 bits','bitsAccent','bitsAccentOpacity','bitsBg','bitsBgOpacity') },
    bitsBg:       { desc: 'Background color for cheer messages.',
                    preview: () => _miniEvent('💎','cheered','ChatLurker99','100 bits','bitsAccent','bitsAccentOpacity','bitsBg','bitsBgOpacity') },
    bitsLabel:    { desc: 'Custom verb in cheer messages.',
                    preview: () => _miniEvent('💎', document.getElementById('bitsLabel')?.value||'cheered','ChatLurker99','100 bits','bitsAccent','bitsAccentOpacity','bitsBg','bitsBgOpacity') },

    showRedeems:  { desc: 'Show an event message for channel point redemptions. Requires your own token.',
                    preview: () => _miniEvent('⚡','redeemed','StreamFan42','Hydrate!','redeemAccent','redeemAccentOpacity','redeemBg','redeemBgOpacity') },
    redeemAccent: { desc: 'Border and icon color for redemption messages.',
                    preview: () => _miniEvent('⚡','redeemed','StreamFan42','Hydrate!','redeemAccent','redeemAccentOpacity','redeemBg','redeemBgOpacity') },
    redeemBg:     { desc: 'Background color for redemption messages.',
                    preview: () => _miniEvent('⚡','redeemed','StreamFan42','Hydrate!','redeemAccent','redeemAccentOpacity','redeemBg','redeemBgOpacity') },
    redeemLabel:  { desc: 'Custom verb in redemption messages.',
                    preview: () => _miniEvent('⚡', document.getElementById('redeemLabel')?.value||'redeemed','StreamFan42','Hydrate!','redeemAccent','redeemAccentOpacity','redeemBg','redeemBgOpacity') },

    showBans:     { desc: 'Play the hammer animation when a user is banned.',
                    preview: () => _miniBan('banAccent','banAccentOpacity') },
    banAccent:    { desc: 'Accent color for the ban animation.',
                    preview: () => _miniBan('banAccent','banAccentOpacity') },
    banBg:        { desc: 'Background color for the ban animation.',
                    preview: () => _miniBan('banAccent','banAccentOpacity') },

    showTimeouts:  { desc: 'Play the clock animation when a user is timed out.',
                     preview: () => _miniTimeout('timeoutAccent','timeoutAccentOpacity') },
    timeoutAccent: { desc: 'Accent color for the timeout animation.',
                     preview: () => _miniTimeout('timeoutAccent','timeoutAccentOpacity') },
    timeoutBg:     { desc: 'Background color for the timeout animation.',
                     preview: () => _miniTimeout('timeoutAccent','timeoutAccentOpacity') },

    showHighlights:  { desc: 'Show highlighted messages with a distinct background and border.',
                       preview: () => _miniHighlight('highlightAccent','highlightAccentOpacity','highlightBg','highlightBgOpacity') },
    highlightAccent: { desc: 'Border and glow color for highlighted messages.',
                       preview: () => _miniHighlight('highlightAccent','highlightAccentOpacity','highlightBg','highlightBgOpacity') },
    highlightBg:     { desc: 'Background color for highlighted messages.',
                       preview: () => _miniHighlight('highlightAccent','highlightAccentOpacity','highlightBg','highlightBgOpacity') },

    showStreaks:  { desc: 'Show an event message for watch streak milestones.',
                   preview: () => _miniEvent('🔥','watch streak:','NightOwl','30 days','streakAccent','streakAccentOpacity','streakBg','streakBgOpacity') },
    streakAccent: { desc: 'Border and icon color for watch streak messages.',
                   preview: () => _miniEvent('🔥','watch streak:','NightOwl','30 days','streakAccent','streakAccentOpacity','streakBg','streakBgOpacity') },
    streakBg:     { desc: 'Background color for watch streak messages.',
                   preview: () => _miniEvent('🔥','watch streak:','NightOwl','30 days','streakAccent','streakAccentOpacity','streakBg','streakBgOpacity') },
    streakLabel:  { desc: 'Custom label text in watch streak messages.',
                   preview: () => _miniEvent('🔥', document.getElementById('streakLabel')?.value||'watch streak:','NightOwl','30 days','streakAccent','streakAccentOpacity','streakBg','streakBgOpacity') },

    showRaidIncoming:   { desc: 'Show an event message when another channel raids you.',
                          preview: () => _miniEvent('🚀','is raiding with','BigRaider','250 viewers','raidIncomingAccent','raidIncomingAccentOpacity','raidIncomingBg','raidIncomingBgOpacity') },
    raidIncomingAccent: { desc: 'Border and icon color for incoming raid messages.',
                          preview: () => _miniEvent('🚀','is raiding with','BigRaider','250 viewers','raidIncomingAccent','raidIncomingAccentOpacity','raidIncomingBg','raidIncomingBgOpacity') },
    raidIncomingBg:     { desc: 'Background color for incoming raid messages.',
                          preview: () => _miniEvent('🚀','is raiding with','BigRaider','250 viewers','raidIncomingAccent','raidIncomingAccentOpacity','raidIncomingBg','raidIncomingBgOpacity') },
    raidIncomingLabel:  { desc: 'Custom verb in incoming raid messages.',
                          preview: () => _miniEvent('🚀', document.getElementById('raidIncomingLabel')?.value||'is raiding with','BigRaider','250 viewers','raidIncomingAccent','raidIncomingAccentOpacity','raidIncomingBg','raidIncomingBgOpacity') },
    showRaidOutgoing:   { desc: 'Show an event message when you raid another channel. Requires your own token.',
                          preview: () => _miniEvent('🚀','raiding','You','FriendlyStreamer','raidOutgoingAccent','raidOutgoingAccentOpacity','raidOutgoingBg','raidOutgoingBgOpacity') },
    raidOutgoingAccent: { desc: 'Border and icon color for outgoing raid messages.',
                          preview: () => _miniEvent('🚀','raiding','You','FriendlyStreamer','raidOutgoingAccent','raidOutgoingAccentOpacity','raidOutgoingBg','raidOutgoingBgOpacity') },
    raidOutgoingBg:     { desc: 'Background color for outgoing raid messages.',
                          preview: () => _miniEvent('🚀','raiding','You','FriendlyStreamer','raidOutgoingAccent','raidOutgoingAccentOpacity','raidOutgoingBg','raidOutgoingBgOpacity') },
    raidOutgoingLabel:  { desc: 'Custom verb in outgoing raid messages.',
                          preview: () => _miniEvent('🚀', document.getElementById('raidOutgoingLabel')?.value||'raiding','You','FriendlyStreamer','raidOutgoingAccent','raidOutgoingAccentOpacity','raidOutgoingBg','raidOutgoingBgOpacity') },

    showPolls:    { desc: 'Show an active poll widget in the center of the overlay. Requires your own token.',
                    preview: () => _miniPoll('pollAccent','pollAccentOpacity','pollBg','pollBgOpacity','pollBar','pollBarOpacity','pollWinner','pollWinnerOpacity') },
    pollAccent:   { desc: 'Border, icon, and percentage text color for the poll widget.',
                    preview: () => _miniPoll('pollAccent','pollAccentOpacity','pollBg','pollBgOpacity','pollBar','pollBarOpacity','pollWinner','pollWinnerOpacity') },
    pollBg:       { desc: 'Background color for the poll widget.',
                    preview: () => _miniPoll('pollAccent','pollAccentOpacity','pollBg','pollBgOpacity','pollBar','pollBarOpacity','pollWinner','pollWinnerOpacity') },
    pollBar:      { desc: 'Fill color for poll vote bars.',
                    preview: () => _miniPoll('pollAccent','pollAccentOpacity','pollBg','pollBgOpacity','pollBar','pollBarOpacity','pollWinner','pollWinnerOpacity') },
    pollWinner:   { desc: 'Color used to highlight the winning choice when the poll ends.',
                    preview: () => _miniPoll('pollAccent','pollAccentOpacity','pollBg','pollBgOpacity','pollBar','pollBarOpacity','pollWinner','pollWinnerOpacity') },
    pollLingerMs: { desc: 'How long (ms) the poll widget stays visible after the poll ends.' },

    showPredictions:    { desc: 'Show an active prediction widget in the center of the overlay. Requires your own token.',
                          preview: () => _miniPred('predBg','predBgOpacity') },
    predBg:             { desc: 'Background color for the prediction widget.',
                          preview: () => _miniPred('predBg','predBgOpacity') },
    predWinnerGlow:     { desc: 'Glow color pulsed on the widget border when a prediction is resolved.',
                          preview: () => _miniPred('predBg','predBgOpacity') },
    predictionLingerMs: { desc: 'How long (ms) the prediction widget stays visible after locking, resolving, or canceling.' },

    showHypeTrain:     { desc: 'Show a hype train progress bar at the top of the overlay. Requires your own token.',
                         preview: () => _miniHypeTrain('htAccent','htAccentOpacity','htBg','htBgOpacity','htBar','htBarOpacity') },
    htAccent:          { desc: 'Border, icon, and label color for the hype train widget.',
                         preview: () => _miniHypeTrain('htAccent','htAccentOpacity','htBg','htBgOpacity','htBar','htBarOpacity') },
    htBg:              { desc: 'Background color for the hype train widget.',
                         preview: () => _miniHypeTrain('htAccent','htAccentOpacity','htBg','htBgOpacity','htBar','htBarOpacity') },
    htBar:             { desc: 'Fill color of the hype train progress bar.',
                         preview: () => _miniHypeTrain('htAccent','htAccentOpacity','htBg','htBgOpacity','htBar','htBarOpacity') },
    hypeTrainLingerMs: { desc: 'How long (ms) the hype train widget stays visible after the train ends.' },
};

// ── Tooltip DOM ───────────────────────────────────────────────────────────────
let _tipEl = null;

function _createTooltip() {
    _tipEl = document.createElement('div');
    _tipEl.className = 'setting-tooltip';
    _tipEl.style.display = 'none';
    document.body.appendChild(_tipEl);
}

function _showTip(tip, anchor) {
    if (!_tipEl) return;
    let html = '';
    if (tip.preview) html += `<div class="tip-preview">${tip.preview()}</div>`;
    html += `<div class="tip-desc">${tip.desc}</div>`;
    _tipEl.innerHTML = html;

    const tipW = tip.preview ? 280 : 220;
    _tipEl.style.width   = tipW + 'px';
    _tipEl.style.display = 'block';

    const r    = anchor.getBoundingClientRect();
    let   left = r.left + r.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));

    if (r.top > 80) {
        _tipEl.style.top       = (r.top - 8 + window.scrollY) + 'px';
        _tipEl.style.transform = 'translateY(-100%)';
    } else {
        _tipEl.style.top       = (r.bottom + 6 + window.scrollY) + 'px';
        _tipEl.style.transform = 'translateY(0)';
    }
    _tipEl.style.left = left + 'px';
}

function _hideTip() {
    if (_tipEl) _tipEl.style.display = 'none';
}

// ── Injection ─────────────────────────────────────────────────────────────────
function injectSettingTips() {
    _createTooltip();

    Object.entries(SETTING_TIPS).forEach(([id, tip]) => {
        const el = document.getElementById(id);
        if (!el) return;

        let labelTarget = null;

        // 1 — checkbox wrapper → .cb-label
        const wrapper = el.closest('.checkbox-wrapper');
        if (wrapper) labelTarget = wrapper.querySelector('.cb-label');

        // 2 — inside a row → .option-label in the same row
        if (!labelTarget) {
            const row = el.closest('.event-option-row, .text-override-row');
            if (row) labelTarget = row.querySelector('.option-label');
        }

        // 3 — preceding sibling .field-label span
        if (!labelTarget) {
            let sib = el.previousElementSibling;
            while (sib) {
                if (sib.classList.contains('field-label')) { labelTarget = sib; break; }
                sib = sib.previousElementSibling;
            }
        }

        // 4 — fallback: nearest .tab-section-title
        if (!labelTarget) {
            const section = el.closest('.tab-section');
            if (section) labelTarget = section.querySelector('.tab-section-title');
        }

        if (!labelTarget || labelTarget.querySelector('.setting-tip-icon')) return;

        const icon = document.createElement('span');
        icon.className = 'setting-tip-icon';
        icon.textContent = 'ⓘ';
        icon.addEventListener('mouseenter', () => _showTip(tip, icon));
        icon.addEventListener('mouseleave', _hideTip);
        labelTarget.appendChild(icon);
    });
}

document.addEventListener('DOMContentLoaded', injectSettingTips);