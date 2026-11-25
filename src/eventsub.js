// ─── eventsub.js ──────────────────────────────────────────────────────────────
// Connects to Twitch EventSub via WebSocket to receive channel events.
// Replaces the legacy PubSub connection (shut down by Twitch).
//
// Flow:
//   1. Connect to wss://eventsub.wss.twitch.tv/ws
//   2. Receive session_welcome → POST subscriptions to Helix API
//   3. Receive notification messages → dispatch to handlers in poll.js,
//      prediction.js, hype-train.js, and redemptions.js
//   4. Watch for session_keepalive — if none arrives within the timeout, reconnect
//   5. On session_reconnect → connect to provided URL (subscriptions transfer automatically)
//
// Subscription types used:
//   channel.channel_points_custom_reward_redemption.add
//   channel.raid  (from_broadcaster_user_id condition — outgoing raids only)
//   channel.poll.begin / .progress / .end
//   channel.prediction.begin / .progress / .lock / .end
//   channel.hype_train.begin / .progress / .end

let _esWS             = null;
let _esChannelId      = null;
let _esReconnectMs    = 1000;    // starts at 1s, doubles up to 120s on failure
let _esKeepaliveTimer = null;    // watchdog — reset on every incoming message
let _esKeepaliveMs    = 15_000;  // updated from session_welcome (timeout + 5s grace)

const _ES_URL = 'wss://eventsub.wss.twitch.tv/ws';

function connectEventSub(channelId) {
    if (!CONFIG.token) return;
    _esChannelId = channelId;
    _esConnect(_ES_URL, false);
}

function _esConnect(url, isReconnect) {
    _esWS = new WebSocket(url);

    _esWS.onopen = () => {
        console.log('[EventSub] Connected');
        _esReconnectMs = 1000;
    };

    _esWS.onmessage = (rawEvent) => {
        let msg;
        try { msg = JSON.parse(rawEvent.data); } catch { return; }

        // Any message resets the keepalive watchdog
        _esResetKeepalive();

        const type = msg.metadata?.message_type;

        if (type === 'session_welcome') {
            const session = msg.payload?.session;
            if (!session) return;
            console.log('[EventSub] Session:', session.id);
            // Server sends keepalives every keepalive_timeout_seconds; we add 5s grace
            _esKeepaliveMs = ((session.keepalive_timeout_seconds ?? 10) + 5) * 1000;
            _esResetKeepalive();
            if (!isReconnect) {
                _esSubscribeAll(session.id, _esChannelId);
            } else {
                console.log('[EventSub] Reconnected — subscriptions auto-migrated');
            }

        } else if (type === 'session_keepalive') {
            // Watchdog already reset above

        } else if (type === 'session_reconnect') {
            const reconnectUrl = msg.payload?.session?.reconnect_url;
            if (!reconnectUrl) return;
            console.log('[EventSub] Server requested reconnect');
            // Null out the current socket's onclose so it doesn't trigger a
            // fresh reconnect to _ES_URL when Twitch closes it on their side
            const oldWS = _esWS;
            if (oldWS) oldWS.onclose = null;
            _esConnect(reconnectUrl, true);

        } else if (type === 'notification') {
            _esDispatch(msg.metadata?.subscription_type, msg.payload?.event);

        } else if (type === 'revocation') {
            console.warn('[EventSub] Subscription revoked:', msg.payload?.subscription?.type, '—', msg.payload?.subscription?.status);
        }
    };

    _esWS.onerror = () => {
        console.warn('[EventSub] WebSocket error');
    };

    _esWS.onclose = () => {
        console.log('[EventSub] Disconnected — reconnecting in', _esReconnectMs, 'ms');
        clearTimeout(_esKeepaliveTimer);
        setTimeout(() => _esConnect(_ES_URL, false), _esReconnectMs);
        _esReconnectMs = Math.min(_esReconnectMs * 2, 120_000);
    };
}

function _esResetKeepalive() {
    clearTimeout(_esKeepaliveTimer);
    _esKeepaliveTimer = setTimeout(() => {
        console.warn('[EventSub] Keepalive timeout — reconnecting');
        if (_esWS) {
            _esWS.onclose = null;
            _esWS.close();
        }
        _esConnect(_ES_URL, false);
    }, _esKeepaliveMs);
}

