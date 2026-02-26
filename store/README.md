# Store Assets

This directory contains Chrome Web Store listing materials.

## Required Assets

### Store Icon (128x128px)
Already exists at `icons/icon128.png`.

### Small Promotional Image (440x280px)
**Required** for the store listing. Generate one by:

1. Open any design tool (Figma, Canva, etc.)
2. Create a 440x280px canvas
3. Use the extension icon + name "Translator"
4. Save as `store/promo-small.png`

### Screenshots (1280x800px)
At least 1 screenshot is **required** (up to 5 recommended).

To capture screenshots:

1. Load the extension in Chrome (`chrome://extensions` > Load unpacked)
2. Navigate to a webpage with text content
3. Select some text to trigger the translation tooltip
4. Take a screenshot at exactly **1280x800px**
   - macOS: Resize window to 1280x800, then `Cmd+Shift+3` or use Screenshot.app
   - Or use Chrome DevTools > Device Toolbar > set to 1280x800
5. Save as `store/screenshot-1.png`, `store/screenshot-2.png`, etc.

**Suggested screenshots:**
1. Translation tooltip showing a translated word with definition
2. Translation of a full sentence
3. Settings popup with language selection
4. The trigger icon appearing on text selection

## Checklist Before Submission

- [ ] Small promotional image (440x280px PNG)
- [ ] At least 1 screenshot (1280x800px PNG)
- [ ] Store icon exists at `icons/icon128.png`
- [ ] Privacy policy URL ready (link to raw `PRIVACY_POLICY.md` on GitHub)
- [ ] Listing text reviewed in `LISTING.md`
