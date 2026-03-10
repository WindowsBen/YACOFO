// ─── ui/bubbles.js ─────────────────────────────────────────────────────────────
// "Bubbles" chat style — every chat message spawns as a floating soap bubble
// that drifts gently before popping. Special variants for events and hype train.
//
// Guard: every public function checks CONFIG.chatStyle === 'bubbles' first.
// Integration points:
//   • displayMessage()      in renderer.js  → calls displayBubbleMessage()
//   • displayEventMessage() in events.js    → calls displayBubbleEvent() for subs/bits
//   • handlePubSubHypeTrain() in hype-train.js → calls bubbleHypeTrainUpdate()

// ── Inject CSS once ────────────────────────────────────────────────────────────
(function _injectBubbleCSS() {
    const s = document.createElement('style');
    s.id = 'bubble-styles';
    s.textContent = `
    /* ── Base bubble ──────────────────────────────────────────────────────── */
    #bubble-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 10;
    }

    .soap-bubble {
        position: absolute;
        max-width: 260px;
        min-width: 120px;
        padding: 10px 14px;
        border-radius: 24px;
        background: radial-gradient(ellipse at 30% 25%,
            rgba(255,255,255,0.18) 0%,
            rgba(180,210,255,0.08) 40%,
            rgba(10,10,30,0.55) 100%);
        border: 1.5px solid rgba(180,220,255,0.6);
        box-shadow:
            inset 2px 3px 8px rgba(255,255,255,0.25),
            inset -2px -2px 6px rgba(100,180,255,0.1),
            0 0 12px rgba(100,180,255,0.2);
        color: rgba(255,255,255,0.92);
        font-size: var(--message-font-size, 15px);
        font-family: var(--chat-font-family, sans-serif);
        line-height: 1.4;
        word-break: break-word;
        pointer-events: none;

        /* enter: scale up from 0 */
        transform: scale(0);
        opacity: 0;
        transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1),
                    opacity 0.2s ease;
    }
    .soap-bubble.bubble-visible {
        opacity: 1;
        transform: scale(1);
    }

    /* iridescent shimmer on the border */
    @keyframes bubble-shimmer {
        0%   { border-color: rgba(180,220,255,0.65); }
        20%  { border-color: rgba(200,160,255,0.65); }
        40%  { border-color: rgba(160,255,210,0.65); }
        60%  { border-color: rgba(255,210,160,0.65); }
        80%  { border-color: rgba(160,210,255,0.65); }
        100% { border-color: rgba(180,220,255,0.65); }
    }
    .soap-bubble { animation: bubble-shimmer 4s linear infinite; }

    /* white highlight crescent — top-left of bubble */
    .soap-bubble::before {
        content: '';
        position: absolute;
        top: 6px; left: 10px;
        width: 30%; height: 18%;
        border-radius: 50%;
        background: rgba(255,255,255,0.22);
        pointer-events: none;
        transform: rotate(-20deg);
    }

    /* ── Drift animations ─────────────────────────────────────────────────── */
    @keyframes bubble-drift-a {
        0%   { translate: 0px 0px; }
        30%  { translate: 18px -28px; }
        60%  { translate: -12px -50px; }
        100% { translate: 8px -80px; }
    }
    @keyframes bubble-drift-b {
        0%   { translate: 0px 0px; }
        35%  { translate: -22px -20px; }
        65%  { translate: 10px -48px; }
        100% { translate: -16px -75px; }
    }
    @keyframes bubble-drift-c {
        0%   { translate: 0px 0px; }
        40%  { translate: 25px -15px; }
        70%  { translate: 5px -45px; }
        100% { translate: 20px -70px; }
    }
    @keyframes bubble-drift-d {
        0%   { translate: 0px 0px; }
        30%  { translate: -8px -35px; }
        60%  { translate: 15px -55px; }
        100% { translate: -5px -85px; }
    }

    .bubble-drift-a { animation: bubble-shimmer 4s linear infinite, bubble-drift-a var(--drift-dur,6s) ease-in-out forwards; }
    .bubble-drift-b { animation: bubble-shimmer 4s linear infinite, bubble-drift-b var(--drift-dur,6s) ease-in-out forwards; }
    .bubble-drift-c { animation: bubble-shimmer 4s linear infinite, bubble-drift-c var(--drift-dur,6s) ease-in-out forwards; }
    .bubble-drift-d { animation: bubble-shimmer 4s linear infinite, bubble-drift-d var(--drift-dur,6s) ease-in-out forwards; }

    /* ── Pop ──────────────────────────────────────────────────────────────── */
    @keyframes bubble-pop {
        0%   { transform: scale(1);   opacity: 1; }
        40%  { transform: scale(1.18); opacity: 0.8; }
        100% { transform: scale(0.1); opacity: 0; }
    }
    .bubble-popping {
        animation: bubble-pop 0.22s ease-in forwards !important;
        border-color: rgba(255,255,255,0.9) !important;
        box-shadow: 0 0 24px rgba(200,230,255,0.7) !important;
    }

    /* ── Pop particle ─────────────────────────────────────────────────────── */
    .bubble-particle {
        position: absolute;
        width: 5px; height: 5px;
        border-radius: 50%;
        opacity: 1;
        pointer-events: none;
        animation: bubble-particle-fly var(--fly-dur, 0.5s) ease-out forwards;
    }
    @keyframes bubble-particle-fly {
        0%   { translate: 0 0; opacity: 1; scale: 1; }
        100% { translate: var(--fx) var(--fy); opacity: 0; scale: 0.2; }
    }

    /* ── Event bubble (subs / bits) ───────────────────────────────────────── */
    .soap-bubble-event {
        max-width: 320px;
        min-width: 200px;
        padding: 16px 20px;
        border-radius: 28px;
        border-width: 2px;
        background: radial-gradient(ellipse at 30% 25%,
            rgba(255,255,255,0.22) 0%,
            rgba(200,180,255,0.10) 40%,
            rgba(10,5,30,0.70) 100%);
    }

    @keyframes event-bubble-pulse {
        0%,100% { box-shadow:
            inset 2px 3px 10px rgba(255,255,255,0.3),
            0 0 20px rgba(160,100,255,0.4),
            0 0 40px rgba(160,100,255,0.2); }
        50%     { box-shadow:
            inset 2px 3px 10px rgba(255,255,255,0.3),
            0 0 30px rgba(160,100,255,0.65),
            0 0 60px rgba(160,100,255,0.35); }
    }
    .soap-bubble-event.bubble-visible {
        animation: bubble-shimmer 3s linear infinite, event-bubble-pulse 2s ease-in-out infinite;
    }

    /* big sparkle particles for events */
    .bubble-sparkle {
        position: absolute;
        width: 8px; height: 8px;
        border-radius: 50%;
        pointer-events: none;
        animation: bubble-particle-fly var(--fly-dur, 0.7s) ease-out forwards;
    }

    /* ── Bubble inner layout ──────────────────────────────────────────────── */
    .bubble-username {
        font-weight: 700;
        font-size: var(--name-font-size, 15px);
        display: inline;
    }
    .bubble-message {
        display: inline;
        color: rgba(255,255,255,0.88);
    }
    .bubble-event-icon {
        display: block;
        font-size: 20px;
        text-align: center;
        margin-bottom: 4px;
    }
    .bubble-event-label {
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.5px;
        display: block;
        text-align: center;
        margin-bottom: 2px;
    }
    .bubble-event-detail {
        font-size: 11px;
        text-align: center;
        color: rgba(255,255,255,0.65);
        font-style: italic;
        display: block;
    }

    /* ── Hype train bubbles ───────────────────────────────────────────────── */
    .ht-bubble {
        position: absolute;
        width: 72px; height: 72px;
        border-radius: 50%;
        background: radial-gradient(ellipse at 30% 25%,
            rgba(255,255,255,0.2) 0%,
            rgba(255,140,50,0.12) 50%,
            rgba(15,5,0,0.65) 100%);
        border: 2px solid rgba(255,140,60,0.7);
        box-shadow:
            inset 2px 3px 8px rgba(255,255,255,0.2),
            0 0 14px rgba(255,110,30,0.35);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        opacity: 0;
        transform: scale(0);
        transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
    }
    .ht-bubble::before {
        content: '';
        position: absolute;
        top: 6px; left: 10px;
        width: 28%; height: 18%;
        border-radius: 50%;
        background: rgba(255,255,255,0.22);
        transform: rotate(-20deg);
    }
    .ht-bubble.ht-bubble-visible {
        opacity: 1;
        transform: scale(1);
    }
    .ht-bubble-icon  { font-size: 18px; line-height: 1; }
    .ht-bubble-level { font-size: 10px; font-weight: 800; color: rgba(255,200,100,0.9); letter-spacing: 0.5px; }

    @keyframes ht-bubble-bob-a {
        0%,100% { translate: 0 0; }
        50%     { translate: 6px -12px; }
    }
    @keyframes ht-bubble-bob-b {
        0%,100% { translate: 0 0; }
        50%     { translate: -8px -8px; }
    }
    @keyframes ht-bubble-bob-c {
        0%,100% { translate: 0 0; }
        50%     { translate: 10px -6px; }
    }
    @keyframes ht-bubble-shimmer {
        0%   { border-color: rgba(255,140,60,0.7); }
        33%  { border-color: rgba(255,80,200,0.6); }
        66%  { border-color: rgba(80,200,255,0.6); }
        100% { border-color: rgba(255,140,60,0.7); }
    }
    .ht-bubble-bob-a { animation: ht-bubble-shimmer 3s linear infinite, ht-bubble-bob-a var(--bob-dur,3s) ease-in-out infinite; }
    .ht-bubble-bob-b { animation: ht-bubble-shimmer 3s linear infinite, ht-bubble-bob-b var(--bob-dur,3s) ease-in-out infinite; }
    .ht-bubble-bob-c { animation: ht-bubble-shimmer 3s linear infinite, ht-bubble-bob-c var(--bob-dur,3s) ease-in-out infinite; }

    @keyframes ht-bubble-flyoff {
        0%   { opacity: 1; }
        100% { opacity: 0; translate: var(--flyoff-x, 0px) var(--flyoff-y, -300px); }
    }
    .ht-bubble-flying {
        animation: ht-bubble-flyoff 1.2s ease-in forwards !important;
    }
    `;
    document.head.appendChild(s);
})();

