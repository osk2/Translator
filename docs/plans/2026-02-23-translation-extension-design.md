# Translation Extension — Design Doc

**Date:** 2026-02-23
**Goal:** Build a modern Chrome extension replacement for Google Translate, focused on language learning.

## Features

1. **Select-to-translate:** Show definition/translation of selected word or paragraph in a tooltip
2. **Usage examples & pronunciation:** Phonetic text + TTS audio playback
3. **Auto language detection:** Detect source language automatically, user sets default target language in settings

## Architecture

**Approach:** Content Script Popup with Shadow DOM

- **Content script** — listens for text selection, renders tooltip inside shadow DOM (style isolation)
- **Background service worker** — proxies API calls to Google Translate free endpoint (avoids CORS)
- **Extension popup** — settings UI (target language, enable/disable toggle)
- **Chrome Storage Sync** — persists user preferences across devices

## File Structure

```
translation-extension/
├── manifest.json       # Manifest V3
├── background.js       # Service worker — API proxy
├── content.js          # Selection detection + tooltip rendering
├── content.css         # Tooltip styles (shadow DOM)
├── popup.html          # Settings UI
├── popup.js            # Settings logic
├── popup.css           # Settings styles
└── icons/              # 16, 32, 48, 128px
```

## API

Google Translate free endpoint (no API key):

```
https://translate.googleapis.com/translate_a/single
  ?client=gtx&sl=auto&tl={target}&dt=t&dt=bd&dt=ex&dt=rm&q={text}
```

Background service worker makes the fetch. Parses JSON array response to extract:
- `dt=t` — translation
- `dt=bd` — definitions
- `dt=ex` — usage examples
- `dt=rm` — phonetic/romanization text

## Tooltip UI

- Appears near text selection on mouseup
- Shadow DOM prevents style conflicts with host page
- Shows: source word, detected language, translation, definition (single words), example, phonetics
- Speaker icon triggers Web Speech API `speechSynthesis`
- Dismissed by clicking outside or pressing Escape
- For paragraphs: translation only (skip definition section)
- Max-width ~350px, scrollable if needed

## Settings (Popup)

- Target language dropdown (defaults to browser language)
- Enable/disable toggle
- Persisted via `chrome.storage.sync`

## Tech Stack

- Vanilla JS + HTML + CSS
- Chrome Extension Manifest V3
- No build step required
