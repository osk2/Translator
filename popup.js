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

// i18n: translate all elements with data-i18n attribute
document.querySelectorAll('[data-i18n]').forEach(el => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});

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
  { targetLang: navigator.language || 'en', enabled: true },
  (settings) => {
    langSelect.value = settings.targetLang;
    enabledToggle.checked = settings.enabled;
  }
);

// Save on change
langSelect.addEventListener('change', () => {
  chrome.storage.sync.set({ targetLang: langSelect.value }, () => {
    showStatus(chrome.i18n.getMessage('statusSaved'));
  });
});

enabledToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enabledToggle.checked }, () => {
    showStatus(enabledToggle.checked ? chrome.i18n.getMessage('statusEnabled') : chrome.i18n.getMessage('statusDisabled'));
  });
});

function showStatus(msg) {
  status.textContent = msg;
  setTimeout(() => { status.textContent = ''; }, 1500);
}