// ── Utilities ──────────────────────────────────────────────────────────────────
const _DRIFT_CLASSES = ['bubble-drift-a','bubble-drift-b','bubble-drift-c','bubble-drift-d'];
const _BOB_CLASSES   = ['ht-bubble-bob-a','ht-bubble-bob-b','ht-bubble-bob-c'];
const _SPARKLE_COLORS = [
    '#ffffff','#ffe0ff','#e0f0ff','#ffd0a0',
    '#c0e0ff','#ffb0e0','#b0ffe0','#fff0a0',
];

function _rand(min, max) { return min + Math.random() * (max - min); }
function _randInt(min, max) { return Math.floor(_rand(min, max + 1)); }
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _bubbleOverlay() { return document.getElementById('bubble-overlay'); }

// ── Pop effect ─────────────────────────────────────────────────────────────────
// Fires the pop animation on a bubble, spawns particles at its center,
// then removes the bubble element from the DOM.
function _popBubble(el, isEvent = false) {
    el.classList.add('bubble-popping');

    const rect   = el.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const count  = isEvent ? 16 : 9;
    const spread = isEvent ? 90 : 55;
    const dur    = isEvent ? 0.75 : 0.5;
    const overlay = _bubbleOverlay();

    for (let i = 0; i < count; i++) {
        const angle = (360 / count) * i + _rand(-15, 15);
        const dist  = _rand(spread * 0.5, spread);
        const fx    = Math.round(Math.cos(angle * Math.PI / 180) * dist);
        const fy    = Math.round(Math.sin(angle * Math.PI / 180) * dist);
        const size  = isEvent ? _rand(5, 10) : _rand(3, 6);

        const p = document.createElement('div');
        p.className = isEvent ? 'bubble-sparkle' : 'bubble-particle';
        p.style.cssText = `
            left:${cx - size/2}px; top:${cy - size/2}px;
            width:${size}px; height:${size}px;
            background:${_pick(_SPARKLE_COLORS)};
            --fx:${fx}px; --fy:${fy}px;
            --fly-dur:${dur + _rand(0, 0.2)}s;
        `;
        overlay.appendChild(p);
        setTimeout(() => p.remove(), (dur + 0.3) * 1000);
    }

    setTimeout(() => el.remove(), 250);
}

