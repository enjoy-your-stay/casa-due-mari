# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, dependency-free multilingual guest check-in guide for the vacation rental
"La Casa dei Due Mari" (Via Suri 3, San Vito, Taranto). Guests scan a QR / open a link,
pick a language, and get step-by-step contactless check-in instructions (gate codes,
parking spot, key safe, WhatsApp contacts).

## Running / developing

There is no build step, package manager, linter, or test suite. Edit the HTML/CSS/JS
directly. Preview by running a static server from the repo root, e.g.
`python3 -m http.server` — opening `index.html` via `file://` will not work because the
page fetches the translation JSON. Deployed as a static site from `main` (GitHub org
`enjoy-your-stay`).

## Architecture

- **One single page for every language: `index.html`.** It holds the markup and CSS
  classes once. Translatable elements carry `data-i18n="key"` (element content, injected as
  HTML) or `data-i18n-alt="key"` (the `alt` attribute). The Italian text sits inline in
  `index.html` as a fallback shown if JS or the fetch fails.
- **`script/i18n.js`** is the loader (vanilla, zero deps). It picks the language
  (`?lang=xx` → `localStorage.lang` → `navigator.language` → `it`), fetches
  `i18n/languages.json` to build the `.lang-select` dropdown, fetches `i18n/<lang>.json`,
  injects every string, sets `<title>` and `<html lang>`, then reveals `<main>` (which
  starts with the `hidden` attribute to avoid a flash of Italian). Changing the dropdown
  reloads with `?lang=xx` and stores the choice.
- **`script/config.js`** holds the values shared by all languages: the two WhatsApp
  numbers, the address, the Google Maps URL. The loader exposes them to translation
  strings as the tokens `{wa1}` `{wa2}` `{maps}` `{address}` — so e.g. the WhatsApp
  numbers live in exactly one place.
- **`i18n/<lang>.json`** is one flat file of `key: string` per language. Strings may
  contain inline HTML; use single quotes for attributes (`<a href='{maps}'>`) so the JSON
  needs no escaping. **`i18n/it.json` is the reference** — author Italian first, translate
  from it. Every language file must have the same set of keys.
- **`i18n/languages.json`** is the ordered list of `{code, label}` shown in the dropdown
  and the set of supported languages.
- **Adding a language**: create `i18n/<code>.json` (copy `it.json`, translate the values)
  and add one `{ "code": "<code>", "label": "🏳 Name" }` line to `i18n/languages.json`.
  No HTML changes.
- **`css/style.css`** is the single stylesheet for every page. It is driven by CSS custom
  properties on `:root`; the `@media (max-width: 768px)` and `480px` blocks mainly
  *override the font-size variables* rather than restyling components. Palette variables
  are a sand/sea beach theme.
- Fonts `Jost` and `Cormorant Garamond` are used in CSS but never loaded via `<link>` or
  `@font-face`; pages currently fall back to system serif/sans.
- `img/` holds the check-in photos. Every `<img>` has
  `onerror="this.parentElement.style.display='none'"` so a missing photo hides its block.

## Content conventions

- Check-in uses two codes: `PRIMO CODICE + *` for the pedestrian gate and building door,
  `SECONDO CODICE + #` for the key safe (localized per language inside the `*_html` keys).
  Keep this wording consistent across languages.
- The two WhatsApp contacts and the address live only in `script/config.js`; translation
  strings reference them via `{wa1}` `{wa2}` `{maps}` `{address}`. Don't hard-code them in
  the JSON.
- Parking: spot number 8 only.
