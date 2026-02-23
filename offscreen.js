chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'playAudio' && message.dataUrl) {
    const audio = new Audio(message.dataUrl);
    audio.play();
  }
});
