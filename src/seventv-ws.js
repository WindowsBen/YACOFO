// ─── seventv-ws.js ────────────────────────────────────────────────────────────
// Single shared WebSocket connection to the 7TV EventSub.
// Both emote set updates and user cosmetic updates subscribe through this.

const _7tvHandlers = {}; // topic → callback(body)

let _7tvWS       = null;
let _7tvReady    = false;
const _7tvQueue  = []; // subscriptions requested before WS was open

function get7TVWS() {
    if (_7tvWS) return _7tvWS;

    _7tvWS = new WebSocket('wss://events.7tv.io/v3');

    _7tvWS.onopen = () => {
        _7tvReady = true;
        console.log('[7TV WS] Connected');
        // Flush any subscriptions that were queued before open
        for (const sub of _7tvQueue) {
            _7tvWS.send(JSON.stringify(sub));
        }
        _7tvQueue.length = 0;
    };

    _7tvWS.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.op !== 0) return; // op 0 = Dispatch

        const type = msg.d?.type;
        const body = msg.d?.body;
        if (type && _7tvHandlers[type]) {
            _7tvHandlers[type](body);
        }
    };

    _7tvWS.onclose = () => {
        console.warn('[7TV WS] Closed — reconnecting in 5s...');
        _7tvWS   = null;
        _7tvReady = false;
        setTimeout(() => {
            // Re-subscribe everything after reconnect
            const subs = Object.keys(_7tvHandlers);
            get7TVWS(); // triggers reconnect
        }, 5000);
    };

    _7tvWS.onerror = (err) => console.error('[7TV WS] Error:', err);

    return _7tvWS;
}

function subscribe7TV(type, objectId, handler) {
    _7tvHandlers[type] = handler;

    const sub = {
        op: 35,
        d:  { type, condition: { object_id: objectId } }
    };

    if (_7tvReady && _7tvWS?.readyState === WebSocket.OPEN) {
        _7tvWS.send(JSON.stringify(sub));
    } else {
        _7tvQueue.push(sub);
        get7TVWS(); // ensure connection is started
    }

    console.log(`[7TV WS] Subscribed to ${type} for ${objectId}`);
}