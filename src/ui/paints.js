// ─── ui/paints.js ─────────────────────────────────────────────────────────────
// Converts 7TV paint objects into CSS and applies them to DOM elements
// (username spans, and message-text spans for /me colored actions).
//
// Why injected <style> tags instead of inline styles?
// OBS's browser source silently drops -webkit-background-clip when set via
// element.style, which breaks gradient paints. A real <style> block works fine.
// Each paint gets a unique generated class name so multiple users can have
// different paints simultaneously without collision.

// Incremented for each new paint applied — ensures unique class names
let paintClassCounter = 0;

// Applies a 7TV paint to a DOM element by injecting a CSS class.
// The <style> tag is stored with data-paint so it can be removed on refresh.
function applyPaint(element, paint) {
    if (!paint) return;

    const className = `seventv-paint-${++paintClassCounter}`;
    const css = buildPaintCSS(`.${className}`, paint);
    if (!css) return;

    const styleTag = document.createElement('style');
    styleTag.textContent    = css;
    styleTag.dataset.paint  = className; // used to find and remove this style on update
    document.head.appendChild(styleTag);

    element.classList.add(className);
    element.style.display    = 'inline-block'; // required for background-clip to work
    element.style.textShadow = 'none';         // paint manages its own shadows via filter
}

// Builds the full CSS rule for a given paint and selector
function buildPaintCSS(selector, paint) {
    const gradientCSS = buildPaintGradient(paint);
    const shadowCSS   = buildPaintShadows(paint);

    if (!gradientCSS && !shadowCSS) return null;

    let rules = '';

    if (gradientCSS) {
        // Clip the gradient to the text shape so it colours only the glyphs
        rules += `
    background-image: ${gradientCSS};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;`;

        // Image-based paints need explicit sizing so the image covers the text
        if (paint.function === 'URL') {
            rules += `
    background-size: auto 100%;
    background-repeat: repeat-x;`;
        }
    }

    if (shadowCSS) {
        // Shadows are applied as CSS filter drop-shadow rather than text-shadow
        // because text-shadow doesn't work when text-fill-color is transparent
        rules += `
    filter: ${shadowCSS};`;
    }

    return `${selector} {${rules}\n}`;
}

// Converts a 7TV paint's gradient definition to a CSS gradient string
function buildPaintGradient(paint) {
    const stops = (paint.stops || []).map(s =>
        `${intToRGBA(s.color)} ${(s.at * 100).toFixed(1)}%`
    );

    switch (paint.function) {
        case 'LINEAR_GRADIENT': {
            const angle  = paint.angle ?? 90;
            const repeat = paint.repeat ? 'repeating-linear-gradient' : 'linear-gradient';
            return `${repeat}(${angle}deg, ${stops.join(', ')})`;
        }
        case 'RADIAL_GRADIENT': {
            const repeat = paint.repeat ? 'repeating-radial-gradient' : 'radial-gradient';
            return `${repeat}(circle, ${stops.join(', ')})`;
        }
        case 'CONIC_GRADIENT': {
            const angle = paint.angle ?? 0;
            return `conic-gradient(from ${angle}deg, ${stops.join(', ')})`;
        }
        case 'URL': {
            // Animated/image paint — use the raw image as a background
            return paint.image_url ? `url('${paint.image_url}')` : null;
        }
        default: {
            // Unknown type — fall back to a flat color from the first stop
            if (!stops.length) return null;
            const c = intToRGBA(paint.stops[0].color);
            return `linear-gradient(${c}, ${c})`;
        }
    }
}

// Converts 7TV shadow definitions to CSS filter: drop-shadow() chains
function buildPaintShadows(paint) {
    if (!paint.shadows?.length) return null;
    return paint.shadows.map(s =>
        `drop-shadow(${s.x_offset}px ${s.y_offset}px ${s.radius}px ${intToRGBA(s.color)})`
    ).join(' ');
}

// 7TV encodes all colors as signed 32-bit integers in RGBA byte order.
// We convert to CSS rgba() by unpacking each byte.
function intToRGBA(int) {
    const unsigned = int >>> 0; // treat as unsigned
    const r = (unsigned >> 24) & 0xff;
    const g = (unsigned >> 16) & 0xff;
    const b = (unsigned >> 8)  & 0xff;
    const a = ((unsigned & 0xff) / 255).toFixed(3);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}