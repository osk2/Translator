# Privacy Policy — Translator

**Last updated:** 2026-02-27

## What This Extension Does

Translator lets you select text on any webpage and see translations, definitions, and pronunciation. It uses Google Translate to perform translations.

## Data We Collect

**None.** This extension does not collect, store, or transmit any personal data to the developer or any third party.

## Data Stored Locally

The extension uses `chrome.storage.sync` to save your preferences:

- **Target language** (e.g., "zh-TW")
- **Enabled/disabled toggle**

This data stays in your Chrome profile and syncs only through your own Google account if Chrome Sync is enabled. The developer has no access to it.

## Data Sent to Third Parties

When you translate text, the selected text is sent to **Google Translate** (`translate.googleapis.com`) to retrieve:

- Translation results
- Definitions and examples (for single words)
- Text-to-speech audio

This is the same public API used by Google Translate. Google's own privacy policy applies to data processed by their service: https://policies.google.com/privacy

**No other third-party services are contacted.**

## Data Selling

We do not sell, trade, or transfer any user data to anyone.

## Chrome Web Store User Data Policy Compliance

The use of information received from Google APIs will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), including the Limited Use requirements.

Specifically:
- Data use is limited to providing and improving the extension's single purpose (translation)
- User data is not transferred to third parties except as necessary to provide translation via Google Translate
- User data is not used for purposes unrelated to the extension's core functionality
- User data is not used for personalized advertising, sold to data brokers, or used for creditworthiness determination

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `storage` | Save your language preference and enabled/disabled state |
| `offscreen` | Play TTS pronunciation audio in the background |
| Host access to `translate.googleapis.com` / `translate.google.com` | Fetch translations and TTS audio |

## Changes to This Policy

If this policy changes, the updated version will be posted in this repository with a new date.

## Contact

If you have questions, open an issue on the [GitHub repository](https://github.com/osk2/translator).
