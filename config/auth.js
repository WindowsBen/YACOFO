// ─── config/auth.js ───────────────────────────────────────────────────────────
// Twitch OAuth implicit flow for the configurator page.
// On login, Twitch redirects back with an access_token in the URL hash.
// The token is stored in localStorage so it persists across sessions and
// can be automatically embedded in the generated OBS URL.

const CLIENT_ID       = 'ti9ahr6lkym6anpij3d4f2cyjhij18';
// Accordion section IDs that stay locked (disabled) until the user logs in
const LOCKED_SECTIONS = ['acc-general', 'acc-events', 'acc-badges', 'acc-generate'];

// Redirects to Twitch's OAuth page — on return, handleOAuthRedirect() picks up the token
function loginWithTwitch() {
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    authUrl.searchParams.set('client_id',     CLIENT_ID);
    authUrl.searchParams.set('redirect_uri',  redirectUri);
    authUrl.searchParams.set('response_type', 'token');  // implicit flow — no server needed
    authUrl.searchParams.set('scope',         'user:read:chat channel:read:redemptions');
    window.location.href = authUrl.toString();
}

// Updates the UI to show the logged-in state and unlocks all config sections
function setLoggedIn() {
    document.getElementById('status-dot').className     = 'dot dot-green';
    document.getElementById('status-text').textContent  = 'Connected ✓';
    document.getElementById('auth-btn').style.display   = 'none';
    document.getElementById('reauth-btn').style.display = 'inline-flex';
    const badge = document.getElementById('login-badge');
    badge.textContent = 'Connected';
    badge.classList.remove('locked-badge');
    LOCKED_SECTIONS.forEach(id => document.getElementById(id).classList.remove('locked'));
}

// Fetches the logged-in user's Twitch login/display name and pre-fills the channel field
async function fetchAndStoreUsername(token) {
    try {
        const res = await fetch('https://api.twitch.tv/helix/users', {
            headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': CLIENT_ID }
        });
        if (!res.ok) return;
        const data = await res.json();
        const user = data.data?.[0];
        if (!user) return;
        localStorage.setItem('twitch_username', user.login);
        document.getElementById('channel').value           = user.login;
        document.getElementById('login-badge').textContent = user.display_name;
        document.getElementById('status-text').textContent = `Connected as ${user.display_name} ✓`;
    } catch { /* silent — non-critical, user can type channel name manually */ }
}

// Checks if Twitch just redirected back with a token in the URL hash.
// Strips the hash from the URL so the token doesn't linger in browser history.
function handleOAuthRedirect() {
    const hash = window.location.hash;
    if (!hash) return false;
    const p     = new URLSearchParams(hash.slice(1));
    const token = p.get('access_token');
    if (!token) return false;
    localStorage.setItem('twitch_access_token', token);
    localStorage.removeItem('twitch_username'); // force re-fetch on fresh login
    history.replaceState(null, '', window.location.pathname);
    return true;
}

window.addEventListener('load', async () => {
    const freshLogin = handleOAuthRedirect();

    // Lock all sections by default — unlock only after auth is confirmed
    LOCKED_SECTIONS.forEach(id => document.getElementById(id).classList.add('locked'));

    const token = localStorage.getItem('twitch_access_token');
    if (token) {
        setLoggedIn();
        if (freshLogin) {
            // Fresh login — fetch and cache the username from Helix
            await fetchAndStoreUsername(token);
        } else {
            // Returning visit — restore cached username without an API call
            const username = localStorage.getItem('twitch_username');
            if (username) {
                document.getElementById('channel').value           = username;
                document.getElementById('login-badge').textContent = username;
                document.getElementById('status-text').textContent = `Connected as ${username} ✓`;
            }
        }
    }
});