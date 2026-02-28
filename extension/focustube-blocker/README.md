# FocusTube Timer Blocker Extension

This Chrome extension blocks selected domains when FocusTube timer-based blocker is active.

## Install (Developer Mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `extension/focustube-blocker`

## How It Works

1. FocusTube app writes blocker settings and timer runtime to browser `localStorage`
2. `content-sync.js` reads those values and syncs them to the extension service worker
3. `background.js` creates dynamic block rules using `declarativeNetRequest`
4. When timer ends or reset happens, rules are removed automatically

## Required App Steps

1. In FocusTube `Blocker` page: enable blocker, select domains, click **Save Settings**
2. Start timer from FocusTube study timer
3. While timer is active, selected sites will be blocked

## Notes

- Extension reads FocusTube state from web pages, so keep FocusTube tab accessible.
- For production domain, extension is already set to `<all_urls>`.
- If state looks stale, open extension popup and click **Refresh**.
