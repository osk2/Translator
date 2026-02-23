# Translation Extension

A modern Chrome extension for translating selected text — built as a lightweight alternative to the Google Translate extension.

## Features

- **Select to translate** — Select any text on a page, click the translate icon, and get an instant translation
- **Definitions & examples** — Single words show part-of-speech, definitions, and usage examples
- **Natural pronunciation** — Phonetic text display + audio playback powered by Google Translate TTS
- **Auto language detection** — Source language is detected automatically
- **30+ target languages** — Choose your default target language in settings

## How It Works

1. Select text on any webpage (double-click, drag, etc.)
2. A small 🌐 icon appears near your selection
3. Click the icon to see the translation tooltip
4. Click the 🔊 button to hear pronunciation
5. Press Escape or click outside to dismiss

## Install

1. Clone this repo
   ```bash
   git clone https://github.com/osk2/translator.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the cloned folder

## Settings

Click the extension icon in the toolbar to:

- **Translate to** — Select your default target language
- **Enable/disable** — Toggle the extension on or off

## Tech Stack

- Vanilla JS, HTML, CSS — no build step
- Chrome Extension Manifest V3
- Shadow DOM for style isolation
- Google Translate API (free endpoint)
- Google Translate TTS for pronunciation

## License

MIT