// POST one subscription to the Helix API and log the result.
// Failures are non-fatal — the overlay still works for other event types.
async function _esSubscribe(sessionId, type, version, condition) {
    try {
        const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method:  'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.token}`,
                'Client-Id':     CONFIG.clientId,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({
                type,
                version,
                condition,
                transport: { method: 'websocket', session_id: sessionId },
            }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.warn(`[EventSub] Subscription failed for ${type}: HTTP ${res.status}`, body);
            if (res.status === 401) showTokenError();
        } else {
            console.log(`[EventSub] Subscribed: ${type}`);
        }
    } catch (err) {
        console.warn(`[EventSub] Subscription error for ${type}:`, err);
    }
}

async function _esSubscribeAll(sessionId, channelId) {
    const bc = { broadcaster_user_id: channelId };
    await Promise.allSettled([
        _esSubscribe(sessionId, 'channel.channel_points_custom_reward_redemption.add', '1', bc),
        _esSubscribe(sessionId, 'channel.raid',               '1', { from_broadcaster_user_id: channelId }),
        _esSubscribe(sessionId, 'channel.poll.begin',         '1', bc),
        _esSubscribe(sessionId, 'channel.poll.progress',      '1', bc),
        _esSubscribe(sessionId, 'channel.poll.end',           '1', bc),
        _esSubscribe(sessionId, 'channel.prediction.begin',   '1', bc),
        _esSubscribe(sessionId, 'channel.prediction.progress','1', bc),
        _esSubscribe(sessionId, 'channel.prediction.lock',    '1', bc),
        _esSubscribe(sessionId, 'channel.prediction.end',     '1', bc),
        _esSubscribe(sessionId, 'channel.hype_train.begin',   '1', bc),
        _esSubscribe(sessionId, 'channel.hype_train.progress','1', bc),
        _esSubscribe(sessionId, 'channel.hype_train.end',     '1', bc),
    ]);
}

// Routes an incoming notification to the right handler
function _esDispatch(subscriptionType, event) {
    if (!event) return;
    switch (subscriptionType) {
        case 'channel.channel_points_custom_reward_redemption.add':
            _esHandleRedemption(event);
            break;
        case 'channel.raid':
            _esHandleRaid(event);
            break;
        case 'channel.poll.begin':
        case 'channel.poll.progress':
        case 'channel.poll.end':
            handleEventSubPoll(subscriptionType, event);
            break;
        case 'channel.prediction.begin':
        case 'channel.prediction.progress':
        case 'channel.prediction.lock':
        case 'channel.prediction.end':
            handleEventSubPrediction(subscriptionType, event);
            break;
        case 'channel.hype_train.begin':
        case 'channel.hype_train.progress':
        case 'channel.hype_train.end':
            handleEventSubHypeTrain(subscriptionType, event);
            break;
    }
}

// ── Redemptions ───────────────────────────────────────────────────────────────
// EventSub event shape:
//   event.id            — unique redemption UUID
//   event.reward.id     — reward ID
//   event.reward.title  — reward name
//   event.user_name     — display name
//   event.user_input    — optional typed message

function _esHandleRedemption(event) {
    const rewardId     = event.reward?.id    || '';
    const rewardName   = event.reward?.title || 'Channel Point Reward';
    const username     = event.user_name     || event.user_login || '';
    const userInput    = event.user_input    || '';
    const redemptionId = event.id            || '';

    // Cache reward name so the IRC fallback path can use it without fetching
    if (rewardId) rewardNameCache[rewardId] = rewardName;

    handlePubSubRedemption(rewardId, rewardName, username, userInput, redemptionId);
}

// ── Outgoing raid ─────────────────────────────────────────────────────────────
// EventSub fires once when the raid actually sends — no live countdown.
// event.to_broadcaster_user_name — target channel display name
// event.viewers                  — final viewer count

function _esHandleRaid(event) {
    if (!CONFIG.showRaidOutgoing) return;
    const targetName = event.to_broadcaster_user_name || event.to_broadcaster_user_login || '';
    const viewers    = Number(event.viewers) || 0;
    handleRaidOutgoing(targetName, viewers);
}
