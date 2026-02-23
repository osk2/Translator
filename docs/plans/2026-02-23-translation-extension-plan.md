# Translation Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modern Chrome extension that translates selected text with definitions, examples, and pronunciation — a replacement for Google Translate extension.

**Architecture:** Content script with shadow DOM tooltip, background service worker for API proxy, popup for settings. Manifest V3, no build step.

**Tech Stack:** Vanilla JS, HTML, CSS, Chrome Extensions Manifest V3, Google Translate free API, Web Speech API

---

### Task 1: Manifest & Extension Skeleton

**Files:**
- Create: `manifest.json`
- Create: `icons/icon16.png`
- Create: `icons/icon32.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

**Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Translation Extension",
  "version": "1.0.0",
  "description": "Modern translation tool — select text to get definitions, examples, and pronunciation",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://translate.googleapis.com/*"],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 2: Create placeholder icons**

Generate simple SVG-based PNG icons at 16, 32, 48, 128px. Use a simple "T" letter icon.

**Step 3: Create empty content.js, content.css, background.js**

Empty files so the extension loads without errors.

**Step 4: Verify extension loads in Chrome**

Load as unpacked extension in `chrome://extensions`. Expected: no errors, icon visible in toolbar.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: extension skeleton with manifest v3"
```

---

### Task 2: Background Service Worker — Translation API

**Files:**
- Create: `background.js`

**Step 1: Implement translation fetch**

```js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    handleTranslate(request.text, request.targetLang)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // keep channel open for async
  }
});

async function handleTranslate(text, targetLang) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', targetLang);
  url.searchParams.set('dt', 't');  // translation
  url.searchParams.append('dt', 'bd'); // definitions
  url.searchParams.append('dt', 'ex'); // examples
  url.searchParams.append('dt', 'rm'); // romanization/phonetics
  url.searchParams.set('q', text);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return parseResponse(data, text);
}

function parseResponse(data, originalText) {
  const result = {
    original: originalText,
    sourceLang: data[2] || 'unknown',
    translation: '',
    phonetic: '',
    definitions: [],
    examples: []
  };

  // Translation (index 0)
  if (data[0]) {
    result.translation = data[0]
      .filter(item => item && item[0])
      .map(item => item[0])
      .join('');
  }

  // Phonetic/romanization (index 0, sub-index 3 for source phonetic)
  if (data[0] && data[0][1] && data[0][1][3]) {
    result.phonetic = data[0][1][3];
  }

  // Definitions (index 12)
  if (data[12]) {
    data[12].forEach(group => {
      if (group && group[0] && group[1]) {
        const partOfSpeech = group[0];
        group[1].forEach(def => {
          if (def && def[0]) {
            result.definitions.push({
              partOfSpeech,
              definition: def[0],
              example: def[1] || null
            });
          }
        });
      }
    });
  }

  // Examples (index 13)
  if (data[13] && data[13][0]) {
    data[13][0].forEach(ex => {
      if (ex && ex[0]) {
        result.examples.push(ex[0].replace(/<\/?b>/g, ''));
      }
    });
  }

  return result;
}
```

**Step 2: Test manually via Chrome DevTools**

Open service worker console from `chrome://extensions`, run:
```js
chrome.runtime.sendMessage({type: 'translate', text: 'bonjour', targetLang: 'en'}, r => console.log(r));
```
Expected: JSON with translation "hello", detected source "fr".

**Step 3: Commit**

```bash
git add background.js && git commit -m "feat: background service worker with translation API"
```

---

### Task 3: Content Script — Selection Detection

**Files:**
- Create: `content.js`

**Step 1: Implement selection listener**

```js
let tooltipHost = null;

document.addEventListener('mouseup', async (e) => {
  // Ignore clicks inside our tooltip
  if (tooltipHost && tooltipHost.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (!text) {
    removeTooltip();
    return;
  }

  const settings = await chrome.storage.sync.get({
    targetLang: navigator.language.split('-')[0] || 'en',
    enabled: true
  });

  if (!settings.enabled) return;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  showLoading(rect);

  chrome.runtime.sendMessage(
    { type: 'translate', text, targetLang: settings.targetLang },
    (response) => {
      if (response && !response.error) {
        showTooltip(response, rect);
      } else {
        removeTooltip();
      }
    }
  );
});

document.addEventListener('mousedown', (e) => {
  if (tooltipHost && !tooltipHost.contains(e.target)) {
    removeTooltip();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removeTooltip();
});
```

**Step 2: Commit**

```bash
git add content.js && git commit -m "feat: content script selection detection"
```

---

### Task 4: Content Script — Shadow DOM Tooltip Rendering

**Files:**
- Modify: `content.js` (add tooltip rendering functions)
- Create: `content.css`

**Step 1: Implement tooltip rendering in content.js**

Add these functions to content.js:

