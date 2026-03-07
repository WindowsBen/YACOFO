// ─── preview.js ───────────────────────────────────────────────────────────────
// Drives the overlay in preview mode with hardcoded fake data.
// Called from main.js when CONFIG.preview === true.
// Injects fake chat messages, event messages, and widget states so the
// configurator preview shows a realistic representation of all active features.

function startPreviewMode() {
    // Dark transparent overlay so the preview background is visible
    document.body.style.background = 'transparent';

    const CHANNEL = '#preview';

    // ── Fake chat messages ────────────────────────────────────────────────────
    const messages = [
        {
            tags: {
                'display-name': 'WindowsBen',
                username: 'windowsben',
                color: '#FF4500',
                badges: { broadcaster: '1' },
                id: 'prev-1', 'user-id': '100001',
            },
            text: "Welcome to the stream! Let's go chat 🎉",
        },
        {
            tags: {
                'display-name': 'TotlessMod',
                username: 'totlessmod',
                color: '#00FF7F',
                badges: { moderator: '1', subscriber: '12' },
                id: 'prev-2', 'user-id': '100002',
            },
            text: 'Looking great today! The new overlay is fire',
        },
        {
            tags: {
                'display-name': 'CoolViewer99',
                username: 'coolviewer99',
                color: '#9B59B6',
                badges: { subscriber: '0' },
                id: 'prev-3', 'user-id': '100003',
            },
            text: 'First time here, loving this stream already',
        },
        {
            tags: {
                'display-name': 'StreamFan42',
                username: 'streamfan42',
                color: '#1ABC9C',
                badges: { vip: '1' },
                id: 'prev-4', 'user-id': '100004',
                'msg-id': CONFIG.showHighlights ? 'highlighted-message' : '',
            },
            text: CONFIG.showHighlights
                ? '✨ This is a highlighted message!'
                : 'Hey everyone, hype in chat!',
        },
        {
            tags: {
                'display-name': 'ChatLurker',
                username: 'chatlurker',
                color: '#E74C3C',
                badges: { subscriber: '3' },
                id: 'prev-5', 'user-id': '100005',
            },
            text: 'cheer100 This stream is absolutely amazing!',
        },
        {
            tags: {
                'display-name': 'NightOwl',
                username: 'nightowl',
                color: '#3498DB',
                badges: {},
                id: 'prev-6', 'user-id': '100006',
            },
            text: 'Just dropped by to say hi 👋',
            isAction: true,
        },
    ];

    messages.forEach(({ tags, text, isAction }, i) => {
        setTimeout(() => displayMessage(tags, text, !!isAction), i * 380);
    });

    const afterChat = messages.length * 380 + 300;

    // ── Event messages ────────────────────────────────────────────────────────

    if (CONFIG.showResubs) {
        setTimeout(() => handleResub(
            CHANNEL, 'CoolViewer99',
            { months: 6, 'msg-param-streak-months': 3 },
            'Still here after 6 months, worth every penny!',
            { 'display-name': 'CoolViewer99', username: 'coolviewer99', color: '#9B59B6', badges: { subscriber: '6' }, id: 'prev-ev1' }
        ), afterChat + 200);
    }

    if (CONFIG.showGifts) {
        setTimeout(() => handleSubgift(
            CHANNEL, 'StreamFan42', 1, 'StreamFan42',
            { 'msg-param-recipient-display-name': 'LuckyRecipient', months: 1 },
            { 'display-name': 'StreamFan42', username: 'streamfan42', color: '#1ABC9C', badges: { subscriber: '0', vip: '1' }, id: 'prev-ev2' }
        ), afterChat + 600);
    }

    if (CONFIG.showRaidIncoming) {
        setTimeout(() => handleRaidIncoming(
            CHANNEL, 'BigRaider',  250,
            { 'msg-param-viewerCount': '250', 'display-name': 'BigRaider' }
        ), afterChat + 1000);
    }

    if (CONFIG.showRaidOutgoing) {
        setTimeout(() => handleRaidOutgoing('FriendlyStreamer', 120),
            afterChat + 1400);
    }

    if (CONFIG.showRedeems) {
        setTimeout(() => renderRedemption('StreamFan42', 'Hydrate!', null),
            afterChat + 1800);
    }

    // ── Widgets ───────────────────────────────────────────────────────────────

    if (CONFIG.showPolls) {
        setTimeout(() => {
            const fakePoll = {
                title: 'What game should I play next?',
                choices: [
                    { title: 'Elden Ring',       votes: { total: 312 } },
                    { title: 'Hollow Knight',     votes: { total: 189 } },
                    { title: 'Celeste',           votes: { total: 97  } },
                    { title: 'Hades II',          votes: { total: 220 } },
                ],
                duration_seconds: 60,
            };
            _showPoll(fakePoll, false);
            // Tick the poll countdown down from the real expiry
            fakePoll.ends_at = new Date(Date.now() + 60_000).toISOString();
        }, afterChat + 400);
    }

    if (CONFIG.showPredictions) {
        setTimeout(() => {
            const fakePred = {
                title: 'Will I beat the boss first try?',
                status: 'ACTIVE',
                prediction_window_seconds: 120,
                created_at: new Date().toISOString(),
                outcomes: [
                    {
                        id: 'prev-outcome-0',
                        title: 'Yes, ez clap',
                        color: 'BLUE',
                        total_points: 48200,
                        total_users: 143,
                    },
                    {
                        id: 'prev-outcome-1',
                        title: 'No chance',
                        color: 'PINK',
                        total_points: 21800,
                        total_users: 87,
                    },
                ],
            };
            _showPrediction(fakePred, 'open');
        }, afterChat + 800);
    }

    if (CONFIG.showHypeTrain) {
        setTimeout(() => {
            const fakeTrain = {
                progress: {
                    value:      18400,
                    goal:       77110,
                    level:      2,
                    expires_at: new Date(Date.now() + 240_000).toISOString(),
                    total:      18400,
                },
            };
            _showHypeTrain(fakeTrain);
        }, afterChat + 1200);
    }
}