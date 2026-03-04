// ─── config/ui.js ─────────────────────────────────────────────────────────────
// All interactive UI behaviour on the configurator page.
// Keeps visual logic separate from auth (auth.js) and URL generation (generate.js).

// Toggles an accordion panel open or closed.
// Locked accordions (before login) are ignored.
function toggleAccordion(id) {
    const el = document.getElementById(id);
    if (el.classList.contains('locked')) return;
    el.classList.toggle('open');
}

// Shows or hides the color/label options panel for an event type.
// Called by the event toggle checkboxes via onchange.
function toggleEventOptions(checkboxId, optionsId) {
    const checked = document.getElementById(checkboxId).checked;
    document.getElementById(optionsId).classList.toggle('visible', checked);
}

// When "Disable ALL badges" is checked, grey out and uncheck the dependent
// badge options so it's clear they have no effect while the kill switch is on.
function onDisableAllBadgesChange() {
    const disabled = document.getElementById('disableAllBadges').checked;
    ['roleOnlyBadges', 'showExternalCosmetics'].forEach(id => {
        const wrapper = document.getElementById(id).closest('.checkbox-wrapper');
        if (disabled) {
            document.getElementById(id).checked = false;
            wrapper.style.opacity       = '0.35';
            wrapper.style.pointerEvents = 'none';
        } else {
            wrapper.style.opacity       = '';
            wrapper.style.pointerEvents = '';
        }
    });
}

// Wire up all opacity sliders so their percentage label updates live as you drag
window.addEventListener('load', () => {
    document.querySelectorAll('.opacity-slider').forEach(slider => {
        const label = document.getElementById(slider.id + 'Label');
        if (label) slider.addEventListener('input', () => { label.textContent = slider.value + '%'; });
    });
});