```js
function removeTooltip() {
  if (tooltipHost) {
    tooltipHost.remove();
    tooltipHost = null;
  }
}

function showLoading(rect) {
  removeTooltip();
  tooltipHost = document.createElement('div');
  tooltipHost.id = 'translation-ext-host';
  const shadow = tooltipHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getTooltipStyles();
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'te-tooltip';
  container.innerHTML = '<div class="te-loading"><span class="te-spinner"></span> Translating...</div>';
  shadow.appendChild(container);

  positionTooltip(tooltipHost, rect);
  document.body.appendChild(tooltipHost);
}

function showTooltip(data, rect) {
  removeTooltip();
  tooltipHost = document.createElement('div');
  tooltipHost.id = 'translation-ext-host';
  const shadow = tooltipHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = getTooltipStyles();
  shadow.appendChild(style);

  const container = document.createElement('div');
  container.className = 'te-tooltip';

  // Header: original word + language + speaker + close
  const header = document.createElement('div');
  header.className = 'te-header';

  const wordInfo = document.createElement('div');
  wordInfo.className = 'te-word-info';

  const word = document.createElement('span');
  word.className = 'te-original';
  word.textContent = data.original;

  const langBadge = document.createElement('span');
  langBadge.className = 'te-lang-badge';
  langBadge.textContent = `${data.sourceLang} → ${data.translation ? data.sourceLang !== data.original ? data.sourceLang : '' : ''}`;

  wordInfo.append(word);

  const actions = document.createElement('div');
  actions.className = 'te-actions';

  const speakBtn = document.createElement('button');
  speakBtn.className = 'te-speak-btn';
  speakBtn.innerHTML = '&#128264;';
  speakBtn.title = 'Listen';
  speakBtn.addEventListener('click', () => {
    const utterance = new SpeechSynthesisUtterance(data.original);
    utterance.lang = data.sourceLang;
    speechSynthesis.speak(utterance);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'te-close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', removeTooltip);

  actions.append(speakBtn, closeBtn);
  header.append(wordInfo, actions);
  container.appendChild(header);

  // Phonetic
  if (data.phonetic) {
    const phonetic = document.createElement('div');
    phonetic.className = 'te-phonetic';
    phonetic.textContent = `/${data.phonetic}/`;
    container.appendChild(phonetic);
  }

  // Language badge
  if (data.sourceLang && data.sourceLang !== 'unknown') {
    const badge = document.createElement('div');
    badge.className = 'te-lang-line';
    const targetLang = data.translation ? 'translated' : '';
    badge.textContent = `Detected: ${data.sourceLang.toUpperCase()}`;
    container.appendChild(badge);
  }

  // Translation
  if (data.translation) {
    const section = document.createElement('div');
    section.className = 'te-section';
    const label = document.createElement('div');
    label.className = 'te-label';
    label.textContent = 'Translation';
    const value = document.createElement('div');
    value.className = 'te-value';
    value.textContent = data.translation;
    section.append(label, value);
    container.appendChild(section);
  }

  // Definitions (only for short text — likely single words)
  if (data.definitions.length > 0 && data.original.split(/\s+/).length <= 3) {
    const section = document.createElement('div');
    section.className = 'te-section';
    const label = document.createElement('div');
    label.className = 'te-label';
    label.textContent = 'Definition';
    section.appendChild(label);
    data.definitions.slice(0, 3).forEach(def => {
      const item = document.createElement('div');
      item.className = 'te-def-item';
      const pos = document.createElement('span');
      pos.className = 'te-pos';
      pos.textContent = def.partOfSpeech;
      const text = document.createElement('span');
      text.textContent = def.definition;
      item.append(pos, text);
      section.appendChild(item);
    });
    container.appendChild(section);
  }

  // Examples
  if (data.examples.length > 0 && data.original.split(/\s+/).length <= 3) {
    const section = document.createElement('div');
    section.className = 'te-section';
    const label = document.createElement('div');
    label.className = 'te-label';
    label.textContent = 'Examples';
    section.appendChild(label);
    data.examples.slice(0, 2).forEach(ex => {
      const item = document.createElement('div');
      item.className = 'te-example';
      item.textContent = `"${ex}"`;
      section.appendChild(item);
    });
    container.appendChild(section);
  }

  shadow.appendChild(container);
  positionTooltip(tooltipHost, rect);
  document.body.appendChild(tooltipHost);
}

function positionTooltip(el, rect) {
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.max(8, rect.left + window.scrollX);
  el.style.position = 'absolute';
  el.style.zIndex = '2147483647';
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
```

**Step 2: Implement tooltip styles (getTooltipStyles function)**

Add to content.js:

