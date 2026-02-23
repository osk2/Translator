let tooltipHost = null;
let triggerHost = null;

document.addEventListener('mouseup', async (e) => {
  if (tooltipHost && tooltipHost.contains(e.target)) return;
  if (triggerHost && triggerHost.contains(e.target)) return;

  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (!text) {
    removeTriggerIcon();
    return;
  }

  let settings;
  try {
    settings = await chrome.storage.sync.get({
      targetLang: navigator.language.split('-')[0] || 'en',
      enabled: true
    });
  } catch {
    return;
  }

  if (!settings.enabled) return;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  showTriggerIcon(text, settings.targetLang, rect);
});

document.addEventListener('mousedown', (e) => {
  if (triggerHost && !triggerHost.contains(e.target)) {
    removeTriggerIcon();
  }
  if (tooltipHost && !tooltipHost.contains(e.target)) {
    removeTooltip();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    removeTriggerIcon();
    removeTooltip();
  }
});

function removeTriggerIcon() {
  if (triggerHost) {
    triggerHost.remove();
    triggerHost = null;
  }
}

function showTriggerIcon(text, targetLang, rect) {
  removeTriggerIcon();
  removeTooltip();

  triggerHost = document.createElement('div');
  triggerHost.id = 'translation-ext-trigger';
  const shadow = triggerHost.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .te-trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      cursor: pointer;
      transition: background 0.15s, box-shadow 0.15s;
      font-size: 16px;
      line-height: 1;
    }
    .te-trigger:hover {
      background: #f0f4ff;
      box-shadow: 0 2px 12px rgba(0,0,0,0.18);
    }
  `;
  shadow.appendChild(style);

  const btn = document.createElement('div');
  btn.className = 'te-trigger';
  btn.innerHTML = '&#127760;';
  btn.title = 'Translate';
  btn.addEventListener('click', () => {
    removeTriggerIcon();
    showLoading(rect);
    chrome.runtime.sendMessage(
      { type: 'translate', text, targetLang },
      (response) => {
        if (response && !response.error) {
          showTooltip(response, rect);
        } else {
          removeTooltip();
        }
      }
    );
  });
  shadow.appendChild(btn);

  const top = rect.bottom + window.scrollY + 4;
  const left = rect.right + window.scrollX + 4;
  triggerHost.style.position = 'absolute';
  triggerHost.style.zIndex = '2147483647';
  triggerHost.style.left = left + 'px';
  triggerHost.style.top = (rect.top + window.scrollY - 4) + 'px';

  document.body.appendChild(triggerHost);
}

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

  // Header: original word + speaker + close
  const header = document.createElement('div');
  header.className = 'te-header';

  const wordInfo = document.createElement('div');
  wordInfo.className = 'te-word-info';

  const word = document.createElement('span');
  word.className = 'te-original';
  word.textContent = data.original;

  wordInfo.append(word);

  const actions = document.createElement('div');
  actions.className = 'te-actions';

  const speakBtn = document.createElement('button');
  speakBtn.className = 'te-speak-btn';
  speakBtn.innerHTML = '&#128264;';
  speakBtn.title = 'Listen';
  speakBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage(
      { type: 'tts', text: data.original, lang: data.sourceLang }
    );
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
    phonetic.textContent = '/' + data.phonetic + '/';
    container.appendChild(phonetic);
  }

  // Language badge
  if (data.sourceLang && data.sourceLang !== 'unknown') {
    const badge = document.createElement('div');
    badge.className = 'te-lang-line';
    badge.textContent = 'Detected: ' + data.sourceLang.toUpperCase();
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

  // Definitions (only for short text)
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
      item.textContent = '"' + ex + '"';
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
  el.style.left = left + 'px';
  el.style.top = top + 'px';
}

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
