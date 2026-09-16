# Userscripts

A collection of custom Tampermonkey userscripts for personal web browsing enhancements and automation.

---

## Available Scripts

### 1. Plex: Enhanced Player
> **File:** [`plex-enhanced-player.user.js`](./plex-enhanced-player.user.js)  
> **Install URL:** [Install via Tampermonkey](https://raw.githubusercontent.com/sidharth1212/scripts/main/plex-enhanced-player.user.js)

All-in-one player enhancements for Plex Web (`app.plex.tv` and local Plex Web servers):

* **Aspect Ratio Crop (`C` key):** Cycle through crop presets (16:9, 21:9, 2.35:1, Fill, Original) to remove letterboxing/pillarboxing.
* **Cinema Black Theater Backdrop:** Ensures pitch-black pillarbox/letterbox bars with no grey/white flashes.
* **5-Second Skip (`ArrowLeft` / `ArrowRight`):** Precise 5-second skips with custom on-screen 5s indicator badges.
* **Playback Speed Controls (`[` and `]`):** Fine-grained speed increments from 0.5x to 2.0x.
* **Player HUD / OSD (`I` key):** Persistent toggleable on-screen display for video status, aspect ratio, and speed.

---

## Installation & Automatic Updates

### Standard Installation
1. Install [Tampermonkey](https://www.tampermonkey.net/) for Google Chrome.
2. Click the direct installation link above (or open the `*.user.js` file from GitHub in your browser).
3. Tampermonkey will recognize the script and prompt you to click **Install**.

### Automatic Updates
Every script in this repository includes `@updateURL` and `@downloadURL` headers pointing to GitHub. Tampermonkey checks for updates automatically according to your Tampermonkey settings (or when you manually click **Check for script updates** in the dashboard).

To release an update:
1. Update the code in the script file.
2. Bump the `@version` number in the metadata header (e.g. `6.0.0` -> `6.1.0`).
3. Commit and push to `main`.

---

## Local Development Workflow (Instant Refresh)

Instead of committing and pushing to GitHub just to test a single code change:

1. Open Chrome and navigate to `chrome://extensions`.
2. Locate **Tampermonkey** and click **Details**.
3. Toggle ON **"Allow access to file URLs"**.
4. (Chrome MV3) Ensure **Developer mode** is enabled in `chrome://extensions` (toggle in the top-right corner).
5. In Tampermonkey, install the dev loader stub (`plex-enhanced-player.dev.user.js`):
   ```javascript
   // ==UserScript==
   // @name         Plex: Enhanced Player [DEV]
   // @match        *://app.plex.tv/*
   // @match        *://*.plex.tv/*
   // @match        *://localhost:32400/web/*
   // @require      file:///Users/sidbansidhar/Documents/Scripts/plex-enhanced-player.user.js
   // ==/UserScript==
   ```
6. Now you can edit `plex-enhanced-player.user.js` in your editor, save, and simply refresh the Plex browser tab. Your changes will take effect immediately.