// ── Chat bubble ────────────────────────────────────────────────────────────────
// Replaces the normal chat message flow when chatStyle === 'bubbles'.
// Spawns a bubble at a random screen position, drifts it, then pops it.
function displayBubbleMessage(tags, parsedMessageHTML, isAction = false) {
    const overlay = _bubbleOverlay();
    if (!overlay) return;

    const username  = tags['display-name'] || tags.username || 'chatter';
    const userColor = tags.color || '#b0d0ff';
    const badgesHTML = typeof renderBadges === 'function' ? renderBadges(tags) : '';

    // /me styling
    let msgStyle = '';
    if (isAction && CONFIG.meStyle !== 'none') {
        msgStyle = CONFIG.meStyle === 'colored'
            ? `color:${userColor}`
            : CONFIG.meStyle === 'italic' ? 'font-style:italic' : '';
    }

    const el = document.createElement('div');
    el.className = 'soap-bubble';

    // Tag for moderation removal
    if (tags['id'])       el.dataset.msgId   = tags['id'];
    if (tags.username)    el.dataset.username = tags.username.toLowerCase();

    el.innerHTML = `
        <span class="badges">${badgesHTML}</span><span class="bubble-username" style="color:${userColor}">${escapeHTML(username)}</span>
        <span class="bubble-message"${msgStyle ? ` style="${msgStyle}"` : ''}> ${parsedMessageHTML}</span>`;

    // Random position — keep bubbles away from the very edge
    const maxL = Math.max(10, window.innerWidth  - 280);
    const maxT = Math.max(10, window.innerHeight - 120);
    el.style.left = _rand(5, maxL) + 'px';
    el.style.top  = _rand(5, maxT) + 'px';

    overlay.appendChild(el);

    // Phase 1 — blow up
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('bubble-visible')));

    // Phase 2 — start drifting after blow-up completes
    const driftDur = _rand(5, 9);
    setTimeout(() => {
        el.classList.add(_pick(_DRIFT_CLASSES));
        el.style.setProperty('--drift-dur', driftDur + 's');
    }, 450);

    // Phase 3 — pop at end of lifetime
    const lifetime = (CONFIG.messageLifetime > 0 ? CONFIG.messageLifetime : 8000);
    setTimeout(() => _popBubble(el, false), lifetime);

    // 7TV cosmetics
    if (tags['user-id'] && typeof apply7TVCosmetics === 'function') {
        apply7TVCosmetics(tags['user-id'], el);
    }
}

