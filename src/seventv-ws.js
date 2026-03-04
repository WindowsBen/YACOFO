// ─── seventv-ws.js ────────────────────────────────────────────────────────────
// Manages a single shared WebSocket connection to the 7TV EventSub API.
// Both emote set updates (seventv.js emotes) and user cosmetic updates
// (badges/seventv.js) route through here to avoid opening multiple connections.
//
// Subscriptions are keyed by "type:objectId" so each user and emote set gets
// its own independent handler slot without overwriting others.
// On disconnect, all active subscriptions are automatically re-sent.

// "type:objectId" → callback(body) — one slot per unique subscription
const _7tvHandlers = {};
// Full list of active subscriptions, used to re-subscribe after reconnect
const _7tvSubs = [];

let _7tvWS    = null;   // the live WebSocket instance
let _7tvReady = false;  // true once the socket's onopen has fired
const _7tvQueue = [];   // payloads queued before the socket was ready

// Returns the active WebSocket, creating it if it doesn't exist yet
function get7TVWS() {
    if (_7tvWS) return _7tvWS;

    _7tvWS = new WebSocket('wss://events.7tv.io/v3');

    _7tvWS.onopen = () => {
        _7tvReady = true;
        console.log('[7TV WS] Connected');
        // Flush any subscriptions that were queued before the socket opened
        for (const sub of _7tvQueue) _7tvWS.send(JSON.stringify(sub));
        _7tvQueue.length = 0;
    };

    _7tvWS.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        if (msg.op !== 0) return; // op 0 = Dispatch; ignore heartbeats and acks

        const type     = msg.d?.type;
        const body     = msg.d?.body;
        // objectId identifies which specific user or emote set this event is for
        const objectId = body?.id || body?.object?.id;

        // Route to the specific handler registered for this type+object pair
        const key = `${type}:${objectId}`;
        if (_7tvHandlers[key]) {
            _7tvHandlers[key](body);
            return;
        }
        // Fallback for handlers registered without a specific objectId
        if (_7tvHandlers[type]) {
            _7tvHandlers[type](body);
        }
    };

    _7tvWS.onclose = () => {
        console.warn('[7TV WS] Closed — reconnecting in 5s...');
        _7tvWS    = null;
        _7tvReady = false;
        setTimeout(() => {
            get7TVWS();
            // Re-subscribe all active subscriptions after reconnect
            _7tvSubs.forEach(({ type, objectId }) => _sendSub(type, objectId));
        }, 5000);
    };

    _7tvWS.onerror = (err) => console.error('[7TV WS] Error:', err);

    return _7tvWS;
}

// Sends a subscribe payload (op 35) or queues it if the socket isn't ready yet
function _sendSub(type, objectId) {
    const payload = { op: 35, d: { type, condition: { object_id: objectId } } };
    if (_7tvReady && _7tvWS?.readyState === WebSocket.OPEN) {
        _7tvWS.send(JSON.stringify(payload));
    } else {
        _7tvQueue.push(payload);
        get7TVWS(); // ensure the socket is being created
    }
}

// Registers a handler and sends a subscribe request to the 7TV server.
// Safe to call multiple times — deduplicates the _7tvSubs list.
function subscribe7TV(type, objectId, handler) {
    const key = objectId ? `${type}:${objectId}` : type;
    _7tvHandlers[key] = handler;

    // Only track each unique subscription once (for reconnect replay)
    if (!_7tvSubs.find(s => s.type === type && s.objectId === objectId)) {
        _7tvSubs.push({ type, objectId });
    }

    _sendSub(type, objectId);
    console.log(`[7TV WS] Subscribed to ${type} for ${objectId}`);
}

// Removes a handler and sends an unsubscribe request (op 36) to the server.
// Called by the LRU cache in badges/seventv.js when a user is evicted.
function unsubscribe7TV(type, objectId) {
    const key = objectId ? `${type}:${objectId}` : type;
    delete _7tvHandlers[key];

    // Remove from the reconnect list so evicted users aren't re-subscribed
    const idx = _7tvSubs.findIndex(s => s.type === type && s.objectId === objectId);
    if (idx !== -1) _7tvSubs.splice(idx, 1);

    const payload = { op: 36, d: { type, condition: { object_id: objectId } } };
    if (_7tvReady && _7tvWS?.readyState === WebSocket.OPEN) {
        _7tvWS.send(JSON.stringify(payload));
    }
    console.log(`[7TV WS] Unsubscribed from ${type} for ${objectId}`);
}