# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, personalized "gift reveal" web experience for an anniversary present. It's accessed by scanning a printed QR code and walks through an animated "diary that opens" before revealing a PDF diary (365 daily entries) to read online or download. No backend, no build step — static HTML/CSS/JS meant to be deployed as-is (e.g. Vercel/Netlify) and opened on a phone.

## Commands

There is no package manager, build step, linter, or test suite — it's plain HTML/CSS/JS loaded directly by the browser.

To preview locally with working relative paths (don't just double-click `index.html`; GSAP/fonts load fine via `file://` but it's safer to serve it):

```
python -m http.server 5173
```

This matches the `.claude/launch.json` dev server config used by the Claude Code browser preview tool (`preview_start` with name `diario-dev`).

## Architecture

Three files drive everything:

- **`index.html`** — all markup for three "screens" (`#screen-cover`, `#screen-message`, `#screen-reveal`), each a `<section class="screen">`. Only one is visible at a time via the `.hidden` CSS class, toggled from JS — there is no router/framework.
- **`style.css`** — all visual design lives here via CSS custom properties in `:root` (colors, fonts). The palette is deliberately romantic/elegant (bordeaux/gold/cream); change the experience's look by editing the tokens, not by hunting for hardcoded colors.
- **`script.js`** — a small state machine (`showScreen()`) plus a GSAP timeline per transition (`playOpening()`, `goToMessage()`, `goToReveal()`, `resetToCover()`). GSAP is loaded from a CDN (`gsap@3.12.5`) in `index.html`, no npm install needed.

### Flow / state

1. **Cover** — tap/click (or Enter/Space, it's keyboard-accessible via `role="button"`) on `#book` triggers `playOpening()`, a GSAP timeline that rotates `.book-cover` in 3D (`rotateY`) to reveal `.book-inside`, then fades to the message screen.
2. **Message** — personal message + photos fade in with a GSAP stagger, ending on a "Continua" button.
3. **Reveal** — shows the PDF actions (`assets/pdf/diario.pdf`: "Leggi online" opens it, "Scarica il diario" downloads it) and sets `localStorage['diario-opened'] = 'true'`.
4. On any later page load, if that localStorage key is set, `goToReveal({ animate: false })` skips straight to the reveal screen (the experience is meant to be revisited, not one-shot). A "Rivivi l'apertura" link resets back to the cover screen without clearing localStorage, so a fresh visit still jumps straight to the reveal.

### iOS/Safari considerations

Since this is opened from a QR code mostly on iPhones, Safari-specific CSS is intentionally present and should be preserved when editing: `-webkit-backface-visibility: hidden` + `-webkit-transform-style: preserve-3d` on `.book-cover` (avoids a mirrored-flash glitch mid-rotation on WebKit), `env(safe-area-inset-*)` padding on `.screen` (notch/home-indicator), and `100dvh` fallbacks alongside `100vh`.

### Placeholder content to replace before shipping

Several things are intentionally placeholders, grep for them before deploying:
- `[Nome di lei]` in `index.html` (`.cover-name`) — the recipient's name.
- The four `.message-line` paragraphs in `#screen-message` — the personal message text.
- The `📷 foto N` boxes (`.placeholder-img`) in `#screen-message` and `#screen-reveal` — replace with real `<img>` tags.
- `assets/pdf/diario.pdf` — currently a tiny hand-written placeholder PDF; replace with the real 365-day diary PDF (keep the same filename/path, or update the two `href`s in `#screen-reveal`).