// ── Event bubble (subs / bits) ─────────────────────────────────────────────────
// Large glowing bubble centered on screen for big events.
function displayBubbleEvent(iconSvg, label, detail, typeClass) {
    // Only intercept subs and bits — other events stay as normal messages
    const isSpecial = typeClass.includes('sub-message') ||
                      typeClass.includes('gift-message') ||
                      typeClass.includes('bits-message');
    if (!isSpecial) return false; // caller should fall back to normal

    const overlay = _bubbleOverlay();
    if (!overlay) return true;

    const el = document.createElement('div');
    el.className = 'soap-bubble soap-bubble-event';

    // Center on screen
    el.style.left      = '50%';
    el.style.top       = '40%';
    el.style.transform = 'translateX(-50%) scale(0)';
    el.style.marginLeft = '0';

    el.innerHTML = `
        <span class="bubble-event-icon">${iconSvg}</span>
        <span class="bubble-event-label">${escapeHTML(label)}</span>
        <span class="bubble-event-detail">${escapeHTML(detail)}</span>`;

    overlay.appendChild(el);

    // Override transform to allow scale transition from center
    requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transform = 'translateX(-50%) scale(1)';
        el.style.opacity   = '1';
        el.classList.add('bubble-visible');
    }));

    // Pop after 5s
    setTimeout(() => {
        // Temporarily fix position so particles spawn correctly
        const rect = el.getBoundingClientRect();
        el.style.left      = rect.left + 'px';
        el.style.top       = rect.top  + 'px';
        el.style.transform = 'none';
        _popBubble(el, true);
    }, 5000);

    return true; // handled
}

