chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'translate') {
    handleTranslate(request.text, request.targetLang)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (request.type === 'tts') {
    handleTTS(request.text, request.lang)
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true;
  }
});

async function handleTTS(text, lang) {
  const url = new URL('https://translate.google.com/translate_tts');
  url.searchParams.set('client', 'tw-ob');
  url.searchParams.set('tl', lang);
  url.searchParams.set('q', text);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function handleTranslate(text, targetLang) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', targetLang);
  url.searchParams.set('dt', 't');
  url.searchParams.append('dt', 'bd');
  url.searchParams.append('dt', 'ex');
  url.searchParams.append('dt', 'rm');
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