```js
function getTooltipStyles() {
  return `
    .te-tooltip {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      padding: 16px;
      max-width: 360px;
      min-width: 200px;
      overflow-y: auto;
      max-height: 400px;
    }
    .te-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .te-original {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .te-actions { display: flex; gap: 4px; }
    .te-speak-btn, .te-close-btn {
      background: none;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      padding: 2px 8px;
      color: #555;
      transition: background 0.15s;
    }
    .te-speak-btn:hover, .te-close-btn:hover {
      background: #f0f0f0;
    }
    .te-phonetic {
      color: #666;
      font-size: 13px;
      font-style: italic;
      margin-bottom: 8px;
    }
    .te-lang-line {
      font-size: 11px;
      color: #888;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .te-section {
      border-top: 1px solid #f0f0f0;
      padding-top: 8px;
      margin-top: 8px;
    }
    .te-label {
      font-size: 11px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .te-value { color: #1a1a1a; }
    .te-def-item { margin-bottom: 4px; }
    .te-pos {
      display: inline-block;
      background: #f0f4ff;
      color: #4a6fa5;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      margin-right: 6px;
      font-weight: 500;
    }
    .te-example {
      color: #555;
      font-style: italic;
      margin-bottom: 4px;
      padding-left: 8px;
      border-left: 2px solid #e0e0e0;
    }
    .te-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #888;
    }
    .te-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top-color: #4a6fa5;
      border-radius: 50%;
      animation: te-spin 0.6s linear infinite;
    }
    @keyframes te-spin {
      to { transform: rotate(360deg); }
    }
  `;
}
```

**Step 3: Create empty content.css**

```css
/* content.css - minimal host element reset */
#translation-ext-host {
  all: initial;
}
```

**Step 4: Test end-to-end**

Reload extension. Open any page, select a word (e.g., on a French article). Expected: tooltip appears with translation, definition, examples, phonetics, speaker button works.

**Step 5: Commit**

```bash
git add content.js content.css && git commit -m "feat: shadow DOM tooltip with translation display"
```

---

### Task 5: Popup Settings UI

**Files:**
- Create: `popup.html`
- Create: `popup.js`
- Create: `popup.css`

**Step 1: Create popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup">
    <h1>Translation Extension</h1>

    <div class="setting">
      <label for="targetLang">Translate to</label>
      <select id="targetLang"></select>
    </div>

    <div class="setting">
      <label for="enabled">Enable translation</label>
      <label class="switch">
        <input type="checkbox" id="enabled">
        <span class="slider"></span>
      </label>
    </div>

    <div class="status" id="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**Step 2: Create popup.js**

```js
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hu', name: 'Hungarian' }
];

const langSelect = document.getElementById('targetLang');
const enabledToggle = document.getElementById('enabled');
const status = document.getElementById('status');

// Populate language dropdown
LANGUAGES.forEach(lang => {
  const option = document.createElement('option');
  option.value = lang.code;
  option.textContent = lang.name;
  langSelect.appendChild(option);
});

// Load saved settings
chrome.storage.sync.get(
  { targetLang: navigator.language.split('-')[0] || 'en', enabled: true },
  (settings) => {
    langSelect.value = settings.targetLang;
    enabledToggle.checked = settings.enabled;
  }
);

// Save on change
langSelect.addEventListener('change', () => {
  chrome.storage.sync.set({ targetLang: langSelect.value }, () => {
    showStatus('Saved');
  });
});

enabledToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledToggle.checked }, () => {
    showStatus(enabledToggle.checked ? 'Enabled' : 'Disabled');
  });
});

function showStatus(msg) {
  status.textContent = msg;
  setTimeout(() => { status.textContent = ''; }, 1500);
}
```

**Step 3: Create popup.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 280px;
}

.popup { padding: 20px; }

h1 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
}

.setting {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.setting label:first-child {
  font-size: 13px;
  color: #333;
}

select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

/* Toggle switch */
.switch { position: relative; width: 40px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 22px;
  cursor: pointer;
  transition: background 0.2s;
}
.slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
}
input:checked + .slider { background: #4a6fa5; }
input:checked + .slider::before { transform: translateX(18px); }

.status {
  font-size: 12px;
  color: #4a6fa5;
  text-align: center;
  min-height: 16px;
}
```

**Step 4: Test popup**

Click extension icon. Expected: popup shows language dropdown and toggle. Changing values persists on reopen.

**Step 5: Commit**

```bash
git add popup.html popup.js popup.css && git commit -m "feat: settings popup with language selection and toggle"
```

---

### Task 6: Icons & Polish

**Files:**
- Create: `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png`, `icons/icon128.png`

**Step 1: Generate SVG icon and convert to PNGs**

Create a simple "translate" icon using an inline SVG canvas approach or use a minimal icon.

**Step 2: End-to-end testing**

Full test matrix:
- Select single word on English page → tooltip with definition + examples
- Select sentence → tooltip with translation only
- Select word on foreign language page → auto-detect + translate to target lang
- Click speaker icon → audio plays in source language
- Escape key → tooltip dismissed
- Click outside → tooltip dismissed
- Toggle off in settings → no tooltip on selection
- Change target language → next translation uses new language

**Step 3: Commit**

```bash
git add icons/ && git commit -m "feat: extension icons"
```

---

### Task 7: Final Verification

**Step 1: Verify all features**

- Reload extension from `chrome://extensions`
- Walk through full test matrix from Task 6
- Check for console errors in both service worker and page contexts

**Step 2: Final commit**

```bash
git add -A && git commit -m "chore: final polish and verification"
```