// ── Hype Train bubble mode ─────────────────────────────────────────────────────
// Spawns N bubbles around the edges of the screen for the duration of the train.
// Exported functions are called from hype-train.js when chatStyle === 'bubbles'.

const HT_BUBBLE_COUNT = 5;
let _htBubbles = [];
let _htBubbleLevel = 1;

// Generate random edge positions — spread around the screen perimeter
function _edgePositions(n) {
    const positions = [];
    const margin    = 20;
    const bSize     = 72;
    const W = window.innerWidth,  H = window.innerHeight;

    for (let i = 0; i < n; i++) {
        const edge = i % 4; // 0=top, 1=right, 2=bottom, 3=left
        let x, y;
        switch (edge) {
            case 0: x = _rand(margin, W - bSize - margin); y = margin + _rand(0, 30); break;
            case 1: x = W - bSize - margin - _rand(0, 30); y = _rand(margin + bSize, H - bSize - margin); break;
            case 2: x = _rand(margin, W - bSize - margin); y = H - bSize - margin - _rand(0, 30); break;
            case 3: x = margin + _rand(0, 30);             y = _rand(margin + bSize, H - bSize - margin); break;
        }
        positions.push({ x, y, edge });
    }
    return positions;
}

function _buildHtBubble(pos, level) {
    const el = document.createElement('div');
    el.className = 'ht-bubble';
    el.style.left = pos.x + 'px';
    el.style.top  = pos.y + 'px';

    const bobClass = _pick(_BOB_CLASSES);
    const bobDur   = _rand(2.5, 4.5).toFixed(1);

    el.innerHTML = `<span class="ht-bubble-icon">🚂</span><span class="ht-bubble-level">LVL ${level}</span>`;
    el.dataset.bobClass = bobClass;
    el.dataset.bobDur   = bobDur;
    return el;
}

function bubbleHypeTrainShow(level) {
    const overlay = _bubbleOverlay();
    if (!overlay) return;
    _htBubbles.forEach(b => b.remove());
    _htBubbles = [];
    _htBubbleLevel = level ?? 1;

    const positions = _edgePositions(HT_BUBBLE_COUNT);
    positions.forEach((pos, i) => {
        const el = _buildHtBubble(pos, _htBubbleLevel);
        overlay.appendChild(el);
        _htBubbles.push(el);

        // staggered entrance
        setTimeout(() => {
            el.classList.add('ht-bubble-visible');
            // start bobbing only after entrance
            setTimeout(() => {
                el.classList.add(el.dataset.bobClass);
                el.style.setProperty('--bob-dur', el.dataset.bobDur + 's');
            }, 450);
        }, i * 120);
    });
}

function bubbleHypeTrainUpdate(level) {
    _htBubbleLevel = level ?? _htBubbleLevel;
    _htBubbles.forEach(el => {
        const lvlEl = el.querySelector('.ht-bubble-level');
        if (lvlEl) lvlEl.textContent = `LVL ${_htBubbleLevel}`;
        // brief flash
        el.style.transition = 'box-shadow 0.1s';
        el.style.boxShadow  = '0 0 30px rgba(255,200,50,0.8)';
        setTimeout(() => { el.style.boxShadow = ''; el.style.transition = ''; }, 300);
    });
}

function bubbleHypeTrainEnd() {
    _htBubbles.forEach((el, i) => {
        const angle = _rand(-40, 40); // fly up with slight angle
        const fx    = Math.round(Math.sin(angle * Math.PI / 180) * 200);
        const fy    = -_rand(250, 400);
        el.style.setProperty('--flyoff-x', fx + 'px');
        el.style.setProperty('--flyoff-y', fy + 'px');

        setTimeout(() => {
            el.classList.remove(..._BOB_CLASSES);
            el.classList.add('ht-bubble-flying');
            setTimeout(() => el.remove(), 1300);
        }, i * 100);
    });
    _htBubbles = [];
}